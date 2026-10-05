import { getDb, executeTransaction } from '../server/db.js';

async function seedDatabase() {
  const db = await getDb();
  executeTransaction(db, () => {
    // Clear old data
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

    // Factory Settings
    db.run(`
      UPDATE settings SET
        factory_name = 'Apex Manufacturing Plant',
        phone = '+1 (555) 019-2834',
        address = '100 Industrial Parkway, Sector 4',
        currency_symbol = 'PKR',
        initial_cash = 100000,
        initial_bank = 500000,
        allow_negative_stock = 0
      WHERE id = 1;
    `);

    // 1. Raw Materials
    db.run(`INSERT INTO materials (id, name, unit, quantity, purchase_price, min_stock_level, is_active) VALUES (1, 'Wood', 'kg', 500, 300, 200, 1);`);
    db.run(`INSERT INTO materials (id, name, unit, quantity, purchase_price, min_stock_level, is_active) VALUES (2, 'Paint', 'liter', 300, 150, 100, 1);`);
    db.run(`INSERT INTO materials (id, name, unit, quantity, purchase_price, min_stock_level, is_active) VALUES (3, 'Screws', 'piece', 4000, 5, 1000, 1);`);
    db.run(`INSERT INTO materials (id, name, unit, quantity, purchase_price, min_stock_level, is_active) VALUES (4, 'Industrial Varnish', 'liter', 150, 220, 50, 1);`);

    // 2. Finished Products
    db.run(`INSERT INTO products (id, name, quantity, selling_price, production_cost, is_active) VALUES (1, 'Wooden Dining Table', 80, 2500, 1850, 1);`);
    db.run(`INSERT INTO products (id, name, quantity, selling_price, production_cost, is_active) VALUES (2, 'Wooden Coffee Table', 45, 1200, 800, 1);`);

    // 3. Bill of Materials (BOM)
    // Dining Table BOM: 5 kg wood, 2 L paint, 10 screws
    db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (1, 1, 5.0);`);
    db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (1, 2, 2.0);`);
    db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (1, 3, 10.0);`);

    // Coffee Table BOM: 2.2 kg wood, 1 L paint, 6 screws
    db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (2, 1, 2.2);`);
    db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (2, 2, 1.0);`);
    db.run(`INSERT INTO product_materials (product_id, material_id, quantity_required) VALUES (2, 3, 6.0);`);

    // 4. Suppliers
    db.run(`INSERT INTO suppliers (id, name, phone, address, notes) VALUES (1, 'Evergreen Timber Ltd', '+1 (555) 789-0101', '12 Lumberyard Rd', 'Primary hardwood vendor');`);
    db.run(`INSERT INTO suppliers (id, name, phone, address, notes) VALUES (2, 'Apex Fasteners & Paints', '+1 (555) 345-6789', '88 Chemical Ave', 'Paints, screws, hardware');`);

    // 5. Customers
    db.run(`INSERT INTO customers (id, name, phone, address, notes) VALUES (1, 'Oakridge Furniture Gallery', '+1 (555) 901-2345', '742 Design Blvd', 'Retail showroom partner');`);
    db.run(`INSERT INTO customers (id, name, phone, address, notes) VALUES (2, 'Horizon Hospitality Group', '+1 (555) 678-9012', '500 Hotel Way', 'Hotel contractor');`);

    const today = new Date().toISOString().slice(0, 10);

    // 6. Initial Purchases
    // Wood: 1000 kg @ PKR 300 = PKR 300,000. Paid PKR 200,000, remaining PKR 100,000
    db.run(`
      INSERT INTO purchases (id, purchase_number, date, supplier_id, material_id, quantity, unit_price, total_amount, paid_amount, remaining_amount, payment_method, notes, status, created_by)
      VALUES (1, 'PUR-2026-0001', '${today}', 1, 1, 1000, 300, 300000, 200000, 100000, 'bank', 'Bulk hardwood timber shipment', 'completed', 'admin');
    `);
    db.run(`
      INSERT INTO supplier_payments (id, payment_number, date, supplier_id, purchase_id, amount, payment_method, notes, created_by)
      VALUES (1, 'SPAY-2026-0001', '${today}', 1, 1, 200000, 'bank', 'Initial deposit for PUR-2026-0001', 'admin');
    `);
    db.run(`
      INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
      VALUES ('${today}', 'bank', 'out', 200000, 'purchase', 1, 'Purchase PUR-2026-0001: Evergreen Timber Ltd');
    `);

    // Paint: 500 L @ PKR 150 = PKR 75,000. Paid PKR 75,000
    db.run(`
      INSERT INTO purchases (id, purchase_number, date, supplier_id, material_id, quantity, unit_price, total_amount, paid_amount, remaining_amount, payment_method, notes, status, created_by)
      VALUES (2, 'PUR-2026-0002', '${today}', 2, 2, 500, 150, 75000, 75000, 0, 'bank', 'Industrial grade wood coating paint', 'completed', 'admin');
    `);
    db.run(`
      INSERT INTO supplier_payments (id, payment_number, date, supplier_id, purchase_id, amount, payment_method, notes, created_by)
      VALUES (2, 'SPAY-2026-0002', '${today}', 2, 2, 75000, 'bank', 'Payment for PUR-2026-0002', 'admin');
    `);
    db.run(`
      INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
      VALUES ('${today}', 'bank', 'out', 75000, 'purchase', 2, 'Purchase PUR-2026-0002: Apex Fasteners & Paints');
    `);

    // Screws: 5000 pcs @ PKR 5 = PKR 25,000. Paid PKR 25,000
    db.run(`
      INSERT INTO purchases (id, purchase_number, date, supplier_id, material_id, quantity, unit_price, total_amount, paid_amount, remaining_amount, payment_method, notes, status, created_by)
      VALUES (3, 'PUR-2026-0003', '${today}', 2, 3, 5000, 5, 25000, 25000, 0, 'bank', 'Heavy duty assembly screws', 'completed', 'admin');
    `);
    db.run(`
      INSERT INTO supplier_payments (id, payment_number, date, supplier_id, purchase_id, amount, payment_method, notes, created_by)
      VALUES (3, 'SPAY-2026-0003', '${today}', 2, 3, 25000, 'bank', 'Payment for PUR-2026-0003', 'admin');
    `);
    db.run(`
      INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
      VALUES ('${today}', 'bank', 'out', 25000, 'purchase', 3, 'Purchase PUR-2026-0003: Apex Fasteners & Paints');
    `);

    // 7. Initial Production: 100 Dining Tables produced
    db.run(`
      INSERT INTO productions (id, production_number, date, product_id, quantity_produced, total_material_cost, unit_cost, notes, status, created_by)
      VALUES (1, 'PROD-2026-0001', '${today}', 1, 100, 185000, 1850, 'Batch 100 Dining Tables', 'completed', 'admin');
    `);
    db.run(`INSERT INTO production_items (production_id, material_id, expected_quantity, actual_quantity, unit_cost, total_cost) VALUES (1, 1, 500, 500, 300, 150000);`);
    db.run(`INSERT INTO production_items (production_id, material_id, expected_quantity, actual_quantity, unit_cost, total_cost) VALUES (1, 2, 200, 200, 150, 30000);`);
    db.run(`INSERT INTO production_items (production_id, material_id, expected_quantity, actual_quantity, unit_cost, total_cost) VALUES (1, 3, 1000, 1000, 5, 5000);`);

    // 8. Initial Sale: 20 tables @ PKR 2,500 = PKR 50,000, paid PKR 30,000, remaining PKR 20,000
    db.run(`
      INSERT INTO sales (id, invoice_number, date, customer_id, product_id, quantity, selling_price, total_amount, paid_amount, remaining_amount, payment_method, cost_of_goods_sold, notes, status, created_by)
      VALUES (1, 'INV-2026-0001', '${today}', 1, 1, 20, 2500, 50000, 30000, 20000, 'bank', 37000, 'Delivery to Oakridge showroom', 'completed', 'admin');
    `);
    db.run(`
      INSERT INTO customer_payments (id, payment_number, date, customer_id, sale_id, amount, payment_method, notes, created_by)
      VALUES (1, 'CPAY-2026-0001', '${today}', 1, 1, 30000, 'bank', 'Deposit for invoice INV-2026-0001', 'admin');
    `);
    db.run(`
      INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
      VALUES ('${today}', 'bank', 'in', 30000, 'sale', 1, 'Sale Invoice INV-2026-0001: Oakridge Furniture Gallery');
    `);

    // 9. Initial Expense: PKR 5,000 transport
    db.run(`
      INSERT INTO expenses (id, date, amount, purpose, payment_method, notes, created_by)
      VALUES (1, '${today}', 5000, 'Transport', 'cash', 'Material delivery truck hire', 'admin');
    `);
    db.run(`
      INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
      VALUES ('${today}', 'cash', 'out', 5000, 'expense', 1, 'Expense: Transport');
    `);

    // 10. Supplier installment payment: PKR 40,000 to Evergreen Timber Ltd
    db.run(`
      INSERT INTO supplier_payments (id, payment_number, date, supplier_id, purchase_id, amount, payment_method, notes, created_by)
      VALUES (4, 'SPAY-2026-0004', '${today}', 1, 1, 40000, 'bank', 'Installment payment for timber debt', 'admin');
    `);
    db.run(`
      INSERT INTO cash_bank_transactions (date, account, type, amount, source, reference_id, description)
      VALUES ('${today}', 'bank', 'out', 40000, 'supplier_payment', 4, 'Supplier Payment to Evergreen Timber Ltd');
    `);
  });

  console.log('Factory database seeded successfully with accurate starting data!');
}

seedDatabase().catch((e) => {
  console.error(e);
  process.exit(1);
});
