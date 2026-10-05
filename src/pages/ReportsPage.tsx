import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { Printer, Calendar, ArrowDownLeft, ArrowUpRight, TrendingUp, Download } from 'lucide-react';

type ReportTab =
  | 'daily'
  | 'monthly'
  | 'raw-materials'
  | 'finished-products'
  | 'customer-outstanding'
  | 'supplier-outstanding';

export const ReportsPage: React.FC = () => {
  const { formatMoney, dataVersion, currency } = useFactory();
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [loading, setLoading] = useState(false);

  // Filters
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data states
  const [dailyData, setDailyData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [rawMaterialReport, setRawMaterialReport] = useState<any[]>([]);
  const [finishedProductReport, setFinishedProductReport] = useState<any[]>([]);
  const [customerOutstanding, setCustomerOutstanding] = useState<any[]>([]);
  const [supplierOutstanding, setSupplierOutstanding] = useState<any[]>([]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (activeTab === 'daily') {
        const res = await api.getDailyReport(dailyDate);
        setDailyData(res);
      } else if (activeTab === 'monthly') {
        const res = await api.getMonthlyReport(monthlyMonth);
        setMonthlyData(res);
      } else if (activeTab === 'raw-materials') {
        const res = await api.getRawMaterialReport(startDate || undefined, endDate || undefined);
        setRawMaterialReport(res);
      } else if (activeTab === 'finished-products') {
        const res = await api.getFinishedProductReport(startDate || undefined, endDate || undefined);
        setFinishedProductReport(res);
      } else if (activeTab === 'customer-outstanding') {
        const res = await api.getCustomerOutstandingReport();
        setCustomerOutstanding(res);
      } else if (activeTab === 'supplier-outstanding') {
        const res = await api.getSupplierOutstandingReport();
        setSupplierOutstanding(res);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, dailyDate, monthlyMonth, startDate, endDate, dataVersion]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Filter and Tab Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-xs no-print">
        {/* Segmented Tab Controls */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-100 rounded-lg">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'daily' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Daily Operations
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'monthly' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Monthly Audit
          </button>
          <button
            onClick={() => setActiveTab('raw-materials')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'raw-materials' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Raw Material Stock
          </button>
          <button
            onClick={() => setActiveTab('finished-products')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'finished-products' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Finished Stock
          </button>
          <button
            onClick={() => setActiveTab('customer-outstanding')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'customer-outstanding' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Customer Debt
          </button>
          <button
            onClick={() => setActiveTab('supplier-outstanding')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'supplier-outstanding' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Supplier Debt
          </button>
        </div>

        {/* Date Filters & Print Button */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {activeTab === 'daily' && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs">
              <span className="text-neutral-400">Date:</span>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {activeTab === 'monthly' && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs">
              <span className="text-neutral-400">Month:</span>
              <input
                type="month"
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(e.target.value)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {(activeTab === 'raw-materials' || activeTab === 'finished-products') && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
                className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg"
              />
              <span className="text-neutral-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
                className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg"
              />
            </div>
          )}

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* REPORT CONTENT AREA */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs printable-report space-y-6">
        {/* Printable Title */}
        <div className="border-b border-neutral-200 pb-4">
          <h2 className="text-base font-bold text-neutral-900">
            {activeTab === 'daily' && `Daily Operations & Financial Report — ${dailyDate}`}
            {activeTab === 'monthly' && `Monthly Executive Financial Audit — ${monthlyMonth}`}
            {activeTab === 'raw-materials' && 'Raw Material Inventory Audit Report'}
            {activeTab === 'finished-products' && 'Finished Products Inventory Movement Report'}
            {activeTab === 'customer-outstanding' && 'Accounts Receivable: Customer Balances Due'}
            {activeTab === 'supplier-outstanding' && 'Accounts Payable: Supplier Balances Due'}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Generated directly from factory ledger and inventory transaction logs
          </p>
        </div>

        {/* 1. DAILY REPORT */}
        {activeTab === 'daily' && dailyData && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-100">
                <span className="text-neutral-500 text-xs">Sales Invoiced</span>
                <div className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-1">
                  {formatMoney(dailyData.summary.total_sales)}
                </div>
              </div>
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-100">
                <span className="text-neutral-500 text-xs">Cost of Goods Sold (COGS)</span>
                <div className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-1">
                  {formatMoney(dailyData.summary.total_cogs)}
                </div>
              </div>
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-100">
                <span className="text-neutral-500 text-xs">Operating Expenses</span>
                <div className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-1">
                  {formatMoney(dailyData.summary.total_expenses)}
                </div>
              </div>
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-100">
                <span className="text-neutral-500 text-xs">Net Daily Profit</span>
                <div
                  className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                    dailyData.summary.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatMoney(dailyData.summary.net_profit)}
                </div>
              </div>
            </div>

            {/* Liquidity Movements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <h4 className="font-semibold text-xs text-neutral-900 mb-2">Cash Movement Today</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Cash Inflow:</span>
                    <span className="font-mono text-emerald-700 font-medium">+{formatMoney(dailyData.summary.cash_movement.in)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Cash Outflow:</span>
                    <span className="font-mono text-rose-700 font-medium">-{formatMoney(dailyData.summary.cash_movement.out)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-neutral-200 text-neutral-900">
                    <span>Net Cash Flow:</span>
                    <span className="font-mono">{formatMoney(dailyData.summary.cash_movement.net)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <h4 className="font-semibold text-xs text-neutral-900 mb-2">Bank Movement Today</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Bank Inflow:</span>
                    <span className="font-mono text-emerald-700 font-medium">+{formatMoney(dailyData.summary.bank_movement.in)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Bank Outflow:</span>
                    <span className="font-mono text-rose-700 font-medium">-{formatMoney(dailyData.summary.bank_movement.out)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-neutral-200 text-neutral-900">
                    <span>Net Bank Flow:</span>
                    <span className="font-mono">{formatMoney(dailyData.summary.bank_movement.net)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operations Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 border border-neutral-200 rounded-lg">
                <span className="text-neutral-500">Purchases Today</span>
                <div className="font-mono font-bold text-sm text-neutral-900 mt-0.5">
                  {formatMoney(dailyData.summary.total_purchases)}
                </div>
              </div>
              <div className="p-3 border border-neutral-200 rounded-lg">
                <span className="text-neutral-500">Units Produced Today</span>
                <div className="font-mono font-bold text-sm text-neutral-900 mt-0.5">
                  {dailyData.summary.total_production_qty} units
                </div>
              </div>
              <div className="p-3 border border-neutral-200 rounded-lg">
                <span className="text-neutral-500">Customer Payments</span>
                <div className="font-mono font-bold text-sm text-emerald-700 mt-0.5">
                  {formatMoney(dailyData.summary.total_customer_payments)}
                </div>
              </div>
              <div className="p-3 border border-neutral-200 rounded-lg">
                <span className="text-neutral-500">Supplier Payments</span>
                <div className="font-mono font-bold text-sm text-rose-700 mt-0.5">
                  {formatMoney(dailyData.summary.total_supplier_payments)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. MONTHLY REPORT */}
        {activeTab === 'monthly' && monthlyData && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-100">
                <span className="text-neutral-500 text-xs">Total Monthly Sales</span>
                <div className="text-xl font-bold font-mono tabular-nums text-neutral-900 mt-1">
                  {formatMoney(monthlyData.summary.total_sales)}
                </div>
              </div>
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-100">
                <span className="text-neutral-500 text-xs">Total COGS</span>
                <div className="text-xl font-bold font-mono tabular-nums text-neutral-900 mt-1">
                  {formatMoney(monthlyData.summary.total_cogs)}
                </div>
              </div>
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-100">
                <span className="text-neutral-500 text-xs">Operating Expenses</span>
                <div className="text-xl font-bold font-mono tabular-nums text-neutral-900 mt-1">
                  {formatMoney(monthlyData.summary.total_expenses)}
                </div>
              </div>
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-100">
                <span className="text-neutral-500 text-xs">Net Operating Profit</span>
                <div
                  className={`text-xl font-bold font-mono tabular-nums mt-1 ${
                    monthlyData.summary.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatMoney(monthlyData.summary.net_profit)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 border border-neutral-200 rounded-lg">
                <span className="text-neutral-500">Material Purchases</span>
                <div className="font-mono font-bold text-sm text-neutral-900 mt-0.5">
                  {formatMoney(monthlyData.summary.total_purchases)}
                </div>
              </div>
              <div className="p-3 border border-neutral-200 rounded-lg">
                <span className="text-neutral-500">Production Output</span>
                <div className="font-mono font-bold text-sm text-neutral-900 mt-0.5">
                  {monthlyData.summary.total_production_qty} units
                </div>
              </div>
              <div className="p-3 border border-neutral-200 rounded-lg">
                <span className="text-neutral-500">Customer Collections</span>
                <div className="font-mono font-bold text-sm text-emerald-700 mt-0.5">
                  {formatMoney(monthlyData.summary.total_customer_payments)}
                </div>
              </div>
              <div className="p-3 border border-neutral-200 rounded-lg">
                <span className="text-neutral-500">Supplier Disbursements</span>
                <div className="font-mono font-bold text-sm text-rose-700 mt-0.5">
                  {formatMoney(monthlyData.summary.total_supplier_payments)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. RAW MATERIAL STOCK REPORT */}
        {activeTab === 'raw-materials' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-right">Opening Stock</th>
                  <th className="py-2.5 px-3 text-right">Purchased (+)</th>
                  <th className="py-2.5 px-3 text-right">Production Usage (-)</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {rawMaterialReport.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">{m.name}</td>
                    <td className="py-2.5 px-3 font-medium text-neutral-500">{m.unit}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{m.opening_stock}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 font-medium">
                      +{m.purchased_quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-700 font-medium">
                      -{m.used_in_production}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-neutral-900">
                      {m.current_stock}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatMoney(m.purchase_price)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-neutral-900">
                      {formatMoney(m.stock_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. FINISHED PRODUCT STOCK REPORT */}
        {activeTab === 'finished-products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Finished Product</th>
                  <th className="py-2.5 px-3 text-right">Opening Stock</th>
                  <th className="py-2.5 px-3 text-right">Production (+)</th>
                  <th className="py-2.5 px-3 text-right">Sales (-)</th>
                  <th className="py-2.5 px-3 text-right">Current Available</th>
                  <th className="py-2.5 px-3 text-right">Unit Production Cost</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3 text-right">Stock Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {finishedProductReport.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">{p.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{p.opening_stock}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 font-medium">
                      +{p.produced_quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-700 font-medium">
                      -{p.sold_quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-neutral-900">
                      {p.current_stock}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatMoney(p.production_cost)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatMoney(p.selling_price)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-neutral-900">
                      {formatMoney(p.stock_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. CUSTOMER OUTSTANDING REPORT */}
        {activeTab === 'customer-outstanding' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3 text-right">Total Invoiced Sales</th>
                  <th className="py-2.5 px-3 text-right">Total Paid</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Receivable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {customerOutstanding.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">{c.name}</td>
                    <td className="py-2.5 px-3 text-neutral-500">{c.phone || '-'}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatMoney(c.total_sales)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">{formatMoney(c.total_payments)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                      <span className={c.outstanding_balance > 0 ? 'text-rose-600' : 'text-neutral-500'}>
                        {formatMoney(c.outstanding_balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. SUPPLIER OUTSTANDING REPORT */}
        {activeTab === 'supplier-outstanding' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3 text-right">Total Invoiced Purchases</th>
                  <th className="py-2.5 px-3 text-right">Total Paid</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {supplierOutstanding.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">{s.name}</td>
                    <td className="py-2.5 px-3 text-neutral-500">{s.phone || '-'}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatMoney(s.total_purchases)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">{formatMoney(s.total_payments)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                      <span className={s.outstanding_balance > 0 ? 'text-rose-600' : 'text-neutral-500'}>
                        {formatMoney(s.outstanding_balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
