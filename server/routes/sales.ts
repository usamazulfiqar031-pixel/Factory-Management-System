import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne, runQuery, executeTransaction } from '../db.js';

export const salesRouter = Router();

// GET all sales
salesRouter.get('/', async (req: Request, res: Response) => {
  const { customerId, startDate, endDate } = req.query;
  try {
    const db = await getDb();
    let sql = `
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, p.name as product_name
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN products p ON s.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (customerId) {
      sql += ' AND s.customer_id = ?';
      params.push(Number(customerId));
    }
    if (startDate) {
      sql += ' AND s.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND s.date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY s.date DESC, s.id DESC';
    const rows = queryAll(db, sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching sales' });
  }
});

// GET single sale invoice details
salesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const sale = queryOne(
      db,
      `SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
              p.name as product_name
       FROM sales s
       JOIN customers c ON s.customer_id = c.id
       JOIN products p ON s.product_id = p.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (!sale) return res.status(404).json({ error: 'Invoice not found' });

    const settings = queryOne(db, 'SELECT * FROM settings WHERE id = 1');
    const payments = queryAll(
      db,
      'SELECT * FROM customer_payments WHERE sale_id = ? ORDER BY date ASC, id ASC',
      [req.params.id]
    );

    res.json({
      sale,
      settings,
      payments
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create sale
salesRouter.post('/', async (req: Request, res: Response) => {
  const { date, customer_id, product_id, quantity, selling_price, paid_amount, payment_method, notes } = req.body;

  const customerId = Number(customer_id);
  const productId = Number(product_id);
  const qty = Number(quantity);
  const price = Number(selling_price);
  const paid = Number(paid_amount) || 0;
  const payMethod = (payment_method || 'cash').toLowerCase();

  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (!customerId) return res.status(400).json({ error: 'Customer is required' });
  if (!productId) return res.status(400).json({ error: 'Product is required' });
  if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than zero' });
  if (price < 0) return res.status(400).json({ error: 'Selling price cannot be negative' });
  if (paid < 0) return res.status(400).json({ error: 'Paid amount cannot be negative' });
  if (!['cash', 'bank', 'credit'].includes(payMethod)) {
    return res.status(400).json({ error: 'Payment method must be cash, bank, or credit' });
  }

  const total = Number((qty * price).toFixed(2));
  if (paid > total) {
    return res.status(400).json({ error: 'Paid amount cannot exceed total invoice amount' });
  }
  const remaining = Number((total - paid).toFixed(2));

  try {
    const db = await getDb();

    // Verify customer and product
    const customer = queryOne(db, 'SELECT id, name FROM customers WHERE id = ?', [customerId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const product = queryOne(db, 'SELECT id, name, quantity, production_cost FROM products WHERE id = ?', [productId]);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Stock check
    const settings = queryOne(db, 'SELECT allow_negative_stock FROM settings WHERE id = 1');
    const allowNegative = settings?.allow_negative_stock === 1;

    if (!allowNegative && product.quantity < qty) {
      return res.status(400).json({
        error: `Unable to save the sale because this product does not have enough stock. Available: ${product.quantity}, requested: ${qty}.`
      });
    }

    const cogs = Number((qty * (product.production_cost || 0)).toFixed(2));
    const user = (req as any).user?.username || 'admin';

    const sale = executeTransaction(db, () => {
      // 1. Generate invoice number
      const dateStr = date.replace(/-/g, '');
      const countRow = queryOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM sales WHERE date = ?`,
        [date]
      );
      const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
      const invoiceNumber = `INV-${dateStr}-${seq}`;

      // 2. Insert sale record
      const saleRes = runQuery(
        db,
        `INSERT INTO sales (
          invoice_number, date, customer_id, product_id, quantity, selling_price,
          total_amount, paid_amount, remaining_amount, payment_method,
          cost_of_goods_sold, notes, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, datetime('now'))`,
        [
          invoiceNumber, date, customerId, productId, qty, price,
          total, paid, remaining, payMethod, cogs, notes || null, user
        ]
      );
      const saleId = saleRes.lastInsertRowid;

      // 3. Deduct finished product inventory
      runQuery(
        db,
        `UPDATE products
         SET quantity = quantity - ?, updated_at = datetime('now')
         WHERE id = ?`,
        [qty, productId]
      );

      // 4. Record customer payment if money was paid
      if (paid > 0 && ['cash', 'bank'].includes(payMethod)) {
        const paySeq = String(saleId).padStart(4, '0');
        const paymentNumber = `CPAY-INIT-${dateStr}-${paySeq}`;

        runQuery(
          db,
          `INSERT INTO customer_payments (
            payment_number, date, customer_id, sale_id, amount, payment_method, notes, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [paymentNumber, date, customerId, saleId, paid, payMethod, `Initial payment for ${invoiceNumber}`, user]
        );

        // 5. Update cash/bank transactions
        runQuery(
          db,
          `INSERT INTO cash_bank_transactions (
            date, account, type, amount, source, reference_id, description, created_at
          ) VALUES (?, ?, 'in', ?, 'sale', ?, ?, datetime('now'))`,
          [date, payMethod, paid, saleId, `Sale Invoice ${invoiceNumber}: ${customer.name}`]
        );
      }

      return queryOne(
        db,
        `SELECT s.*, c.name as customer_name, p.name as product_name
         FROM sales s
         JOIN customers c ON s.customer_id = c.id
         JOIN products p ON s.product_id = p.id
         WHERE s.id = ?`,
        [saleId]
      );
    });

    res.status(201).json(sale);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process sale' });
  }
});

// POST cancel a sale
salesRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  const saleId = Number(req.params.id);
  try {
    const db = await getDb();
    const sale = queryOne(db, 'SELECT * FROM sales WHERE id = ?', [saleId]);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.status === 'cancelled') {
      return res.status(400).json({ error: 'Sale is already cancelled' });
    }

    executeTransaction(db, () => {
      // 1. Mark as cancelled
      runQuery(db, `UPDATE sales SET status = 'cancelled' WHERE id = ?`, [saleId]);

      // 2. Restore finished product stock
      runQuery(db, `UPDATE products SET quantity = quantity + ? WHERE id = ?`, [sale.quantity, sale.product_id]);

      // 3. Reverse payments associated with this sale
      const payment = queryOne(db, 'SELECT * FROM customer_payments WHERE sale_id = ?', [saleId]);
      if (payment) {
        runQuery(db, 'DELETE FROM customer_payments WHERE id = ?', [payment.id]);
        runQuery(
          db,
          `DELETE FROM cash_bank_transactions WHERE source = 'sale' AND reference_id = ?`,
          [saleId]
        );
      }
    });

    res.json({ success: true, message: 'Sale invoice cancelled and inventory/balances reversed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to cancel sale' });
  }
});
