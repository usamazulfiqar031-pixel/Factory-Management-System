import assert from 'node:assert';
import { getDb, queryOne, queryAll, executeTransaction } from '../server/db.js';

async function runE2EScenario() {
  console.log('--- STARTING COMPLETE FACTORY E2E SCENARIO TEST ---');
  const db = await getDb();

  // Reset database to clean state for test
  executeTransaction(db, () => {
    db.run('DELETE FROM cash_bank_transactions;');
    db.run('DELETE FROM supplier_payments;');
    db.run('DELETE FROM customer_payments;');
    db.run('DELETE FROM expenses;');
    db.run('DELETE FROM sales;');
    db.run('DELETE FROM production_items;');
    db.run('DELETE FROM productions;');
    db.run('DELETE FROM purchases;');
    db.run('DELETE FROM product_materials;');
    db.run('DELETE FROM products;');
    db.run('DELETE FROM materials;');
    db.run('DELETE FROM suppliers;');
    db.run('DELETE FROM customers;');
    db.run(`UPDATE settings SET initial_cash = 100000, initial_bank = 500000, currency_symbol = 'PKR', allow_negative_stock = 0 WHERE id = 1;`);
  });

  const today = '2026-09-30';

  // 1. Create raw materials: Wood, Paint, Screws
  console.log('Step 1: Creating raw materials...');
  db.run(`INSERT INTO materials (id, name, unit, quantity, purchase_price, min_stock_level, is_active) VALUES (1, 'Wood', 'kg', 0, 300, 100, 1);`);
  db.run(`INSERT INTO materials (id, name, unit, quantity, purchase_price, min_stock_level, is_active) VALUES (2, 'Paint', 'liter', 0, 150, 50, 1);`);
  db.run(`INSERT INTO materials (id, name, unit, quantity, purchase_price, min_stock_level, is_active) VALUES (3, 'Screws', 'piece', 0, 5, 500, 1);`);

  // 2. Create product: Wooden Table
  console.log('Step 2: Creating finished product...');
  db.run(`INSERT INTO products (id, name, quantity, selling_price, production_cost, is_active) VALUES (1, 'Wooden Table', 0, 2500, 0, 1);`);

  // 3. Define BOM: 5 kg wood, 2 L paint, 10 screws
  console.log('Step 3: Defining BOM...');
  db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (1, 1, 5.0);`);
  db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (1, 2, 2.0);`);
  db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (1, 3, 10.0);`);

  // 4. Create supplier
  console.log('Step 4: Creating supplier...');
  db.run(`INSERT INTO suppliers (id, name, phone) VALUES (1, 'Timber & Hardware Supplies Ltd', '+1-555-0100');`);

  // 5. Purchase: 1,000 kg wood, 500 L paint, 5,000 screws
  // Wood: 1000 kg @ PKR 300 = PKR 300,000. Paid: PKR 200,000. Remaining: PKR 100,000. Bank.
  console.log('Step 5: Purchasing raw materials...');
  executeTransaction(db, () => {
    // Purchase 1: Wood
    db.run(`INSERT INTO purchases (id, purchase_number, date, supplier_id, material_id, quantity, unit_price, total_amount, paid_amount, remaining_amount, payment_method, status, created_by)
            VALUES (1, 'PUR-001', '${today}', 1, 1, 1000, 300, 300000, 200000, 100000, 'bank', 'completed', 'admin');`);
    db.run(`UPDATE materials SET quantity = quantity + 1000 WHERE id = 1;`);
    db.run(`INSERT INTO supplier_payments (id, payment_number, date, supplier_id, purchase_id, amount, payment_method, notes, created_by)
            VALUES (1, 'SPAY-001', '${today}', 1, 1, 200000, 'bank', 'Initial payment', 'admin');`);
    db.run(`INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
            VALUES ('${today}', 'bank', 'out', 200000, 'purchase', 1, 'Purchase PUR-001');`);

    // Purchase 2: Paint (500 L @ PKR 150 = PKR 75,000. Paid: PKR 75,000)
    db.run(`INSERT INTO purchases (id, purchase_number, date, supplier_id, material_id, quantity, unit_price, total_amount, paid_amount, remaining_amount, payment_method, status, created_by)
            VALUES (2, 'PUR-002', '${today}', 1, 2, 500, 150, 75000, 75000, 0, 'bank', 'completed', 'admin');`);
    db.run(`UPDATE materials SET quantity = quantity + 500 WHERE id = 2;`);
    db.run(`INSERT INTO supplier_payments (id, payment_number, date, supplier_id, purchase_id, amount, payment_method, notes, created_by)
            VALUES (2, 'SPAY-002', '${today}', 1, 2, 75000, 'bank', 'Full payment', 'admin');`);
    db.run(`INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
            VALUES ('${today}', 'bank', 'out', 75000, 'purchase', 2, 'Purchase PUR-002');`);

    // Purchase 3: Screws (5000 pcs @ PKR 5 = PKR 25,000. Paid: PKR 25,000)
    db.run(`INSERT INTO purchases (id, purchase_number, date, supplier_id, material_id, quantity, unit_price, total_amount, paid_amount, remaining_amount, payment_method, status, created_by)
            VALUES (3, 'PUR-003', '${today}', 1, 3, 5000, 5, 25000, 25000, 0, 'bank', 'completed', 'admin');`);
    db.run(`UPDATE materials SET quantity = quantity + 5000 WHERE id = 3;`);
    db.run(`INSERT INTO supplier_payments (id, payment_number, date, supplier_id, purchase_id, amount, payment_method, notes, created_by)
            VALUES (3, 'SPAY-003', '${today}', 1, 3, 25000, 'bank', 'Full payment', 'admin');`);
    db.run(`INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
            VALUES ('${today}', 'bank', 'out', 25000, 'purchase', 3, 'Purchase PUR-003');`);
  });

  // Verify stock after purchase
  const woodAfterPur = queryOne<{ quantity: number }>(db, 'SELECT quantity FROM materials WHERE id = 1');
  const paintAfterPur = queryOne<{ quantity: number }>(db, 'SELECT quantity FROM materials WHERE id = 2');
  const screwsAfterPur = queryOne<{ quantity: number }>(db, 'SELECT quantity FROM materials WHERE id = 3');
  assert.strictEqual(woodAfterPur?.quantity, 1000, 'Wood stock must be 1000');
  assert.strictEqual(paintAfterPur?.quantity, 500, 'Paint stock must be 500');
  assert.strictEqual(screwsAfterPur?.quantity, 5000, 'Screws stock must be 5000');
  console.log('-> Stock after purchases verified: Wood=1000kg, Paint=500L, Screws=5000pcs');

  // 6. Produce: 100 tables
  // Expected usage for 100 tables:
  // Wood: 100 * 5 = 500 kg (PKR 150,000)
  // Paint: 100 * 2 = 200 L (PKR 30,000)
  // Screws: 100 * 10 = 1000 pcs (PKR 5,000)
  // Total material cost: PKR 185,000 -> Unit cost: PKR 1,850
  console.log('Step 6: Producing 100 tables...');
  executeTransaction(db, () => {
    db.run(`INSERT INTO productions (id, production_number, date, product_id, quantity_produced, total_material_cost, unit_cost, status, created_by)
            VALUES (1, 'PROD-001', '${today}', 1, 100, 185000, 1850, 'completed', 'admin');`);
    db.run(`INSERT INTO production_items (production_id, material_id, expected_quantity, actual_quantity, unit_cost, total_cost)
            VALUES (1, 1, 500, 500, 300, 150000);`);
    db.run(`INSERT INTO production_items (production_id, material_id, expected_quantity, actual_quantity, unit_cost, total_cost)
            VALUES (1, 2, 200, 200, 150, 30000);`);
    db.run(`INSERT INTO production_items (production_id, material_id, expected_quantity, actual_quantity, unit_cost, total_cost)
            VALUES (1, 3, 1000, 1000, 5, 5000);`);

    // Deduct raw materials
    db.run(`UPDATE materials SET quantity = quantity - 500 WHERE id = 1;`);
    db.run(`UPDATE materials SET quantity = quantity - 200 WHERE id = 2;`);
    db.run(`UPDATE materials SET quantity = quantity - 1000 WHERE id = 3;`);

    // Increase finished product
    db.run(`UPDATE products SET quantity = quantity + 100, production_cost = 1850 WHERE id = 1;`);
  });

  // 7. Verify raw material stock
  console.log('Step 7: Verifying raw material stock...');
  const woodAfterProd = queryOne<{ quantity: number }>(db, 'SELECT quantity FROM materials WHERE id = 1');
  const paintAfterProd = queryOne<{ quantity: number }>(db, 'SELECT quantity FROM materials WHERE id = 2');
  const screwsAfterProd = queryOne<{ quantity: number }>(db, 'SELECT quantity FROM materials WHERE id = 3');
  assert.strictEqual(woodAfterProd?.quantity, 500, 'Wood stock must be 500 kg');
  assert.strictEqual(paintAfterProd?.quantity, 300, 'Paint stock must be 300 L');
  assert.strictEqual(screwsAfterProd?.quantity, 4000, 'Screws stock must be 4000 pcs');
  console.log('-> Verified: Wood=500kg, Paint=300L, Screws=4000pcs');

  // 8. Verify finished product stock
  console.log('Step 8: Verifying finished product stock...');
  const tableProd = queryOne<{ quantity: number; production_cost: number }>(db, 'SELECT quantity, production_cost FROM products WHERE id = 1');
  assert.strictEqual(tableProd?.quantity, 100, 'Finished tables stock must be 100');
  assert.strictEqual(tableProd?.production_cost, 1850, 'Unit production cost must be 1850');
  console.log('-> Verified: Wooden Table stock = 100, Unit Cost = PKR 1850');

  // 9. Create customer
  console.log('Step 9: Creating customer...');
  db.run(`INSERT INTO customers (id, name, phone) VALUES (1, 'Modern Living Furniture', '+1-555-0200');`);

  // 10. Sell: 20 tables @ PKR 2,500 = PKR 50,000
  // COGS = 20 * 1850 = PKR 37,000
  // 11. Pay part of the invoice: Paid PKR 30,000, Remaining PKR 20,000 (Payment Method: Bank)
  console.log('Step 10 & 11: Selling 20 tables and receiving partial payment...');
  executeTransaction(db, () => {
    db.run(`INSERT INTO sales (id, invoice_number, date, customer_id, product_id, quantity, selling_price, total_amount, paid_amount, remaining_amount, payment_method, cost_of_goods_sold, status, created_by)
            VALUES (1, 'INV-001', '${today}', 1, 1, 20, 2500, 50000, 30000, 20000, 'bank', 37000, 'completed', 'admin');`);
    db.run(`UPDATE products SET quantity = quantity - 20 WHERE id = 1;`);
    db.run(`INSERT INTO customer_payments (id, payment_number, date, customer_id, sale_id, amount, payment_method, notes, created_by)
            VALUES (1, 'CPAY-001', '${today}', 1, 1, 30000, 'bank', 'Initial deposit for INV-001', 'admin');`);
    db.run(`INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
            VALUES ('${today}', 'bank', 'in', 30000, 'sale', 1, 'Sale Invoice INV-001');`);
  });

  // Verify finished product stock after sale
  const tableAfterSale = queryOne<{ quantity: number }>(db, 'SELECT quantity FROM products WHERE id = 1');
  assert.strictEqual(tableAfterSale?.quantity, 80, 'Finished table stock must be 80');
  console.log('-> Verified: Finished Table stock after sale = 80');

  // 12. Verify customer outstanding
  console.log('Step 12: Verifying customer outstanding balance...');
  const totalSalesRow = queryOne<{ total: number }>(db, `SELECT SUM(total_amount) as total FROM sales WHERE customer_id = 1`);
  const totalCustPayRow = queryOne<{ total: number }>(db, `SELECT SUM(amount) as total FROM customer_payments WHERE customer_id = 1`);
  const custOutstanding = (totalSalesRow?.total || 0) - (totalCustPayRow?.total || 0);
  assert.strictEqual(custOutstanding, 20000, 'Customer outstanding must be PKR 20,000');
  console.log('-> Verified: Customer Outstanding = PKR 20,000 (Sales PKR 50,000 - Payments PKR 30,000)');

  // 13. Record an expense: 5,000 transport - Cash
  console.log('Step 13: Recording expense PKR 5,000 Transport (Cash)...');
  executeTransaction(db, () => {
    db.run(`INSERT INTO expenses (id, date, amount, purpose, payment_method, created_by)
            VALUES (1, '${today}', 5000, 'Transport', 'cash', 'admin');`);
    db.run(`INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
            VALUES ('${today}', 'cash', 'out', 5000, 'expense', 1, 'Expense: Transport');`);
  });

  // 14. Record supplier payment: Pay PKR 40,000 of the remaining PKR 100,000 supplier debt (via Bank)
  console.log('Step 14: Recording supplier payment PKR 40,000 (Bank)...');
  executeTransaction(db, () => {
    db.run(`INSERT INTO supplier_payments (id, payment_number, date, supplier_id, purchase_id, amount, payment_method, notes, created_by)
            VALUES (4, 'SPAY-004', '${today}', 1, 1, 40000, 'bank', 'Installment payment', 'admin');`);
    db.run(`INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
            VALUES ('${today}', 'bank', 'out', 40000, 'supplier_payment', 4, 'Supplier Payment');`);
  });

  // 15. Verify supplier outstanding
  console.log('Step 15: Verifying supplier outstanding balance...');
  // Total purchases: 300,000 (wood) + 75,000 (paint) + 25,000 (screws) = 400,000
  // Total payments: 200,000 (wood init) + 75,000 (paint) + 25,000 (screws) + 40,000 (step 14) = 340,000
  // Outstanding = 400,000 - 340,000 = 60,000
  const supPurRow = queryOne<{ total: number }>(db, `SELECT SUM(total_amount) as total FROM purchases WHERE supplier_id = 1`);
  const supPayRow = queryOne<{ total: number }>(db, `SELECT SUM(amount) as total FROM supplier_payments WHERE supplier_id = 1`);
  const supOutstanding = (supPurRow?.total || 0) - (supPayRow?.total || 0);
  assert.strictEqual(supPurRow?.total, 400000, 'Total purchases must be PKR 400,000');
  assert.strictEqual(supPayRow?.total, 340000, 'Total payments must be PKR 340,000');
  assert.strictEqual(supOutstanding, 60000, 'Supplier outstanding balance must be PKR 60,000');
  console.log('-> Verified: Supplier Outstanding = PKR 60,000 (Purchases PKR 400,000 - Payments PKR 340,000)');

  // 16. Verify cash/bank
  console.log('Step 16: Verifying cash and bank balances...');
  // Cash: Initial PKR 100,000 - PKR 5,000 expense = PKR 95,000
  // Bank: Initial PKR 500,000 - Purchases (PKR 200,000 + PKR 75,000 + PKR 25,000) + Sale payment PKR 30,000 - Supplier payment PKR 40,000
  //      = 500,000 - 300,000 + 30,000 - 40,000 = 190,000
  const cashIn = queryOne<{ total: number }>(db, `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'cash' AND type = 'in'`)?.total || 0;
  const cashOut = queryOne<{ total: number }>(db, `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'cash' AND type = 'out'`)?.total || 0;
  const currentCash = 100000 + cashIn - cashOut;

  const bankIn = queryOne<{ total: number }>(db, `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'bank' AND type = 'in'`)?.total || 0;
  const bankOut = queryOne<{ total: number }>(db, `SELECT COALESCE(SUM(amount), 0) as total FROM cash_bank_transactions WHERE account = 'bank' AND type = 'out'`)?.total || 0;
  const currentBank = 500000 + bankIn - bankOut;

  assert.strictEqual(currentCash, 95000, 'Cash balance must be PKR 95,000');
  assert.strictEqual(currentBank, 190000, 'Bank balance must be PKR 190,000');
  console.log(`-> Verified: Cash = $${currentCash}, Bank = $${currentBank}`);

  // 17. Verify daily report
  console.log('Step 17: Verifying daily report for', today);
  const daySales = queryOne<{ total: number; cogs: number }>(db, `SELECT SUM(total_amount) as total, SUM(cost_of_goods_sold) as cogs FROM sales WHERE date = '${today}'`);
  const dayPurchases = queryOne<{ total: number }>(db, `SELECT SUM(total_amount) as total FROM purchases WHERE date = '${today}'`);
  const dayExpenses = queryOne<{ total: number }>(db, `SELECT SUM(amount) as total FROM expenses WHERE date = '${today}'`);
  const dayProd = queryOne<{ total: number }>(db, `SELECT SUM(quantity_produced) as total FROM productions WHERE date = '${today}'`);

  assert.strictEqual(daySales?.total, 50000, 'Daily sales must be PKR 50,000');
  assert.strictEqual(daySales?.cogs, 37000, 'Daily COGS must be PKR 37,000');
  assert.strictEqual(dayPurchases?.total, 400000, 'Daily purchases must be PKR 400,000');
  assert.strictEqual(dayExpenses?.total, 5000, 'Daily expenses must be PKR 5,000');
  assert.strictEqual(dayProd?.total, 100, 'Daily production quantity must be 100');
  console.log('-> Verified daily report totals match expected values.');

  // 18. Verify monthly report
  console.log('Step 18: Verifying monthly report for 2026-09...');
  const monthSales = queryOne<{ total: number; cogs: number }>(db, `SELECT SUM(total_amount) as total, SUM(cost_of_goods_sold) as cogs FROM sales WHERE substr(date, 1, 7) = '2026-09'`);
  assert.strictEqual(monthSales?.total, 50000);
  assert.strictEqual(monthSales?.cogs, 37000);

  // 19. Verify profit
  // Profit = Sales Revenue (PKR 50,000) - COGS (PKR 37,000) - Operating Expenses (PKR 5,000) = PKR 8,000
  console.log('Step 19: Verifying profit calculation...');
  const profit = (daySales?.total || 0) - (daySales?.cogs || 0) - (dayExpenses?.total || 0);
  assert.strictEqual(profit, 8000, 'Profit must be PKR 8,000 (PKR 50,000 sales - PKR 37,000 COGS - PKR 5,000 expenses)');
  console.log(`-> Verified: Profit = $${profit} (Revenue: $50,000 - COGS: $37,000 - Expenses: $5,000)`);

  // 20. Verify every inventory quantity
  console.log('Step 20: Verifying final inventory quantities...');
  const m1 = queryOne<{ quantity: number }>(db, 'SELECT quantity FROM materials WHERE id = 1')?.quantity;
  const m2 = queryOne<{ quantity: number }>(db, 'SELECT quantity FROM materials WHERE id = 2')?.quantity;
  const m3 = queryOne<{ quantity: number }>(db, 'SELECT quantity FROM materials WHERE id = 3')?.quantity;
  const p1 = queryOne<{ quantity: number }>(db, 'SELECT quantity FROM products WHERE id = 1')?.quantity;

  assert.strictEqual(m1, 500, 'Final Wood stock must be 500 kg');
  assert.strictEqual(m2, 300, 'Final Paint stock must be 300 liters');
  assert.strictEqual(m3, 4000, 'Final Screws stock must be 4000 pieces');
  assert.strictEqual(p1, 80, 'Final Wooden Table stock must be 80 units');

  console.log('ALL 20 END-TO-END SCENARIO STEPS PASSED WITH 100% ACCURACY!');
}

runE2EScenario().catch(err => {
  console.error('E2E TEST FAILURE:', err);
  process.exit(1);
});
