import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne, runQuery, executeTransaction, saveDb } from '../db.js';

export const productsRouter = Router();

// GET all products with BOM
productsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    const products = queryAll<{
      id: number;
      name: string;
      quantity: number;
      selling_price: number;
      production_cost: number;
      is_active: number;
      created_at: string;
      updated_at: string;
    }>(
      db,
      'SELECT * FROM products ORDER BY name ASC'
    );

    // Get all BOM items
    const bomItems = queryAll<{
      id: number;
      product_id: number;
      material_id: number;
      quantity_required: number;
      material_name: string;
      material_unit: string;
      material_price: number;
    }>(
      db,
      `SELECT pm.id,
              pm.product_id,
              pm.material_id,
              pm.quantity_required,
              m.name as material_name,
              m.unit as material_unit,
              m.purchase_price as material_price
       FROM product_materials pm
       JOIN materials m ON pm.material_id = m.id`
    );

    const mapped = products.map(prod => {
      const bom = bomItems.filter(b => b.product_id === prod.id);

      const calculatedBomCost = bom.reduce(
        (sum, item) =>
          sum + (item.quantity_required * item.material_price),
        0
      );

      return {
        ...prod,
        bom,
        calculated_bom_cost: calculatedBomCost,
        stock_value:
          prod.quantity *
          (prod.production_cost || calculatedBomCost)
      };
    });

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Error fetching products'
    });
  }
});

// GET single product details
productsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    const product = queryOne(
      db,
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    const bom = queryAll(
      db,
      `SELECT pm.id,
              pm.material_id,
              pm.quantity_required,
              m.name as material_name,
              m.unit as material_unit,
              m.purchase_price as material_price,
              m.quantity as material_available
       FROM product_materials pm
       JOIN materials m ON pm.material_id = m.id
       WHERE pm.product_id = ?`,
      [req.params.id]
    );

    res.json({
      ...product,
      bom
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
});

// POST create product with BOM
productsRouter.post('/', async (req: Request, res: Response) => {
  const {
    name,
    selling_price,
    production_cost,
    bom,
    initial_quantity
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: 'Product name is required'
    });
  }

  const sellPrice = Number(selling_price) || 0;
  let prodCost = Number(production_cost) || 0;
  const initialQty = Number(initial_quantity) || 0;

  if (sellPrice < 0 || prodCost < 0 || initialQty < 0) {
    return res.status(400).json({
      error: 'Prices and quantities cannot be negative'
    });
  }

  try {
    const db = await getDb();

    // If BOM provided, calculate default production cost
    // if not entered manually.
    const bomList: Array<{
      material_id: number;
      quantity_required: number;
    }> = Array.isArray(bom) ? bom : [];

    if (prodCost === 0 && bomList.length > 0) {
      for (const item of bomList) {
        const mat = queryOne(
          db,
          'SELECT purchase_price FROM materials WHERE id = ?',
          [item.material_id]
        );

        if (mat) {
          prodCost +=
            (Number(item.quantity_required) || 0) *
            (mat.purchase_price || 0);
        }
      }
    }

    const result = executeTransaction(db, () => {
      const res = runQuery(
        db,
        `INSERT INTO products
          (name, quantity, selling_price, production_cost, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
        [
          name.trim(),
          initialQty,
          sellPrice,
          prodCost
        ]
      );

      const productId = res.lastInsertRowid;

      // Insert BOM
      for (const item of bomList) {
        if (
          item.material_id &&
          Number(item.quantity_required) > 0
        ) {
          runQuery(
            db,
            `INSERT INTO product_materials
              (product_id, material_id, quantity_required)
             VALUES (?, ?, ?)`,
            [
              productId,
              item.material_id,
              Number(item.quantity_required)
            ]
          );
        }
      }

      return productId;
    });

    const created = queryOne(
      db,
      'SELECT * FROM products WHERE id = ?',
      [result]
    );

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to create product'
    });
  }
});

// PUT update product and BOM
productsRouter.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const {
    name,
    selling_price,
    production_cost,
    is_active,
    bom
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: 'Product name is required'
    });
  }

  const sellPrice = Number(selling_price) || 0;
  let prodCost = Number(production_cost) || 0;

  const activeStatus =
    is_active !== undefined
      ? (is_active ? 1 : 0)
      : 1;

  if (sellPrice < 0 || prodCost < 0) {
    return res.status(400).json({
      error: 'Prices cannot be negative'
    });
  }

  try {
    const db = await getDb();

    const existing = queryOne(
      db,
      'SELECT id FROM products WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    const bomList: Array<{
      material_id: number;
      quantity_required: number;
    }> = Array.isArray(bom) ? bom : [];

    // If cost is 0, auto-calculate from BOM
    if (prodCost === 0 && bomList.length > 0) {
      for (const item of bomList) {
        const mat = queryOne(
          db,
          'SELECT purchase_price FROM materials WHERE id = ?',
          [item.material_id]
        );

        if (mat) {
          prodCost +=
            (Number(item.quantity_required) || 0) *
            (mat.purchase_price || 0);
        }
      }
    }

    executeTransaction(db, () => {
      runQuery(
        db,
        `UPDATE products
         SET name = ?,
             selling_price = ?,
             production_cost = ?,
             is_active = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
        [
          name.trim(),
          sellPrice,
          prodCost,
          activeStatus,
          id
        ]
      );

      // Re-create BOM entries
      if (Array.isArray(bom)) {
        runQuery(
          db,
          'DELETE FROM product_materials WHERE product_id = ?',
          [id]
        );

        for (const item of bomList) {
          if (
            item.material_id &&
            Number(item.quantity_required) > 0
          ) {
            runQuery(
              db,
              `INSERT INTO product_materials
                (product_id, material_id, quantity_required)
               VALUES (?, ?, ?)`,
              [
                id,
                item.material_id,
                Number(item.quantity_required)
              ]
            );
          }
        }
      }
    });

    const updated = queryOne(
      db,
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to update product'
    });
  }
});

// PATCH only product Active / Inactive status
productsRouter.patch('/:id/status', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { is_active } = req.body;

  if (is_active === undefined) {
    return res.status(400).json({
      error: 'is_active is required'
    });
  }

  try {
    const db = await getDb();

    const existing = queryOne(
      db,
      'SELECT id FROM products WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    const activeStatus = is_active ? 1 : 0;

    runQuery(
      db,
      `UPDATE products
       SET is_active = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        activeStatus,
        id
      ]
    );

    saveDb();

    const updated = queryOne(
      db,
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({
      error:
        err.message ||
        'Failed to update product status'
    });
  }
});

// DELETE product
// If sales or production history exists,
// deactivate instead of permanently deleting.
productsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const db = await getDb();

    const hasSales = queryOne(
      db,
      'SELECT COUNT(*) as count FROM sales WHERE product_id = ?',
      [id]
    );

    const hasProduction = queryOne(
      db,
      'SELECT COUNT(*) as count FROM productions WHERE product_id = ?',
      [id]
    );

    if (
      (hasSales?.count || 0) > 0 ||
      (hasProduction?.count || 0) > 0
    ) {
      runQuery(
        db,
        'UPDATE products SET is_active = 0 WHERE id = ?',
        [id]
      );

      saveDb();

      return res.json({
        message:
          'Product has history; it has been deactivated.'
      });
    }

    executeTransaction(db, () => {
      runQuery(
        db,
        'DELETE FROM product_materials WHERE product_id = ?',
        [id]
      );

      runQuery(
        db,
        'DELETE FROM products WHERE id = ?',
        [id]
      );
    });

    res.json({
      message: 'Product deleted successfully'
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
});