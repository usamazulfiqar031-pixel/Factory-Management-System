import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne, runQuery, saveDb } from '../db.js';

export const materialsRouter = Router();

// GET all raw materials
materialsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const materials = queryAll<{
      id: number;
      name: string;
      unit: string;
      quantity: number;
      purchase_price: number;
      min_stock_level: number;
      is_active: number;
      created_at: string;
      updated_at: string;
    }>(db, 'SELECT * FROM materials ORDER BY name ASC');

    const mapped = materials.map(m => ({
      ...m,
      is_low_stock: m.quantity <= m.min_stock_level && m.is_active === 1,
      stock_value: m.quantity * m.purchase_price
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching materials' });
  }
});

// GET single raw material with history
materialsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const material = queryOne(db, 'SELECT * FROM materials WHERE id = ?', [req.params.id]);
    if (!material) {
      return res.status(404).json({ error: 'Raw material not found' });
    }

    // Purchases for this material
    const purchases = queryAll(
      db,
      `SELECT p.id, p.purchase_number, p.date, p.quantity, p.unit_price, p.total_amount, s.name as supplier_name
       FROM purchases p
       JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.material_id = ? AND p.status != 'cancelled'
       ORDER BY p.date DESC LIMIT 20`,
      [req.params.id]
    );

    // Production usage for this material
    const usages = queryAll(
      db,
      `SELECT pi.id, pr.production_number, pr.date, p.name as product_name, pi.actual_quantity, pi.unit_cost, pi.total_cost
       FROM production_items pi
       JOIN productions pr ON pi.production_id = pr.id
       JOIN products p ON pr.product_id = p.id
       WHERE pi.material_id = ? AND pr.status != 'cancelled'
       ORDER BY pr.date DESC LIMIT 20`,
      [req.params.id]
    );

    res.json({
      ...material,
      purchases,
      usages
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create raw material
materialsRouter.post('/', async (req: Request, res: Response) => {
  const { name, unit, purchase_price, min_stock_level, initial_quantity } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Material name is required' });
  }
  if (!unit || !unit.trim()) {
    return res.status(400).json({ error: 'Unit (e.g. kg, liter, piece) is required' });
  }

  const price = Number(purchase_price) || 0;
  const minStock = Number(min_stock_level) || 0;
  const initialQty = Number(initial_quantity) || 0;

  if (price < 0 || minStock < 0 || initialQty < 0) {
    return res.status(400).json({ error: 'Numeric values cannot be negative' });
  }

  try {
    const db = await getDb();
    const result = runQuery(
      db,
      `INSERT INTO materials (name, unit, quantity, purchase_price, min_stock_level, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [name.trim(), unit.trim().toLowerCase(), initialQty, price, minStock]
    );
    saveDb();

    const created = queryOne(db, 'SELECT * FROM materials WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create material' });
  }
});

// PUT update raw material
materialsRouter.put('/:id', async (req: Request, res: Response) => {
  const { name, unit, purchase_price, min_stock_level, is_active } = req.body;
  const id = Number(req.params.id);

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Material name is required' });
  }

  const price = Number(purchase_price) || 0;
  const minStock = Number(min_stock_level) || 0;
  const activeStatus = is_active !== undefined ? (is_active ? 1 : 0) : 1;

  if (price < 0 || minStock < 0) {
    return res.status(400).json({ error: 'Values cannot be negative' });
  }

  try {
    const db = await getDb();
    const existing = queryOne(db, 'SELECT id FROM materials WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Material not found' });
    }

    runQuery(
      db,
      `UPDATE materials
       SET name = ?, unit = ?, purchase_price = ?, min_stock_level = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [name.trim(), unit.trim().toLowerCase(), price, minStock, activeStatus, id]
    );
    saveDb();

    const updated = queryOne(db, 'SELECT * FROM materials WHERE id = ?', [id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update material' });
  }
});

// DELETE raw material (with integrity checks)
materialsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const db = await getDb();
    const inPurchases = queryOne(db, 'SELECT COUNT(*) as count FROM purchases WHERE material_id = ?', [id]);
    const inBOM = queryOne(db, 'SELECT COUNT(*) as count FROM product_materials WHERE material_id = ?', [id]);
    const inProduction = queryOne(db, 'SELECT COUNT(*) as count FROM production_items WHERE material_id = ?', [id]);

    if ((inPurchases?.count || 0) > 0 || (inProduction?.count || 0) > 0) {
      // Instead of hard deleting, deactivate
      runQuery(db, 'UPDATE materials SET is_active = 0 WHERE id = ?', [id]);
      saveDb();
      return res.json({ message: 'Material has transaction history; it has been set to inactive.' });
    }

    if ((inBOM?.count || 0) > 0) {
      return res.status(400).json({ error: 'Cannot delete: Material is used in one or more Product Bills of Materials.' });
    }

    runQuery(db, 'DELETE FROM materials WHERE id = ?', [id]);
    saveDb();
    res.json({ message: 'Material deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
