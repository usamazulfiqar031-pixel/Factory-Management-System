import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { DashboardData } from '../types';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wallet,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  ShoppingBag,
  Factory,
  Receipt,
  Users,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { NavItem } from '../components/Sidebar';

interface DashboardPageProps {
  onNavigate: (tab: NavItem) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { formatMoney, dataVersion, currency } = useFactory();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard(selectedDate);
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [selectedDate, dataVersion]);

  if (loading && !data) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 rounded-md w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-neutral-200 rounded-xl"></div>
          <div className="h-32 bg-neutral-200 rounded-xl"></div>
          <div className="h-32 bg-neutral-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const today = data?.today || {
    sales: 0,
    cogs: 0,
    purchases: 0,
    expenses: 0,
    production_quantity: 0,
    customer_payments: 0,
    supplier_payments: 0,
    profit: 0,
  };

  const monthly = data?.monthly || {
    sales: 0,
    cogs: 0,
    purchases: 0,
    expenses: 0,
    production_quantity: 0,
    profit: 0,
  };

  const liquidity = data?.liquidity || {
    cash_balance: 0,
    bank_balance: 0,
    total_balance: 0,
  };

  const alerts = data?.alerts || {
    low_stock_materials: [],
    customers_with_balance: [],
    suppliers_with_balance: [],
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Date Header Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
        <div>
          <h1 className="text-base font-semibold text-neutral-900">Operations Pulse</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Single consistent source of truth calculated directly from transaction records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-700">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <span className="text-neutral-500">Selected Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-medium text-neutral-900 focus:outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className="px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Primary Liquidity & Cash/Bank Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Liquidity */}
        <div className="p-5 rounded-xl border border-neutral-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Total Available Funds</span>
            <Wallet className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-2">
            {formatMoney(liquidity.total_balance)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 pt-3 border-t border-neutral-100">
            <span>Cash + Bank on Hand</span>
            <span className="font-semibold text-neutral-700">Audited Ledger</span>
          </div>
        </div>

        {/* Cash Balance */}
        <div className="p-5 rounded-xl border border-neutral-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Cash in Hand</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-2">
            {formatMoney(liquidity.cash_balance)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 pt-3 border-t border-neutral-100">
            <span>Liquid Cash Register</span>
            <span className="text-neutral-400">Physical Vault</span>
          </div>
        </div>

        {/* Bank Balance */}
        <div className="p-5 rounded-xl border border-neutral-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Bank Operating Balance</span>
            <Building className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-2">
            {formatMoney(liquidity.bank_balance)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 pt-3 border-t border-neutral-100">
            <span>Corporate Account</span>
            <span className="text-neutral-400">Electronic</span>
          </div>
        </div>
      </div>

      {/* TODAY'S OPERATIONS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Today's Statistics ({selectedDate})
          </h2>
          <span className="text-xs text-neutral-500">Live transaction calculations</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Sales */}
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-xs">
            <div className="text-xs text-neutral-500 font-medium flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-neutral-400" />
              <span>Sales Revenue</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-1.5">
              {formatMoney(today.sales)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Invoiced sales</div>
          </div>

          {/* Purchases */}
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-xs">
            <div className="text-xs text-neutral-500 font-medium flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-neutral-400" />
              <span>Purchases</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-1.5">
              {formatMoney(today.purchases)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Raw material orders</div>
          </div>

          {/* Expenses */}
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-xs">
            <div className="text-xs text-neutral-500 font-medium flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-neutral-400" />
              <span>Expenses</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-1.5">
              {formatMoney(today.expenses)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Operating costs</div>
          </div>

          {/* Production Output */}
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-xs">
            <div className="text-xs text-neutral-500 font-medium flex items-center gap-1.5">
              <Factory className="w-3.5 h-3.5 text-neutral-400" />
              <span>Production</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-1.5">
              {today.production_quantity}{' '}
              <span className="text-xs font-normal text-neutral-500">units</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Manufactured goods</div>
          </div>

          {/* Today Profit */}
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-xs">
            <div className="text-xs text-neutral-500 font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-neutral-400" />
              <span>Estimated Profit</span>
            </div>
            <div
              className={`text-lg font-bold font-mono tabular-nums mt-1.5 ${
                today.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatMoney(today.profit)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Sales - COGS - Expenses</div>
          </div>
        </div>

        {/* Payments Today row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>Customer Payments Received Today</span>
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-neutral-900 mt-1">
                {formatMoney(today.customer_payments)}
              </div>
            </div>
            <button
              onClick={() => onNavigate('customer-payments')}
              className="text-xs text-neutral-600 hover:text-neutral-900 font-medium underline underline-offset-4"
            >
              View receipts
            </button>
          </div>

          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                <span>Supplier Payments Disbursed Today</span>
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-neutral-900 mt-1">
                {formatMoney(today.supplier_payments)}
              </div>
            </div>
            <button
              onClick={() => onNavigate('supplier-payments')}
              className="text-xs text-neutral-600 hover:text-neutral-900 font-medium underline underline-offset-4"
            >
              View disbursements
            </button>
          </div>
        </div>
      </div>

      {/* MONTHLY SUMMARY CARD */}
      <div className="bg-neutral-900 text-white rounded-xl p-6 border border-neutral-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Monthly Cumulative Performance
            </span>
            <div className="text-sm font-medium text-neutral-200 mt-0.5">
              Month of {data?.selected_month || 'Current Month'}
            </div>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs text-neutral-300 hover:text-white font-medium underline underline-offset-4 self-start sm:self-auto"
          >
            Open detailed monthly report →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 pt-5">
          <div>
            <div className="text-xs text-neutral-400 font-medium">Monthly Sales</div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-1">
              {formatMoney(monthly.sales)}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Monthly Purchases</div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-1">
              {formatMoney(monthly.purchases)}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Monthly Expenses</div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-1">
              {formatMoney(monthly.expenses)}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Units Produced</div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-1">
              {monthly.production_quantity}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Monthly Net Profit</div>
            <div
              className={`text-lg sm:text-xl font-bold font-mono tabular-nums mt-1 ${
                monthly.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatMoney(monthly.profit)}
            </div>
          </div>
        </div>
      </div>

      {/* USEFUL ALERTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Raw Materials */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-semibold text-neutral-900">Low Raw Material Stock</h3>
            </div>
            <span className="text-xs font-mono text-neutral-500">
              {alerts.low_stock_materials.length} alerts
            </span>
          </div>

          <div className="flex-1 mt-3 space-y-2.5 overflow-y-auto max-h-56">
            {alerts.low_stock_materials.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400 flex flex-col items-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1.5" />
                <span>All raw material stocks are above minimum threshold.</span>
              </div>
            ) : (
              alerts.low_stock_materials.map((mat) => (
                <div
                  key={mat.id}
                  className="flex items-center justify-between p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-lg text-xs"
                >
                  <div>
                    <div className="font-semibold text-neutral-900">{mat.name}</div>
                    <div className="text-[11px] text-neutral-500">
                      Min threshold: {mat.min_stock_level} {mat.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-700">
                      {mat.quantity} {mat.unit}
                    </span>
                    <button
                      onClick={() => onNavigate('purchases')}
                      className="block text-[11px] text-amber-800 underline mt-0.5 hover:text-amber-900"
                    >
                      Order stock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Receivables Outstanding */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-600" />
              <h3 className="text-xs font-semibold text-neutral-900">Customer Balances Due</h3>
            </div>
            <span className="text-xs font-mono text-neutral-500">
              Total: {formatMoney(data?.receivables.total)}
            </span>
          </div>

          <div className="flex-1 mt-3 space-y-2.5 overflow-y-auto max-h-56">
            {alerts.customers_with_balance.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400 flex flex-col items-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1.5" />
                <span>No outstanding customer receivables. All accounts clear!</span>
              </div>
            ) : (
              alerts.customers_with_balance.map((cust) => (
                <div
                  key={cust.id}
                  className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-neutral-900 truncate">{cust.name}</div>
                    <div className="text-[11px] text-neutral-500 truncate">{cust.phone || 'No phone'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-neutral-900">
                      {formatMoney(cust.outstanding_balance)}
                    </span>
                    <button
                      onClick={() => onNavigate('customer-payments')}
                      className="block text-[11px] text-neutral-600 underline mt-0.5 hover:text-neutral-900"
                    >
                      Receive pay
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Supplier Payables Outstanding */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-neutral-600" />
              <h3 className="text-xs font-semibold text-neutral-900">Supplier Balances Payable</h3>
            </div>
            <span className="text-xs font-mono text-neutral-500">
              Total: {formatMoney(data?.payables.total)}
            </span>
          </div>

          <div className="flex-1 mt-3 space-y-2.5 overflow-y-auto max-h-56">
            {alerts.suppliers_with_balance.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400 flex flex-col items-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1.5" />
                <span>All supplier bills are completely settled.</span>
              </div>
            ) : (
              alerts.suppliers_with_balance.map((sup) => (
                <div
                  key={sup.id}
                  className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-neutral-900 truncate">{sup.name}</div>
                    <div className="text-[11px] text-neutral-500 truncate">{sup.phone || 'No phone'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-rose-700">
                      {formatMoney(sup.outstanding_balance)}
                    </span>
                    <button
                      onClick={() => onNavigate('supplier-payments')}
                      className="block text-[11px] text-neutral-600 underline mt-0.5 hover:text-neutral-900"
                    >
                      Pay supplier
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
