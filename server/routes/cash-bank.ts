import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne } from '../db.js';

export const cashBankRouter = Router();

// GET cash & bank summary and ledger
cashBankRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const settings = queryOne<{ initial_cash: number; initial_bank: number; currency_symbol: string }>(
      db,
      'SELECT initial_cash, initial_bank, currency_symbol FROM settings WHERE id = 1'
    );

    const initialCash = settings?.initial_cash || 0;
    const initialBank = settings?.initial_bank || 0;

    // Cash in & out
    const cashIn = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'cash' AND type = 'in'`
    )?.total || 0;

    const cashOut = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'cash' AND type = 'out'`
    )?.total || 0;

    // Bank in & out
    const bankIn = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'bank' AND type = 'in'`
    )?.total || 0;

    const bankOut = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'bank' AND type = 'out'`
    )?.total || 0;

    const currentCash = Number((initialCash + cashIn - cashOut).toFixed(2));
    const currentBank = Number((initialBank + bankIn - bankOut).toFixed(2));
    const totalLiquidity = Number((currentCash + currentBank).toFixed(2));

    // Recent 50 transactions
    const transactions = queryAll(
      db,
      `SELECT * FROM cash_bank_transactions ORDER BY date DESC, id DESC LIMIT 50`
    );

    res.json({
      cash: {
        initial: initialCash,
        total_in: cashIn,
        total_out: cashOut,
        balance: currentCash
      },
      bank: {
        initial: initialBank,
        total_in: bankIn,
        total_out: bankOut,
        balance: currentBank
      },
      total_liquidity: totalLiquidity,
      currency_symbol: settings?.currency_symbol || 'PKR',
      recent_transactions: transactions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching cash & bank data' });
  }
});
