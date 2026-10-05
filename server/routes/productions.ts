import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne, runQuery, executeTransaction } from '../db.js';

export const productionsRouter = Router();

// GET all production batches
productionsRouter.get('/', async (req: Request, res: Response) => {
  const { productId, startDate, endDate } = req.query;
  try {
    const db = await getDb();
    let sql = `
      SELECT pr.*, p.name as product_name
      FROM productions pr
      JOIN products p ON pr.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (productId) {
      sql += ' AND pr.product_id = ?';
      params.push(Number(productId));
    }
    if (startDate) {
      sql += ' AND pr.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND pr.date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY pr.date DESC, pr.id DESC';
    const productions = queryAll(db, sql, params);

    // Fetch items used for these productions
    const allItems = queryAll(
      db,
      `SELECT pi.*, m.name as material_name, m.unit as material_unit
       FROM production_items pi
       JOIN materials m ON pi.material_id = m.id`
    );

    const mapped = productions.map(pr => ({
      ...pr,
      items: allItems.filter(item => item.production_id === pr.id)
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching production batches' });
  }
});

// GET BOM calculation preview for planned quantity
productionsRouter.get('/preview-bom/:productId', async (req: Request, res: Response) => {
  const productId = Number(req.params.productId);
  const qty = Number(req.query.quantity) || 1;

  if (!productId) return res.status(400).json({ error: 'Product ID is required' });
  if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than zero' });

  try {
    const db = await getDb();
    const product = queryOne(db, 'SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const bom = queryAll<{
      material_id: number;
      quantity_required: number;
      material_name: string;
      material_unit: string;
      purchase_price: number;
      current_stock: number;
    }>(
      db,
      `SELECT pm.material_id, pm.quantity_required,
              m.name as material_name, m.unit as material_unit,
              m.purchase_price, m.quantity as current_stock
       FROM product_materials pm
       JOIN materials m ON pm.material_id = m.id
       WHERE pm.product_id = ?`,
      [productId]
    );

    const materialsPreview = bom.map(item => {
      const expectedQty = Number((item.quantity_required * qty).toFixed(3));
      const hasEnough = item.current_stock >= expectedQty;
      const estimatedCost = Number((expectedQty * item.purchase_price).toFixed(2));
      return {
        material_id: item.material_id,
        material_name: item.material_name,
        material_unit: item.material_unit,
        unit_required: item.quantity_required,
        expected_quantity: expectedQty,
        actual_quantity: expectedQty, // Default actual = expected
        current_stock: item.current_stock,
        purchase_price: item.purchase_price,
        estimated_cost: estimatedCost,
        has_enough: hasEnough,
        shortage: hasEnough ? 0 : Number((expectedQty - item.current_stock).toFixed(3))
      };
    });

    const totalEstimatedCost = materialsPreview.reduce((sum, item) => sum + item.estimated_cost, 0);
    const estimatedUnitCost = qty > 0 ? Number((totalEstimatedCost / qty).toFixed(2)) : 0;

    res.json({
      product,
      quantity_produced: qty,
      materials: materialsPreview,
      total_estimated_cost: totalEstimatedCost,
      estimated_unit_cost: estimatedUnitCost,
      can_produce: materialsPreview.every(item => item.has_enough)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create production run
productionsRouter.post('/', async (req: Request, res: Response) => {
  const { date, product_id, quantity_produced, materials_used, notes } = req.body;

  const productId = Number(product_id);
  const qtyProduced = Number(quantity_produced);

  if (!date) return res.status(400).json({ error: 'Production date is required' });
  if (!productId) return res.status(400).json({ error: 'Product is required' });
  if (qtyProduced <= 0) return res.status(400).json({ error: 'Quantity produced must be greater than zero' });

  if (!Array.isArray(materials_used) || materials_used.length === 0) {
    return res.status(400).json({ error: 'Materials used list is required' });
  }

  try {
    const db = await getDb();
    const product = queryOne(db, 'SELECT id, name FROM products WHERE id = ?', [productId]);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const settings = queryOne(db, 'SELECT allow_negative_stock FROM settings WHERE id = 1');
    const allowNegative = settings?.allow_negative_stock === 1;

    // Validate raw material availability before doing anything
    for (const item of materials_used) {
      const matId = Number(item.material_id);
      const actualQty = Number(item.actual_quantity);

      if (!matId || actualQty < 0) {
        return res.status(400).json({ error: 'Invalid material or negative quantity used' });
      }

      const mat = queryOne(db, 'SELECT id, name, unit, quantity FROM materials WHERE id = ?', [matId]);
      if (!mat) return res.status(404).json({ error: `Material with ID ${matId} not found` });

      if (!allowNegative && mat.quantity < actualQty) {
        return res.status(400).json({
          error: `Insufficient stock for raw material '${mat.name}'. Available: ${mat.quantity} ${mat.unit}, Required: ${actualQty} ${mat.unit}`
        });
      }
    }

    const user = (req as any).user?.username || 'admin';

    const production = executeTransaction(db, () => {
      // 1. Calculate total material cost
      let totalMaterialCost = 0;
      const itemsToInsert: Array<{
        material_id: number;
        expected_quantity: number;
        actual_quantity: number;
        unit_cost: number;
        total_cost: number;
      }> = [];

      for (const item of materials_used) {
        const matId = Number(item.material_id);
        const actualQty = Number(item.actual_quantity);
        const expectedQty = Number(item.expected_quantity) || actualQty;

        const mat = queryOne<{ purchase_price: number }>(db, 'SELECT purchase_price FROM materials WHERE id = ?', [matId]);
        const unitCost = mat?.purchase_price || 0;
        const totalCost = Number((actualQty * unitCost).toFixed(2));
        totalMaterialCost += totalCost;

        itemsToInsert.push({
          material_id: matId,
          expected_quantity: expectedQty,
          actual_quantity: actualQty,
          unit_cost: unitCost,
          total_cost: totalCost
        });
      }

      const unitProductionCost = Number((totalMaterialCost / qtyProduced).toFixed(2));

      // 2. Generate production number
      const dateStr = date.replace(/-/g, '');
      const countRow = queryOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM productions WHERE date = ?`,
        [date]
      );
      const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
      const productionNumber = `PROD-${dateStr}-${seq}`;

      // 3. Insert productions record
      const prodRes = runQuery(
        db,
        `INSERT INTO productions (
          production_number, date, product_id, quantity_produced, total_material_cost,
          unit_cost, notes, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, datetime('now'))`,
        [productionNumber, date, productId, qtyProduced, totalMaterialCost, unitProductionCost, notes || null, user]
      );
      const productionId = prodRes.lastInsertRowid;

      // 4. Insert items and deduct raw material stock
      for (const item of itemsToInsert) {
        runQuery(
          db,
          `INSERT INTO production_items (
            production_id, material_id, expected_quantity, actual_quantity, unit_cost, total_cost
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [productionId, item.material_id, item.expected_quantity, item.actual_quantity, item.unit_cost, item.total_cost]
        );

        runQuery(
          db,
          `UPDATE materials
           SET quantity = quantity - ?, updated_at = datetime('now')
           WHERE id = ?`,
          [item.actual_quantity, item.material_id]
        );
      }

      // 5. Increase finished product inventory and update standard production cost
      runQuery(
        db,
        `UPDATE products
         SET quantity = quantity + ?, production_cost = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [qtyProduced, unitProductionCost, productId]
      );

      return queryOne(db, 'SELECT * FROM productions WHERE id = ?', [productionId]);
    });

    res.status(201).json(production);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record production' });
  }
});
