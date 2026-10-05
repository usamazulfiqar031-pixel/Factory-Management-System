import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne, runQuery, executeTransaction } from '../db.js';

export const paymentsRouter = Router();

// ================= CUSTOMER PAYMENTS =================

// GET all customer payments
paymentsRouter.get('/customer', async (req: Request, res: Response) => {
  const { customerId, startDate, endDate } = req.query;
  try {
    const db = await getDb();
    let sql = `
      SELECT cp.*, c.name as customer_name, s.invoice_number
      FROM customer_payments cp
      JOIN customers c ON cp.customer_id = c.id
      LEFT JOIN sales s ON cp.sale_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (customerId) {
      sql += ' AND cp.customer_id = ?';
      params.push(Number(customerId));
    }
    if (startDate) {
      sql += ' AND cp.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND cp.date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY cp.date DESC, cp.id DESC';
    const rows = queryAll(db, sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching customer payments' });
  }
});

// POST receive customer payment
paymentsRouter.post('/customer', async (req: Request, res: Response) => {
  const { date, customer_id, amount, payment_method, notes } = req.body;

  const customerId = Number(customer_id);
  const payAmount = Number(amount);
  const payMethod = (payment_method || 'cash').toLowerCase();

  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (!customerId) return res.status(400).json({ error: 'Customer is required' });
  if (payAmount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero' });
  if (!['cash', 'bank'].includes(payMethod)) {
    return res.status(400).json({ error: 'Payment method must be cash or bank' });
  }

  try {
    const db = await getDb();
    const customer = queryOne(db, 'SELECT id, name FROM customers WHERE id = ?', [customerId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Check outstanding balance
    const salesTotal = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE customer_id = ? AND status != 'cancelled'`,
      [customerId]
    )?.total || 0;
    const paymentsTotal = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM customer_payments WHERE customer_id = ?`,
      [customerId]
    )?.total || 0;
    const currentOutstanding = salesTotal - paymentsTotal;

    const user = (req as any).user?.username || 'admin';

    const payment = executeTransaction(db, () => {
      const dateStr = date.replace(/-/g, '');
      const countRow = queryOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM customer_payments WHERE date = ?`,
        [date]
      );
      const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
      const paymentNumber = `CPAY-${dateStr}-${seq}`;

      // Insert customer payment
      const res = runQuery(
        db,
        `INSERT INTO customer_payments (
          payment_number, date, customer_id, amount, payment_method, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [paymentNumber, date, customerId, payAmount, payMethod, notes?.trim() || null, user]
      );
      const paymentId = res.lastInsertRowid;

      // Increase cash/bank balance
      runQuery(
        db,
        `INSERT INTO cash_bank_transactions (
          date, account, type, amount, source, reference_id, description, created_at
        ) VALUES (?, ?, 'in', ?, 'customer_payment', ?, ?, datetime('now'))`,
        [date, payMethod, payAmount, paymentId, `Customer Payment from ${customer.name}`]
      );

      return queryOne(
        db,
        `SELECT cp.*, c.name as customer_name
         FROM customer_payments cp
         JOIN customers c ON cp.customer_id = c.id
         WHERE cp.id = ?`,
        [paymentId]
      );
    });

    res.status(201).json({
      payment,
      previous_outstanding: currentOutstanding,
      new_outstanding: currentOutstanding - payAmount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record customer payment' });
  }
});

// ================= SUPPLIER PAYMENTS =================

// GET all supplier payments
paymentsRouter.get('/supplier', async (req: Request, res: Response) => {
  const { supplierId, startDate, endDate } = req.query;
  try {
    const db = await getDb();
    let sql = `
      SELECT sp.*, s.name as supplier_name, p.purchase_number
      FROM supplier_payments sp
      JOIN suppliers s ON sp.supplier_id = s.id
      LEFT JOIN purchases p ON sp.purchase_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (supplierId) {
      sql += ' AND sp.supplier_id = ?';
      params.push(Number(supplierId));
    }
    if (startDate) {
      sql += ' AND sp.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND sp.date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY sp.date DESC, sp.id DESC';
    const rows = queryAll(db, sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching supplier payments' });
  }
});

// POST pay supplier
paymentsRouter.post('/supplier', async (req: Request, res: Response) => {
  const { date, supplier_id, amount, payment_method, notes } = req.body;

  const supplierId = Number(supplier_id);
  const payAmount = Number(amount);
  const payMethod = (payment_method || 'cash').toLowerCase();

  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (!supplierId) return res.status(400).json({ error: 'Supplier is required' });
  if (payAmount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero' });
  if (!['cash', 'bank'].includes(payMethod)) {
    return res.status(400).json({ error: 'Payment method must be cash or bank' });
  }

  try {
    const db = await getDb();
    const supplier = queryOne(db, 'SELECT id, name FROM suppliers WHERE id = ?', [supplierId]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    // Check outstanding balance
    const purchasesTotal = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE supplier_id = ? AND status != 'cancelled'`,
      [supplierId]
    )?.total || 0;
    const paymentsTotal = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM supplier_payments WHERE supplier_id = ?`,
      [supplierId]
    )?.total || 0;
    const currentOutstanding = purchasesTotal - paymentsTotal;

    const user = (req as any).user?.username || 'admin';

    const payment = executeTransaction(db, () => {
      const dateStr = date.replace(/-/g, '');
      const countRow = queryOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM supplier_payments WHERE date = ?`,
        [date]
      );
      const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
      const paymentNumber = `SPAY-${dateStr}-${seq}`;

      // Insert supplier payment
      const res = runQuery(
        db,
        `INSERT INTO supplier_payments (
          payment_number, date, supplier_id, amount, payment_method, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [paymentNumber, date, supplierId, payAmount, payMethod, notes?.trim() || null, user]
      );
      const paymentId = res.lastInsertRowid;

      // Decrease cash/bank balance
      runQuery(
        db,
        `INSERT INTO cash_bank_transactions (
          date, account, type, amount, source, reference_id, description, created_at
        ) VALUES (?, ?, 'out', ?, 'supplier_payment', ?, ?, datetime('now'))`,
        [date, payMethod, payAmount, paymentId, `Payment to Supplier ${supplier.name}`]
      );

      return queryOne(
        db,
        `SELECT sp.*, s.name as supplier_name
         FROM supplier_payments sp
         JOIN suppliers s ON sp.supplier_id = s.id
         WHERE sp.id = ?`,
        [paymentId]
      );
    });

    res.status(201).json({
      payment,
      previous_outstanding: currentOutstanding,
      new_outstanding: currentOutstanding - payAmount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record supplier payment' });
  }
});
