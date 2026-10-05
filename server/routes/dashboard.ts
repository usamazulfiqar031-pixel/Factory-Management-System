import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne } from '../db.js';

export const dashboardRouter = Router();

// GET dashboard statistics and alerts
dashboardRouter.get('/', async (req: Request, res: Response) => {
  const selectedDate = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const selectedMonth = selectedDate.slice(0, 7); // 'YYYY-MM'

  try {
    const db = await getDb();
    const settings = queryOne<{
      factory_name: string;
      currency_symbol: string;
      initial_cash: number;
      initial_bank: number;
    }>(db, 'SELECT factory_name, currency_symbol, initial_cash, initial_bank FROM settings WHERE id = 1');

    const curr = settings?.currency_symbol || 'PKR';

    // 1. TODAY'S METRICS (for selectedDate)
    const todaySalesRow = queryOne<{ total: number; cogs: number }>(
      db,
      `SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(cost_of_goods_sold), 0) as cogs
       FROM sales WHERE date = ? AND status != 'cancelled'`,
      [selectedDate]
    );
    const todaySales = todaySalesRow?.total || 0;
    const todayCogs = todaySalesRow?.cogs || 0;

    const todayPurchases = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM purchases WHERE date = ? AND status != 'cancelled'`,
      [selectedDate]
    )?.total || 0;

    const todayExpenses = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses WHERE date = ?`,
      [selectedDate]
    )?.total || 0;

    const todayProduction = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(quantity_produced), 0) as total
       FROM productions WHERE date = ? AND status != 'cancelled'`,
      [selectedDate]
    )?.total || 0;

    const todayCustPayments = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM customer_payments WHERE date = ?`,
      [selectedDate]
    )?.total || 0;

    const todaySupPayments = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM supplier_payments WHERE date = ?`,
      [selectedDate]
    )?.total || 0;

    const todayProfit = Number((todaySales - todayCogs - todayExpenses).toFixed(2));

    // 2. MONTHLY METRICS (for selectedMonth)
    const monthSalesRow = queryOne<{ total: number; cogs: number }>(
      db,
      `SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(cost_of_goods_sold), 0) as cogs
       FROM sales WHERE substr(date, 1, 7) = ? AND status != 'cancelled'`,
      [selectedMonth]
    );
    const monthSales = monthSalesRow?.total || 0;
    const monthCogs = monthSalesRow?.cogs || 0;

    const monthPurchases = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM purchases WHERE substr(date, 1, 7) = ? AND status != 'cancelled'`,
      [selectedMonth]
    )?.total || 0;

    const monthExpenses = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses WHERE substr(date, 1, 7) = ?`,
      [selectedMonth]
    )?.total || 0;

    const monthProduction = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(quantity_produced), 0) as total
       FROM productions WHERE substr(date, 1, 7) = ? AND status != 'cancelled'`,
      [selectedMonth]
    )?.total || 0;

    const monthProfit = Number((monthSales - monthCogs - monthExpenses).toFixed(2));

    // 3. CASH & BANK CURRENT BALANCES
    const cashIn = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'cash' AND type = 'in'`
    )?.total || 0;
    const cashOut = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'cash' AND type = 'out'`
    )?.total || 0;
    const currentCash = Number(((settings?.initial_cash || 0) + cashIn - cashOut).toFixed(2));

    const bankIn = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'bank' AND type = 'in'`
    )?.total || 0;
    const bankOut = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'bank' AND type = 'out'`
    )?.total || 0;
    const currentBank = Number(((settings?.initial_bank || 0) + bankIn - bankOut).toFixed(2));

    // 4. USEFUL ALERTS
    // A. Low stock materials
    const lowStockMaterials = queryAll(
      db,
      `SELECT id, name, unit, quantity, min_stock_level, purchase_price
       FROM materials
       WHERE is_active = 1 AND quantity <= min_stock_level
       ORDER BY quantity ASC`
    );

    // B. Customers with outstanding balances
    const customers = queryAll(db, 'SELECT id, name, phone FROM customers');
    const customersWithBalance: any[] = [];
    let totalCustomerReceivables = 0;

    for (const cust of customers) {
      const sales = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE customer_id = ? AND status != 'cancelled'`,
        [cust.id]
      )?.total || 0;
      const payments = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(amount), 0) as total FROM customer_payments WHERE customer_id = ?`,
        [cust.id]
      )?.total || 0;
      const bal = Number((sales - payments).toFixed(2));
      if (bal > 0) {
        customersWithBalance.push({ ...cust, outstanding_balance: bal });
        totalCustomerReceivables += bal;
      }
    }
    customersWithBalance.sort((a, b) => b.outstanding_balance - a.outstanding_balance);

    // C. Suppliers with outstanding balances
    const suppliers = queryAll(db, 'SELECT id, name, phone FROM suppliers');
    const suppliersWithBalance: any[] = [];
    let totalSupplierPayables = 0;

    for (const sup of suppliers) {
      const purchases = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE supplier_id = ? AND status != 'cancelled'`,
        [sup.id]
      )?.total || 0;
      const payments = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(amount), 0) as total FROM supplier_payments WHERE supplier_id = ?`,
        [sup.id]
      )?.total || 0;
      const bal = Number((purchases - payments).toFixed(2));
      if (bal > 0) {
        suppliersWithBalance.push({ ...sup, outstanding_balance: bal });
        totalSupplierPayables += bal;
      }
    }
    suppliersWithBalance.sort((a, b) => b.outstanding_balance - a.outstanding_balance);

    res.json({
      selected_date: selectedDate,
      selected_month: selectedMonth,
      currency_symbol: curr,
      factory_name: settings?.factory_name || 'Apex Factory',
      today: {
        sales: todaySales,
        cogs: todayCogs,
        purchases: todayPurchases,
        expenses: todayExpenses,
        production_quantity: todayProduction,
        customer_payments: todayCustPayments,
        supplier_payments: todaySupPayments,
        profit: todayProfit
      },
      monthly: {
        sales: monthSales,
        cogs: monthCogs,
        purchases: monthPurchases,
        expenses: monthExpenses,
        production_quantity: monthProduction,
        profit: monthProfit
      },
      liquidity: {
        cash_balance: currentCash,
        bank_balance: currentBank,
        total_balance: Number((currentCash + currentBank).toFixed(2))
      },
      receivables: {
        total: totalCustomerReceivables,
        count: customersWithBalance.length
      },
      payables: {
        total: totalSupplierPayables,
        count: suppliersWithBalance.length
      },
      alerts: {
        low_stock_materials: lowStockMaterials,
        customers_with_balance: customersWithBalance.slice(0, 10),
        suppliers_with_balance: suppliersWithBalance.slice(0, 10)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching dashboard data' });
  }
});
