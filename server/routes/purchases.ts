import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne, runQuery, executeTransaction } from '../db.js';

export const purchasesRouter = Router();

// GET all purchases
purchasesRouter.get('/', async (req: Request, res: Response) => {
  const { supplierId, startDate, endDate } = req.query;
  try {
    const db = await getDb();
    let sql = `
      SELECT p.*, s.name as supplier_name, m.name as material_name, m.unit as material_unit
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN materials m ON p.material_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (supplierId) {
      sql += ' AND p.supplier_id = ?';
      params.push(Number(supplierId));
    }
    if (startDate) {
      sql += ' AND p.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND p.date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY p.date DESC, p.id DESC';
    const rows = queryAll(db, sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching purchases' });
  }
});

// POST create a purchase
purchasesRouter.post('/', async (req: Request, res: Response) => {
  const { date, supplier_id, material_id, quantity, unit_price, paid_amount, payment_method, notes } = req.body;

  const supplierId = Number(supplier_id);
  const materialId = Number(material_id);
  const qty = Number(quantity);
  const price = Number(unit_price);
  const paid = Number(paid_amount) || 0;
  const payMethod = (payment_method || 'cash').toLowerCase();

  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (!supplierId) return res.status(400).json({ error: 'Supplier is required' });
  if (!materialId) return res.status(400).json({ error: 'Material is required' });
  if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than zero' });
  if (price < 0) return res.status(400).json({ error: 'Unit price cannot be negative' });
  if (paid < 0) return res.status(400).json({ error: 'Paid amount cannot be negative' });
  if (!['cash', 'bank', 'credit'].includes(payMethod)) {
    return res.status(400).json({ error: 'Payment method must be cash, bank, or credit' });
  }

  const total = Number((qty * price).toFixed(2));
  if (paid > total) {
    return res.status(400).json({ error: 'Paid amount cannot exceed total amount' });
  }
  const remaining = Number((total - paid).toFixed(2));

  try {
    const db = await getDb();

    // Verify supplier and material exist
    const supplier = queryOne(db, 'SELECT id, name FROM suppliers WHERE id = ?', [supplierId]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const material = queryOne(db, 'SELECT id, name, unit, quantity FROM materials WHERE id = ?', [materialId]);
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const user = (req as any).user?.username || 'admin';

    const purchase = executeTransaction(db, () => {
      // Generate purchase number
      const dateStr = date.replace(/-/g, '');
      const countRow = queryOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM purchases WHERE date = ?`,
        [date]
      );
      const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
      const purchaseNumber = `PUR-${dateStr}-${seq}`;

      // 1. Insert purchase record
      const purRes = runQuery(
        db,
        `INSERT INTO purchases (
          purchase_number, date, supplier_id, material_id, quantity, unit_price,
          total_amount, paid_amount, remaining_amount, payment_method, notes,
          status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, datetime('now'))`,
        [
          purchaseNumber, date, supplierId, materialId, qty, price,
          total, paid, remaining, payMethod, notes || null, user
        ]
      );
      const purchaseId = purRes.lastInsertRowid;

      // 2. Increase raw material inventory & update latest purchase price
      runQuery(
        db,
        `UPDATE materials
         SET quantity = quantity + ?, purchase_price = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [qty, price, materialId]
      );

      // 3. If paid_amount > 0, record supplier payment & cash/bank transaction
      if (paid > 0 && ['cash', 'bank'].includes(payMethod)) {
        const paySeq = String(purchaseId).padStart(4, '0');
        const paymentNumber = `SPAY-INIT-${dateStr}-${paySeq}`;

        runQuery(
          db,
          `INSERT INTO supplier_payments (
            payment_number, date, supplier_id, purchase_id, amount, payment_method, notes, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [paymentNumber, date, supplierId, purchaseId, paid, payMethod, `Initial payment for ${purchaseNumber}`, user]
        );

        // Record cash/bank outflow
        runQuery(
          db,
          `INSERT INTO cash_bank_transactions (
            date, account, type, amount, source, reference_id, description, created_at
          ) VALUES (?, ?, 'out', ?, 'purchase', ?, ?, datetime('now'))`,
          [date, payMethod, paid, purchaseId, `Purchase ${purchaseNumber}: ${supplier.name}`]
        );
      }

      return queryOne(
        db,
        `SELECT p.*, s.name as supplier_name, m.name as material_name, m.unit as material_unit
         FROM purchases p
         JOIN suppliers s ON p.supplier_id = s.id
         JOIN materials m ON p.material_id = m.id
         WHERE p.id = ?`,
        [purchaseId]
      );
    });

    res.status(201).json(purchase);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process purchase' });
  }
});

// POST cancel a purchase
purchasesRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  const purchaseId = Number(req.params.id);
  try {
    const db = await getDb();
    const purchase = queryOne(db, 'SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    if (purchase.status === 'cancelled') {
      return res.status(400).json({ error: 'Purchase is already cancelled' });
    }

    const material = queryOne(db, 'SELECT * FROM materials WHERE id = ?', [purchase.material_id]);
    const settings = queryOne(db, 'SELECT allow_negative_stock FROM settings WHERE id = 1');
    const allowNegative = settings?.allow_negative_stock === 1;

    if (!allowNegative && (material?.quantity || 0) < purchase.quantity) {
      return res.status(400).json({
        error: `Cannot cancel purchase: Material '${material.name}' has current stock of ${material.quantity} ${material.unit}, which is less than the purchased ${purchase.quantity} ${material.unit}.`
      });
    }

    executeTransaction(db, () => {
      // 1. Mark as cancelled
      runQuery(db, `UPDATE purchases SET status = 'cancelled' WHERE id = ?`, [purchaseId]);

      // 2. Reduce material stock
      runQuery(db, `UPDATE materials SET quantity = quantity - ? WHERE id = ?`, [purchase.quantity, purchase.material_id]);

      // 3. Reverse any payments associated with this purchase
      const payment = queryOne(db, 'SELECT * FROM supplier_payments WHERE purchase_id = ?', [purchaseId]);
      if (payment) {
        runQuery(db, 'DELETE FROM supplier_payments WHERE id = ?', [payment.id]);
        runQuery(
          db,
          `DELETE FROM cash_bank_transactions WHERE source = 'purchase' AND reference_id = ?`,
          [purchaseId]
        );
      }
    });

    res.json({ success: true, message: 'Purchase cancelled and inventory/balances reversed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to cancel purchase' });
  }
});
