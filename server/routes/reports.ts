import { Router, Request, Response } from 'express';
import { getDb, queryAll, queryOne } from '../db.js';

export const reportsRouter = Router();

// GET Daily Report
reportsRouter.get('/daily', async (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  try {
    const db = await getDb();
    const settings = queryOne(db, 'SELECT currency_symbol FROM settings WHERE id = 1');

    // Sales for the day
    const salesList = queryAll(
      db,
      `SELECT s.*, c.name as customer_name, p.name as product_name
       FROM sales s
       JOIN customers c ON s.customer_id = c.id
       JOIN products p ON s.product_id = p.id
       WHERE s.date = ? AND s.status != 'cancelled'
       ORDER BY s.id DESC`,
      [date]
    );
    const totalSales = salesList.reduce((acc, s) => acc + s.total_amount, 0);
    const totalCogs = salesList.reduce((acc, s) => acc + (s.cost_of_goods_sold || 0), 0);

    // Purchases for the day
    const purchasesList = queryAll(
      db,
      `SELECT p.*, s.name as supplier_name, m.name as material_name, m.unit as material_unit
       FROM purchases p
       JOIN suppliers s ON p.supplier_id = s.id
       JOIN materials m ON p.material_id = m.id
       WHERE p.date = ? AND p.status != 'cancelled'
       ORDER BY p.id DESC`,
      [date]
    );
    const totalPurchases = purchasesList.reduce((acc, p) => acc + p.total_amount, 0);

    // Expenses for the day
    const expensesList = queryAll(
      db,
      `SELECT * FROM expenses WHERE date = ? ORDER BY id DESC`,
      [date]
    );
    const totalExpenses = expensesList.reduce((acc, e) => acc + e.amount, 0);

    // Productions for the day
    const productionsList = queryAll(
      db,
      `SELECT pr.*, p.name as product_name
       FROM productions pr
       JOIN products p ON pr.product_id = p.id
       WHERE pr.date = ? AND pr.status != 'cancelled'
       ORDER BY pr.id DESC`,
      [date]
    );
    const totalProductionQty = productionsList.reduce((acc, pr) => acc + pr.quantity_produced, 0);

    // Payments for the day
    const customerPayments = queryAll(
      db,
      `SELECT cp.*, c.name as customer_name FROM customer_payments cp
       JOIN customers c ON cp.customer_id = c.id WHERE cp.date = ?`,
      [date]
    );
    const totalCustPayments = customerPayments.reduce((acc, p) => acc + p.amount, 0);

    const supplierPayments = queryAll(
      db,
      `SELECT sp.*, s.name as supplier_name FROM supplier_payments sp
       JOIN suppliers s ON sp.supplier_id = s.id WHERE sp.date = ?`,
      [date]
    );
    const totalSupPayments = supplierPayments.reduce((acc, p) => acc + p.amount, 0);

    // Cash and Bank Movement for the day
    const cashIn = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE date = ? AND account = 'cash' AND type = 'in'`,
      [date]
    )?.total || 0;
    const cashOut = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE date = ? AND account = 'cash' AND type = 'out'`,
      [date]
    )?.total || 0;

    const bankIn = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE date = ? AND account = 'bank' AND type = 'in'`,
      [date]
    )?.total || 0;
    const bankOut = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE date = ? AND account = 'bank' AND type = 'out'`,
      [date]
    )?.total || 0;

    const netProfit = Number((totalSales - totalCogs - totalExpenses).toFixed(2));

    res.json({
      date,
      currency_symbol: settings?.currency_symbol || 'PKR',
      summary: {
        total_sales: totalSales,
        total_cogs: totalCogs,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_production_qty: totalProductionQty,
        total_customer_payments: totalCustPayments,
        total_supplier_payments: totalSupPayments,
        cash_movement: { in: cashIn, out: cashOut, net: Number((cashIn - cashOut).toFixed(2)) },
        bank_movement: { in: bankIn, out: bankOut, net: Number((bankIn - bankOut).toFixed(2)) },
        net_profit: netProfit
      },
      details: {
        sales: salesList,
        purchases: purchasesList,
        expenses: expensesList,
        productions: productionsList,
        customer_payments: customerPayments,
        supplier_payments: supplierPayments
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error generating daily report' });
  }
});

// GET Monthly Report
reportsRouter.get('/monthly', async (req: Request, res: Response) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  try {
    const db = await getDb();
    const settings = queryOne(db, 'SELECT currency_symbol FROM settings WHERE id = 1');

    const salesRow = queryOne<{ total: number; cogs: number }>(
      db,
      `SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(cost_of_goods_sold), 0) as cogs
       FROM sales WHERE substr(date, 1, 7) = ? AND status != 'cancelled'`,
      [month]
    );
    const totalSales = salesRow?.total || 0;
    const totalCogs = salesRow?.cogs || 0;

    const totalPurchases = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM purchases WHERE substr(date, 1, 7) = ? AND status != 'cancelled'`,
      [month]
    )?.total || 0;

    const totalExpenses = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses WHERE substr(date, 1, 7) = ?`,
      [month]
    )?.total || 0;

    const totalProductionQty = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(quantity_produced), 0) as total
       FROM productions WHERE substr(date, 1, 7) = ? AND status != 'cancelled'`,
      [month]
    )?.total || 0;

    const totalCustPayments = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM customer_payments WHERE substr(date, 1, 7) = ?`,
      [month]
    )?.total || 0;

    const totalSupPayments = queryOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM supplier_payments WHERE substr(date, 1, 7) = ?`,
      [month]
    )?.total || 0;

    const netProfit = Number((totalSales - totalCogs - totalExpenses).toFixed(2));

    // Daily breakdown for this month
    const dailyBreakdown = queryAll(
      db,
      `SELECT date,
              COALESCE(SUM(CASE WHEN source = 'sale' THEN amount END), 0) as sales,
              0 as purchases,
              0 as expenses
       FROM (
         SELECT date, 'sale' as source, total_amount as amount FROM sales WHERE substr(date, 1, 7) = ? AND status != 'cancelled'
       )
       GROUP BY date ORDER BY date ASC`,
      [month]
    );

    res.json({
      month,
      currency_symbol: settings?.currency_symbol || 'PKR',
      summary: {
        total_sales: totalSales,
        total_cogs: totalCogs,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_production_qty: totalProductionQty,
        total_customer_payments: totalCustPayments,
        total_supplier_payments: totalSupPayments,
        net_profit: netProfit
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error generating monthly report' });
  }
});

// GET Raw Material Stock Report (Opening, Purchases, Production Usage, Current)
reportsRouter.get('/raw-materials', async (req: Request, res: Response) => {
  const startDate = (req.query.startDate as string) || '';
  const endDate = (req.query.endDate as string) || '';

  try {
    const db = await getDb();
    const materials = queryAll(db, 'SELECT * FROM materials ORDER BY name ASC');

    const report = materials.map(mat => {
      // If date range provided:
      // Purchases in period
      let purchaseSql = `SELECT COALESCE(SUM(quantity), 0) as total FROM purchases WHERE material_id = ? AND status != 'cancelled'`;
      const purchaseParams: any[] = [mat.id];
      if (startDate) {
        purchaseSql += ' AND date >= ?';
        purchaseParams.push(startDate);
      }
      if (endDate) {
        purchaseSql += ' AND date <= ?';
        purchaseParams.push(endDate);
      }
      const periodPurchases = queryOne<{ total: number }>(db, purchaseSql, purchaseParams)?.total || 0;

      // Usage in period
      let usageSql = `
        SELECT COALESCE(SUM(pi.actual_quantity), 0) as total
        FROM production_items pi
        JOIN productions pr ON pi.production_id = pr.id
        WHERE pi.material_id = ? AND pr.status != 'cancelled'
      `;
      const usageParams: any[] = [mat.id];
      if (startDate) {
        usageSql += ' AND pr.date >= ?';
        usageParams.push(startDate);
      }
      if (endDate) {
        usageSql += ' AND pr.date <= ?';
        usageParams.push(endDate);
      }
      const periodUsage = queryOne<{ total: number }>(db, usageSql, usageParams)?.total || 0;

      // Prior purchases (before startDate)
      let priorPurchases = 0;
      let priorUsage = 0;
      if (startDate) {
        priorPurchases = queryOne<{ total: number }>(
          db,
          `SELECT COALESCE(SUM(quantity), 0) as total FROM purchases WHERE material_id = ? AND date < ? AND status != 'cancelled'`,
          [mat.id, startDate]
        )?.total || 0;

        priorUsage = queryOne<{ total: number }>(
          db,
          `SELECT COALESCE(SUM(pi.actual_quantity), 0) as total
           FROM production_items pi
           JOIN productions pr ON pi.production_id = pr.id
           WHERE pi.material_id = ? AND pr.date < ? AND pr.status != 'cancelled'`,
          [mat.id, startDate]
        )?.total || 0;
      }

      // Opening stock = current stock - periodPurchases + periodUsage (or prior net if start date given)
      const openingStock = startDate ? (priorPurchases - priorUsage) : (mat.quantity - periodPurchases + periodUsage);

      return {
        id: mat.id,
        name: mat.name,
        unit: mat.unit,
        purchase_price: mat.purchase_price,
        min_stock_level: mat.min_stock_level,
        opening_stock: Math.max(0, Number(openingStock.toFixed(3))),
        purchased_quantity: periodPurchases,
        used_in_production: periodUsage,
        current_stock: mat.quantity,
        stock_value: Number((mat.quantity * mat.purchase_price).toFixed(2))
      };
    });

    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error generating raw material report' });
  }
});

// GET Finished Product Stock Report (Opening, Production, Sales, Current)
reportsRouter.get('/finished-products', async (req: Request, res: Response) => {
  const startDate = (req.query.startDate as string) || '';
  const endDate = (req.query.endDate as string) || '';

  try {
    const db = await getDb();
    const products = queryAll(db, 'SELECT * FROM products ORDER BY name ASC');

    const report = products.map(prod => {
      // Production in period
      let prodSql = `SELECT COALESCE(SUM(quantity_produced), 0) as total FROM productions WHERE product_id = ? AND status != 'cancelled'`;
      const prodParams: any[] = [prod.id];
      if (startDate) {
        prodSql += ' AND date >= ?';
        prodParams.push(startDate);
      }
      if (endDate) {
        prodSql += ' AND date <= ?';
        prodParams.push(endDate);
      }
      const periodProduction = queryOne<{ total: number }>(db, prodSql, prodParams)?.total || 0;

      // Sales in period
      let salesSql = `SELECT COALESCE(SUM(quantity), 0) as total FROM sales WHERE product_id = ? AND status != 'cancelled'`;
      const salesParams: any[] = [prod.id];
      if (startDate) {
        salesSql += ' AND date >= ?';
        salesParams.push(startDate);
      }
      if (endDate) {
        salesSql += ' AND date <= ?';
        salesParams.push(endDate);
      }
      const periodSales = queryOne<{ total: number }>(db, salesSql, salesParams)?.total || 0;

      let priorProduction = 0;
      let priorSales = 0;
      if (startDate) {
        priorProduction = queryOne<{ total: number }>(
          db,
          `SELECT COALESCE(SUM(quantity_produced), 0) as total FROM productions WHERE product_id = ? AND date < ? AND status != 'cancelled'`,
          [prod.id, startDate]
        )?.total || 0;

        priorSales = queryOne<{ total: number }>(
          db,
          `SELECT COALESCE(SUM(quantity), 0) as total FROM sales WHERE product_id = ? AND date < ? AND status != 'cancelled'`,
          [prod.id, startDate]
        )?.total || 0;
      }

      const openingStock = startDate ? (priorProduction - priorSales) : (prod.quantity - periodProduction + periodSales);

      return {
        id: prod.id,
        name: prod.name,
        selling_price: prod.selling_price,
        production_cost: prod.production_cost,
        opening_stock: Math.max(0, Number(openingStock.toFixed(2))),
        produced_quantity: periodProduction,
        sold_quantity: periodSales,
        current_stock: prod.quantity,
        stock_value: Number((prod.quantity * prod.production_cost).toFixed(2))
      };
    });

    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error generating finished product report' });
  }
});

// GET Customer Outstanding Report
reportsRouter.get('/customer-outstanding', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const customers = queryAll(db, 'SELECT * FROM customers ORDER BY name ASC');

    const report = customers.map(cust => {
      const salesTotal = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE customer_id = ? AND status != 'cancelled'`,
        [cust.id]
      )?.total || 0;

      const paymentsTotal = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(amount), 0) as total FROM customer_payments WHERE customer_id = ?`,
        [cust.id]
      )?.total || 0;

      const outstanding = Number((salesTotal - paymentsTotal).toFixed(2));

      return {
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        address: cust.address,
        total_sales: salesTotal,
        total_payments: paymentsTotal,
        outstanding_balance: outstanding
      };
    });

    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error generating customer outstanding report' });
  }
});

// GET Supplier Outstanding Report
reportsRouter.get('/supplier-outstanding', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const suppliers = queryAll(db, 'SELECT * FROM suppliers ORDER BY name ASC');

    const report = suppliers.map(sup => {
      const purchasesTotal = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE supplier_id = ? AND status != 'cancelled'`,
        [sup.id]
      )?.total || 0;

      const paymentsTotal = queryOne<{ total: number }>(
        db,
        `SELECT COALESCE(SUM(amount), 0) as total FROM supplier_payments WHERE supplier_id = ?`,
        [sup.id]
      )?.total || 0;

      const outstanding = Number((purchasesTotal - paymentsTotal).toFixed(2));

      return {
        id: sup.id,
        name: sup.name,
        phone: sup.phone,
        address: sup.address,
        total_purchases: purchasesTotal,
        total_payments: paymentsTotal,
        outstanding_balance: outstanding
      };
    });

    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error generating supplier outstanding report' });
  }
});
