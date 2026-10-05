export interface User {
  id: number;
  username: string;
  role: string;
  name: string;
}

export interface Settings {
  id: number;
  factory_name: string;
  phone: string;
  address: string;
  currency_symbol: string;
  initial_cash: number;
  initial_bank: number;
  allow_negative_stock: number;
}

export interface Material {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  purchase_price: number;
  min_stock_level: number;
  is_active: number;
  is_low_stock?: boolean;
  stock_value?: number;
  created_at?: string;
}

export interface BomItem {
  id?: number;
  product_id?: number;
  material_id: number;
  quantity_required: number;
  material_name?: string;
  material_unit?: string;
  material_price?: number;
  material_available?: number;
}

export interface Product {
  id: number;
  name: string;
  quantity: number;
  selling_price: number;
  production_cost: number;
  is_active: number;
  bom?: BomItem[];
  calculated_bom_cost?: number;
  stock_value?: number;
  created_at?: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  total_purchases: number;
  total_payments: number;
  outstanding_balance: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  total_sales: number;
  total_payments: number;
  outstanding_balance: number;
}

export interface Purchase {
  id: number;
  purchase_number: string;
  date: string;
  supplier_id: number;
  supplier_name?: string;
  material_id: number;
  material_name?: string;
  material_unit?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: 'cash' | 'bank' | 'credit';
  notes?: string;
  status: 'completed' | 'cancelled';
  created_by?: string;
}

export interface ProductionItem {
  id?: number;
  production_id?: number;
  material_id: number;
  material_name?: string;
  material_unit?: string;
  expected_quantity: number;
  actual_quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface Production {
  id: number;
  production_number: string;
  date: string;
  product_id: number;
  product_name?: string;
  quantity_produced: number;
  total_material_cost: number;
  unit_cost: number;
  notes?: string;
  status: 'completed' | 'cancelled';
  items?: ProductionItem[];
  created_by?: string;
}

export interface Sale {
  id: number;
  invoice_number: string;
  date: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  product_id: number;
  product_name?: string;
  quantity: number;
  selling_price: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: 'cash' | 'bank' | 'credit';
  cost_of_goods_sold: number;
  notes?: string;
  status: 'completed' | 'cancelled';
  created_by?: string;
}

export interface Expense {
  id: number;
  date: string;
  amount: number;
  purpose: string;
  payment_method: 'cash' | 'bank';
  notes?: string;
  created_by?: string;
}

export interface CustomerPayment {
  id: number;
  payment_number: string;
  date: string;
  customer_id: number;
  customer_name?: string;
  sale_id?: number;
  invoice_number?: string;
  amount: number;
  payment_method: 'cash' | 'bank';
  notes?: string;
  created_by?: string;
}

export interface SupplierPayment {
  id: number;
  payment_number: string;
  date: string;
  supplier_id: number;
  supplier_name?: string;
  purchase_id?: number;
  purchase_number?: string;
  amount: number;
  payment_method: 'cash' | 'bank';
  notes?: string;
  created_by?: string;
}

export interface DashboardData {
  selected_date: string;
  selected_month: string;
  currency_symbol: string;
  factory_name: string;
  today: {
    sales: number;
    cogs: number;
    purchases: number;
    expenses: number;
    production_quantity: number;
    customer_payments: number;
    supplier_payments: number;
    profit: number;
  };
  monthly: {
    sales: number;
    cogs: number;
    purchases: number;
    expenses: number;
    production_quantity: number;
    profit: number;
  };
  liquidity: {
    cash_balance: number;
    bank_balance: number;
    total_balance: number;
  };
  receivables: {
    total: number;
    count: number;
  };
  payables: {
    total: number;
    count: number;
  };
  alerts: {
    low_stock_materials: Material[];
    customers_with_balance: Customer[];
    suppliers_with_balance: Supplier[];
  };
}
