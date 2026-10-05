import { Router, Request, Response } from 'express';
import { getDb, queryOne, runQuery, executeTransaction, saveDb } from '../db.js';

export const settingsRouter = Router();

// GET settings
settingsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const settings = queryOne(db, 'SELECT * FROM settings WHERE id = 1');
    res.json(settings || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching settings' });
  }
});

// PUT update settings
settingsRouter.put('/', async (req: Request, res: Response) => {
  const { factory_name, phone, address, currency_symbol, initial_cash, initial_bank, allow_negative_stock } = req.body;

  if (!factory_name || !factory_name.trim()) {
    return res.status(400).json({ error: 'Factory name is required' });
  }

  try {
    const db = await getDb();
    runQuery(
      db,
      `UPDATE settings
       SET factory_name = ?, phone = ?, address = ?, currency_symbol = ?,
           initial_cash = ?, initial_bank = ?, allow_negative_stock = ?, updated_at = datetime('now')
       WHERE id = 1`,
      [
        factory_name.trim(),
        phone?.trim() || null,
        address?.trim() || null,
        currency_symbol?.trim() || 'PKR',
        Number(initial_cash) || 0,
        Number(initial_bank) || 0,
        allow_negative_stock ? 1 : 0
      ]
    );
    saveDb();

    const updated = queryOne(db, 'SELECT * FROM settings WHERE id = 1');
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error updating settings' });
  }
});

// POST seed demo scenario
settingsRouter.post('/seed-demo', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    executeTransaction(db, () => {
      // Clear transactional and inventory tables
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

      // Reset settings
      db.run(`
        UPDATE settings SET
          factory_name = 'TimberCraft Manufacturing',
          phone = '+1 (555) 234-5678',
          address = '45 Industrial Way, Timber Valley',
          currency_symbol = 'PKR',
          initial_cash = 100000,
          initial_bank = 500000,
          allow_negative_stock = 0
        WHERE id = 1;
      `);

      // 1. Raw Materials
      db.run(`INSERT INTO materials (id, name, unit, quantity, purchase_price, min_stock_level, is_active) VALUES (1, 'Wood', 'kg', 1000, 300, 200, 1);`);
      db.run(`INSERT INTO materials (id, name, unit, quantity, purchase_price, min_stock_level, is_active) VALUES (2, 'Paint', 'liter', 500, 150, 100, 1);`);
      db.run(`INSERT INTO materials (id, name, unit, quantity, purchase_price, min_stock_level, is_active) VALUES (3, 'Screws', 'piece', 5000, 5, 1000, 1);`);
      db.run(`INSERT INTO materials (id, name, unit, quantity, purchase_price, min_stock_level, is_active) VALUES (4, 'Varnish', 'liter', 120, 220, 50, 1);`);

      // 2. Finished Products
      // Wood table unit cost: 5kg wood (PKR 1500) + 2L paint (PKR 300) + 10 screws (PKR 50) = PKR 1850 production cost
      db.run(`INSERT INTO products (id, name, quantity, selling_price, production_cost, is_active) VALUES (1, 'Wooden Dining Table', 80, 2500, 1850, 1);`);
      db.run(`INSERT INTO products (id, name, quantity, selling_price, production_cost, is_active) VALUES (2, 'Ergonomic Wooden Chair', 150, 850, 450, 1);`);

      // 3. BOM for Wooden Dining Table
      db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (1, 1, 5.0);`); // 5 kg wood
      db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (1, 2, 2.0);`); // 2 L paint
      db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (1, 3, 10.0);`); // 10 screws

      // BOM for Wooden Chair
      db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (2, 1, 1.2);`); // 1.2 kg wood
      db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (2, 2, 0.4);`); // 0.4 L paint
      db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (2, 3, 6.0);`); // 6 screws

      // 4. Suppliers
      db.run(`INSERT INTO suppliers (id, name, phone, address, notes) VALUES (1, 'Evergreen Timber Ltd', '+1 (555) 789-0101', '12 Lumberyard Rd', 'Primary hardwood and timber vendor');`);
      db.run(`INSERT INTO suppliers (id, name, phone, address, notes) VALUES (2, 'Apex Industrial Hardware', '+1 (555) 345-6789', '88 Fastener Ave', 'Paints, fasteners, and varnishes');`);

      // 5. Customers
      db.run(`INSERT INTO customers (id, name, phone, address, notes) VALUES (1, 'Oakridge Furniture Gallery', '+1 (555) 901-2345', '742 Design Blvd', 'Retail showroom partner');`);
      db.run(`INSERT INTO customers (id, name, phone, address, notes) VALUES (2, 'Horizon Hospitality Group', '+1 (555) 678-9012', '500 Hotel Way', 'Commercial hotel and dining contractor');`);

      const today = new Date().toISOString().slice(0, 10);

      // 6. Purchases
      // Wood purchase: 1000 kg @ PKR 300 = PKR 300,000, paid PKR 200,000, remaining PKR 100,000
      db.run(`
        INSERT INTO purchases (id, purchase_number, date, supplier_id, material_id, quantity, unit_price, total_amount, paid_amount, remaining_amount, payment_method, notes, status, created_by)
        VALUES (1, 'PUR-INIT-0001', '${today}', 1, 1, 1000, 300, 300000, 200000, 100000, 'bank', 'Initial bulk timber procurement', 'completed', 'admin');
      `);
      db.run(`
        INSERT INTO supplier_payments (id, payment_number, date, supplier_id, purchase_id, amount, payment_method, notes, created_by)
        VALUES (1, 'SPAY-INIT-0001', '${today}', 1, 1, 200000, 'bank', 'Initial purchase deposit', 'admin');
      `);
      db.run(`
        INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
        VALUES ('${today}', 'bank', 'out', 200000, 'purchase', 1, 'Purchase PUR-INIT-0001: Evergreen Timber Ltd');
      `);

      // 7. Production: 100 tables produced
      // 500kg wood, 200L paint, 1000 screws
      db.run(`
        INSERT INTO productions (id, production_number, date, product_id, quantity_produced, total_material_cost, unit_cost, notes, status, created_by)
        VALUES (1, 'PROD-INIT-0001', '${today}', 1, 100, 185000, 1850, 'Batch 100 Dining Tables', 'completed', 'admin');
      `);
      db.run(`INSERT INTO production_items (production_id, material_id, expected_quantity, actual_quantity, unit_cost, total_cost) VALUES (1, 1, 500, 500, 300, 150000);`);
      db.run(`INSERT INTO production_items (production_id, material_id, expected_quantity, actual_quantity, unit_cost, total_cost) VALUES (1, 2, 200, 200, 150, 30000);`);
      db.run(`INSERT INTO production_items (production_id, material_id, expected_quantity, actual_quantity, unit_cost, total_cost) VALUES (1, 3, 1000, 1000, 5, 5000);`);

      // 8. Sales: 20 tables sold @ PKR 2500 = PKR 50,000, paid PKR 30,000, remaining PKR 20,000
      db.run(`
        INSERT INTO sales (id, invoice_number, date, customer_id, product_id, quantity, selling_price, total_amount, paid_amount, remaining_amount, payment_method, cost_of_goods_sold, notes, status, created_by)
        VALUES (1, 'INV-INIT-0001', '${today}', 1, 1, 20, 2500, 50000, 30000, 20000, 'bank', 37000, 'Order for Oakridge Showroom', 'completed', 'admin');
      `);
      db.run(`
        INSERT INTO customer_payments (id, payment_number, date, customer_id, sale_id, amount, payment_method, notes, created_by)
        VALUES (1, 'CPAY-INIT-0001', '${today}', 1, 1, 30000, 'bank', 'Deposit for invoice INV-INIT-0001', 'admin');
      `);
      db.run(`
        INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
        VALUES ('${today}', 'bank', 'in', 30000, 'sale', 1, 'Sale Invoice INV-INIT-0001: Oakridge Furniture Gallery');
      `);

      // 9. Expenses
      db.run(`
        INSERT INTO expenses (id, date, amount, purpose, payment_method, notes, created_by)
        VALUES (1, '${today}', 5000, 'Factory Freight & Transport', 'cash', 'Material delivery truck hire', 'admin');
      `);
      db.run(`
        INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
        VALUES ('${today}', 'cash', 'out', 5000, 'expense', 1, 'Expense: Factory Freight & Transport');
      `);
    });

    res.json({ success: true, message: 'Demo factory dataset seeded successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error seeding demo data' });
  }
});
