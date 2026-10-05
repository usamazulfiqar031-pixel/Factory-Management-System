import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne, runQuery, saveDb } from '../db.js';

export const suppliersRouter = Router();

// GET all suppliers with calculated financial balances
suppliersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const suppliers = queryAll<{
      id: number;
      name: string;
      phone: string;
      address: string;
      notes: string;
      created_at: string;
    }>(db, 'SELECT * FROM suppliers ORDER BY name ASC');

    const mapped = suppliers.map(sup => {
      // Sum completed purchases
      const purchasesRow = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE supplier_id = ? AND status != 'cancelled'`,
        [sup.id]
      );
      // Sum all supplier payments
      const paymentsRow = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(amount), 0) as total FROM supplier_payments WHERE supplier_id = ?`,
        [sup.id]
      );

      const totalPurchases = purchasesRow?.total || 0;
      const totalPayments = paymentsRow?.total || 0;
      const outstandingBalance = totalPurchases - totalPayments;

      return {
        ...sup,
        total_purchases: totalPurchases,
        total_payments: totalPayments,
        outstanding_balance: outstandingBalance
      };
    });

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching suppliers' });
  }
});

// GET supplier transaction history
suppliersRouter.get('/:id/history', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const db = await getDb();
    const supplier = queryOne(db, 'SELECT * FROM suppliers WHERE id = ?', [id]);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const purchases = queryAll(
      db,
      `SELECT p.*, m.name as material_name, m.unit as material_unit
       FROM purchases p
       JOIN materials m ON p.material_id = m.id
       WHERE p.supplier_id = ? AND p.status != 'cancelled'
       ORDER BY p.date DESC, p.id DESC`,
      [id]
    );

    const payments = queryAll(
      db,
      `SELECT * FROM supplier_payments WHERE supplier_id = ? ORDER BY date DESC, id DESC`,
      [id]
    );

    const purchasesTotal = purchases.reduce((acc, p) => acc + (p.total_amount || 0), 0);
    const paymentsTotal = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

    res.json({
      supplier,
      purchases,
      payments,
      summary: {
        total_purchases: purchasesTotal,
        total_payments: paymentsTotal,
        outstanding_balance: purchasesTotal - paymentsTotal
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create supplier
suppliersRouter.post('/', async (req: Request, res: Response) => {
  const { name, phone, address, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }

  try {
    const db = await getDb();
    const result = runQuery(
      db,
      `INSERT INTO suppliers (name, phone, address, notes, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [name.trim(), phone?.trim() || null, address?.trim() || null, notes?.trim() || null]
    );
    saveDb();

    const created = queryOne(db, 'SELECT * FROM suppliers WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create supplier' });
  }
});

// PUT update supplier
suppliersRouter.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, phone, address, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }

  try {
    const db = await getDb();
    const existing = queryOne(db, 'SELECT id FROM suppliers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    runQuery(
      db,
      `UPDATE suppliers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?`,
      [name.trim(), phone?.trim() || null, address?.trim() || null, notes?.trim() || null, id]
    );
    saveDb();

    const updated = queryOne(db, 'SELECT * FROM suppliers WHERE id = ?', [id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update supplier' });
  }
});

// DELETE supplier (safely checks for history)
suppliersRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const db = await getDb();
    const purchasesCount = queryOne(db, 'SELECT COUNT(*) as count FROM purchases WHERE supplier_id = ?', [id]);
    const paymentsCount = queryOne(db, 'SELECT COUNT(*) as count FROM supplier_payments WHERE supplier_id = ?', [id]);

    if ((purchasesCount?.count || 0) > 0 || (paymentsCount?.count || 0) > 0) {
      return res.status(400).json({ error: 'Cannot delete supplier with transaction history.' });
    }

    runQuery(db, 'DELETE FROM suppliers WHERE id = ?', [id]);
    saveDb();
    res.json({ message: 'Supplier deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
