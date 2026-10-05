import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne, runQuery, saveDb } from '../db.js';

export const customersRouter = Router();

// GET all customers with calculated balances
customersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const customers = queryAll<{
      id: number;
      name: string;
      phone: string;
      address: string;
      notes: string;
      created_at: string;
    }>(db, 'SELECT * FROM customers ORDER BY name ASC');

    const mapped = customers.map(cust => {
      // Sum completed sales
      const salesRow = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE customer_id = ? AND status != 'cancelled'`,
        [cust.id]
      );
      // Sum all customer payments
      const paymentsRow = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(amount), 0) as total FROM customer_payments WHERE customer_id = ?`,
        [cust.id]
      );

      const totalSales = salesRow?.total || 0;
      const totalPayments = paymentsRow?.total || 0;
      const outstandingBalance = totalSales - totalPayments;

      return {
        ...cust,
        total_sales: totalSales,
        total_payments: totalPayments,
        outstanding_balance: outstandingBalance
      };
    });

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching customers' });
  }
});

// GET customer transaction history (sales and payments)
customersRouter.get('/:id/history', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const db = await getDb();
    const customer = queryOne(db, 'SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const sales = queryAll(
      db,
      `SELECT s.*, p.name as product_name
       FROM sales s
       JOIN products p ON s.product_id = p.id
       WHERE s.customer_id = ? AND s.status != 'cancelled'
       ORDER BY s.date DESC, s.id DESC`,
      [id]
    );

    const payments = queryAll(
      db,
      `SELECT * FROM customer_payments WHERE customer_id = ? ORDER BY date DESC, id DESC`,
      [id]
    );

    const salesTotal = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const paymentsTotal = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

    res.json({
      customer,
      sales,
      payments,
      summary: {
        total_sales: salesTotal,
        total_payments: paymentsTotal,
        outstanding_balance: salesTotal - paymentsTotal
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create customer
customersRouter.post('/', async (req: Request, res: Response) => {
  const { name, phone, address, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  try {
    const db = await getDb();
    const result = runQuery(
      db,
      `INSERT INTO customers (name, phone, address, notes, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [name.trim(), phone?.trim() || null, address?.trim() || null, notes?.trim() || null]
    );
    saveDb();

    const created = queryOne(db, 'SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create customer' });
  }
});

// PUT update customer
customersRouter.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, phone, address, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  try {
    const db = await getDb();
    const existing = queryOne(db, 'SELECT id FROM customers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    runQuery(
      db,
      `UPDATE customers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?`,
      [name.trim(), phone?.trim() || null, address?.trim() || null, notes?.trim() || null, id]
    );
    saveDb();

    const updated = queryOne(db, 'SELECT * FROM customers WHERE id = ?', [id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update customer' });
  }
});

// DELETE customer
customersRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const db = await getDb();
    const salesCount = queryOne(db, 'SELECT COUNT(*) as count FROM sales WHERE customer_id = ?', [id]);
    const paymentsCount = queryOne(db, 'SELECT COUNT(*) as count FROM customer_payments WHERE customer_id = ?', [id]);

    if ((salesCount?.count || 0) > 0 || (paymentsCount?.count || 0) > 0) {
      return res.status(400).json({ error: 'Cannot delete customer with transaction history.' });
    }

    runQuery(db, 'DELETE FROM customers WHERE id = ?', [id]);
    saveDb();
    res.json({ message: 'Customer deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
