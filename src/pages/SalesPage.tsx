import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { Sale, Customer, Product } from '../types';
import { Modal } from '../components/Modal';
import { InvoiceModal } from '../components/InvoiceModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Search, Printer, Ban, FileText } from 'lucide-react';

export const SalesPage: React.FC = () => {
  const { formatMoney, showToast, dataVersion, triggerRefresh, settings } = useFactory();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Sale | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'credit'>('bank');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesData, custList, prodList] = await Promise.all([
        api.getSales(),
        api.getCustomers(),
        api.getProducts(),
      ]);
      setSales(salesData);
      setCustomers(custList);
      const activeProds = prodList.filter((p) => p.is_active === 1);
      setProducts(activeProds);

      if (custList.length > 0 && !customerId) setCustomerId(String(custList[0].id));
      if (activeProds.length > 0 && !productId) {
        setProductId(String(activeProds[0].id));
        setSellingPrice(String(activeProds[0].selling_price || 0));
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading sales', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion]);

  // When selected product changes in modal, auto-fill standard selling price
  const handleProductChange = (newProdId: string) => {
    setProductId(newProdId);
    const found = products.find((p) => p.id === Number(newProdId));
    if (found) {
      setSellingPrice(String(found.selling_price || 0));
    }
  };

  const selectedProductObj = products.find((p) => p.id === Number(productId));
  const availableStock = selectedProductObj?.quantity || 0;

  const calculatedTotal = Number(((Number(quantity) || 0) * (Number(sellingPrice) || 0)).toFixed(2));
  const calculatedRemaining = Number(Math.max(0, calculatedTotal - (Number(paidAmount) || 0)).toFixed(2));

  const openCreateModal = () => {
    setDate(new Date().toISOString().slice(0, 10));
    if (customers.length > 0) setCustomerId(String(customers[0].id));
    if (products.length > 0) {
      setProductId(String(products[0].id));
      setSellingPrice(String(products[0].selling_price || 0));
    }
    setQuantity('1');
    setPaidAmount('0');
    setPaymentMethod('bank');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!settings?.allow_negative_stock && qty > availableStock) {
      showToast(
        `Cannot sell ${qty} units. Only ${availableStock} units available in stock.`,
        'error'
      );
      return;
    }

    setSaving(true);
    try {
      const res = await api.createSale({
        date,
        customer_id: Number(customerId),
        product_id: Number(productId),
        quantity: qty,
        selling_price: Number(sellingPrice),
        paid_amount: Number(paidAmount),
        payment_method: paymentMethod,
        notes,
      });

      showToast('Sale invoice completed! Stock deducted and customer ledger updated.');
      setIsModalOpen(false);
      triggerRefresh();
      // Prompt invoice preview
      openInvoiceView(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to record sale', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openInvoiceView = async (sale: Sale) => {
    try {
      const invoiceData = await api.getSaleInvoice(sale.id);
      setViewInvoice(invoiceData.sale);
      setInvoicePayments(invoiceData.payments || []);
    } catch {
      setViewInvoice(sale);
      setInvoicePayments([]);
    }
  };

  const handleCancelSale = async () => {
    if (!cancelConfirmId) return;
    try {
      await api.cancelSale(cancelConfirmId);
      showToast('Sale invoice cancelled! Finished product stock and ledger reversed.');
      setCancelConfirmId(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Cannot cancel sale', 'error');
    }
  };

  const filteredSales = sales.filter(
    (s) =>
      s.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search sales by invoice #, customer, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Sales Invoice</span>
        </button>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice # & Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product Sold</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
                <th className="py-3 px-4 text-right">Paid Amount</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-neutral-400">
                    {loading ? 'Loading sales invoices...' : 'No sales invoices recorded yet. Click "New Sales Invoice" to bill customers.'}
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const isCancelled = sale.status === 'cancelled';
                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-neutral-50/50 transition-colors ${
                        isCancelled ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-neutral-900">{sale.invoice_number}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{sale.date}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {sale.customer_name}
                      </td>
                      <td className="py-3 px-4 text-neutral-800">
                        {sale.product_name}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-neutral-900">
                        {sale.quantity} <span className="font-normal text-neutral-500">units</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatMoney(sale.selling_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-neutral-900">
                        {formatMoney(sale.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                        {formatMoney(sale.paid_amount)}
                        <span className="block text-[10px] text-neutral-400 capitalize">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        <span className={sale.remaining_amount > 0 ? 'text-rose-600' : 'text-neutral-500'}>
                          {formatMoney(sale.remaining_amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[11px] font-medium ${
                            isCancelled
                              ? 'text-neutral-400'
                              : sale.remaining_amount <= 0
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {isCancelled
                            ? 'Cancelled'
                            : sale.remaining_amount <= 0
                            ? 'Paid'
                            : 'Partial'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openInvoiceView(sale)}
                            title="Print / View Invoice"
                            className="p-1 text-neutral-500 hover:text-neutral-900 rounded transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {!isCancelled && (
                            <button
                              onClick={() => setCancelConfirmId(sale.id)}
                              title="Cancel Invoice & Restore Stock"
                              className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sale Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Sales Invoice"
        subtitle="Deducts finished stock, calculates COGS, and records customer payment & balance"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Customer *
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Finished Product *
              </label>
              <select
                required
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.quantity})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-neutral-500 block mt-0.5 font-mono">
                Available Stock: {availableStock} units
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Quantity to Sell *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Selling Price Per Unit *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Dynamic Invoice Calculation Summary */}
          <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Total Invoice Amount:</span>
              <span className="font-mono font-bold text-neutral-900 text-sm">
                {formatMoney(calculatedTotal)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Amount Received Now
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={calculatedTotal}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="credit">Credit (Unpaid)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
              <span className="font-medium text-neutral-700">Remaining Balance (Added to Customer Receivables):</span>
              <span className="font-mono font-bold text-neutral-900 text-sm">
                {formatMoney(calculatedRemaining)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Optional Notes / Purchase Order / Delivery Terms
            </label>
            <input
              type="text"
              placeholder="e.g. Delivered to customer warehouse, PO #892"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Processing Sale...' : 'Generate Invoice & Bill Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Invoice Modal */}
      <InvoiceModal
        isOpen={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        sale={viewInvoice}
        settings={settings}
        payments={invoicePayments}
      />

      {/* Cancel confirmation */}
      <ConfirmDialog
        isOpen={!!cancelConfirmId}
        onClose={() => setCancelConfirmId(null)}
        onConfirm={handleCancelSale}
        title="Cancel Sales Invoice"
        message="This action will restore finished product stock and reverse any recorded customer payments or cash transactions."
        confirmText="Cancel Invoice"
      />
    </div>
  );
};
