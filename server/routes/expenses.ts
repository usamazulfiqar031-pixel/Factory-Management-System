import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne, runQuery, executeTransaction } from '../db.js';

export const expensesRouter = Router();

// GET all expenses
expensesRouter.get('/', async (req: Request, res: Response) => {
  const { startDate, endDate, method } = req.query;

  try {
    const db = await getDb();

    let sql = `SELECT * FROM expenses WHERE 1=1`;
    const params: any[] = [];

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }

    if (method) {
      sql += ' AND payment_method = ?';
      params.push(method);
    }

    sql += ' ORDER BY date DESC, id DESC';

    const rows = queryAll(db, sql, params);

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Error fetching expenses'
    });
  }
});

// POST record new expense
expensesRouter.post('/', async (req: Request, res: Response) => {
  const {
    date,
    amount,
    purpose,
    payment_method,
    notes
  } = req.body;

  const expAmount = Number(amount);
  const payMethod = (payment_method || 'cash').toLowerCase();

  if (!date) {
    return res.status(400).json({
      error: 'Date is required'
    });
  }

  if (!purpose || !purpose.trim()) {
    return res.status(400).json({
      error: 'What the expense was used for is required'
    });
  }

  if (expAmount <= 0) {
    return res.status(400).json({
      error: 'Amount must be greater than zero'
    });
  }

  if (!['cash', 'bank'].includes(payMethod)) {
    return res.status(400).json({
      error: 'Payment method must be Cash or Bank'
    });
  }

  try {
    const db = await getDb();

    const user = (req as any).user?.username || 'admin';

    const expense = executeTransaction(db, () => {

      // 1. Insert expense
      const result = runQuery(
        db,
        `INSERT INTO expenses
        (
          date,
          amount,
          purpose,
          payment_method,
          notes,
          created_by,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          date,
          expAmount,
          purpose.trim(),
          payMethod,
          notes?.trim() || null,
          user
        ]
      );

      const expenseId = result.lastInsertRowid;

      // 2. Record cash/bank transaction
      runQuery(
        db,
        `INSERT INTO cash_bank_transactions
        (
          date,
          account,
          type,
          amount,
          source,
          reference_id,
          description,
          created_at
        )
        VALUES (?, ?, 'out', ?, 'expense', ?, ?, datetime('now'))`,
        [
          date,
          payMethod,
          expAmount,
          expenseId,
          `Expense: ${purpose.trim()}`
        ]
      );

      // 3. Return newly created expense
      return queryOne(
        db,
        'SELECT * FROM expenses WHERE id = ?',
        [expenseId]
      );
    });

    res.status(201).json(expense);

  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to record expense'
    });
  }
});