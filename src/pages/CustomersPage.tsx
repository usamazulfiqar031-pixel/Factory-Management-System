import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { Customer } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, History, ArrowDownLeft, Phone, MapPin } from 'lucide-react';

export const CustomersPage: React.FC<{ onNavigateToReceivePayment?: (customerId: number) => void }> = ({
  onNavigateToReceivePayment,
}) => {
  const { formatMoney, showToast, dataVersion, triggerRefresh } = useFactory();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      showToast(err.message || 'Error loading customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [dataVersion]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setIsFormOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone || '');
    setAddress(cust.address || '');
    setNotes(cust.notes || '');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, { name, phone, address, notes });
        showToast('Customer profile updated');
      } else {
        await api.createCustomer({ name, phone, address, notes });
        showToast('Customer created successfully');
      }
      setIsFormOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.deleteCustomer(deleteConfirmId);
      showToast('Customer deleted');
      setDeleteConfirmId(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Cannot delete customer with existing sales history', 'error');
    }
  };

  const openHistory = async (id: number) => {
    try {
      const data = await api.getCustomerHistory(id);
      setHistoryData(data);
    } catch (err: any) {
      showToast('Error loading customer ledger', 'error');
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search customers by name or phone..."
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
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4 text-right">Total Invoiced Sales</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Outstanding Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    {loading ? 'Loading customers...' : 'No customers found. Click "Add New Customer" to register clients.'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const hasDebt = cust.outstanding_balance > 0;
                  return (
                    <tr key={cust.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {cust.name}
                        {cust.notes && (
                          <span className="block text-[11px] text-neutral-400 font-normal">
                            {cust.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        {cust.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            <span>{cust.phone}</span>
                          </div>
                        )}
                        {cust.address && (
                          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                            <MapPin className="w-3 h-3 text-neutral-400" />
                            <span className="truncate max-w-xs">{cust.address}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-neutral-900">
                        {formatMoney(cust.total_sales)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                        {formatMoney(cust.total_payments)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                        <span className={hasDebt ? 'text-rose-600' : 'text-neutral-500'}>
                          {formatMoney(cust.outstanding_balance)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasDebt && onNavigateToReceivePayment && (
                            <button
                              onClick={() => onNavigateToReceivePayment(cust.id)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-medium text-[11px] transition-colors inline-flex items-center gap-1"
                            >
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>Receive Pay</span>
                            </button>
                          )}
                          <button
                            onClick={() => openHistory(cust.id)}
                            title="View Sales & Payment Ledger"
                            className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(cust)}
                            title="Edit Customer"
                            className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(cust.id)}
                            title="Delete"
                            className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Register New Customer'}
        subtitle="Customer directory maintains sales history and accounts receivable balances"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Customer Name / Business Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Modern Living Furniture, John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              placeholder="+1 (555) 012-3456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Delivery Address / Warehouse
            </label>
            <input
              type="text"
              placeholder="e.g. 742 Broadway St, Suite 400"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Preferred distributor, 30-day payment cycle"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Register Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Ledger History Modal */}
      {historyData && (
        <Modal
          isOpen={!!historyData}
          onClose={() => setHistoryData(null)}
          title={`Ledger: ${historyData.customer.name}`}
          subtitle={`Total Sales: ${formatMoney(historyData.summary.total_sales)} · Total Payments: ${formatMoney(historyData.summary.total_payments)} · Balance Due: ${formatMoney(historyData.summary.outstanding_balance)}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs">
            {/* Sales Invoices */}
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Sales Invoices</h4>
              {historyData.sales.length === 0 ? (
                <p className="text-neutral-400 italic">No sales invoices billed to this customer.</p>
              ) : (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-medium">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Invoice #</th>
                        <th className="p-2">Product</th>
                        <th className="p-2 text-right">Quantity</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2 text-right">Paid</th>
                        <th className="p-2 text-right">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {historyData.sales.map((s: any) => (
                        <tr key={s.id}>
                          <td className="p-2 font-mono">{s.date}</td>
                          <td className="p-2 font-mono font-medium">{s.invoice_number}</td>
                          <td className="p-2">{s.product_name}</td>
                          <td className="p-2 text-right font-mono">{s.quantity}</td>
                          <td className="p-2 text-right font-mono font-semibold">{formatMoney(s.total_amount)}</td>
                          <td className="p-2 text-right font-mono text-emerald-700">{formatMoney(s.paid_amount)}</td>
                          <td className="p-2 text-right font-mono font-bold text-rose-700">{formatMoney(s.remaining_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payments */}
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Payment Receipts</h4>
              {historyData.payments.length === 0 ? (
                <p className="text-neutral-400 italic">No payments received from this customer yet.</p>
              ) : (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-medium">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Receipt #</th>
                        <th className="p-2">Method</th>
                        <th className="p-2">Notes</th>
                        <th className="p-2 text-right">Amount Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {historyData.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2 font-mono">{p.date}</td>
                          <td className="p-2 font-mono font-medium">{p.payment_number}</td>
                          <td className="p-2 capitalize">{p.payment_method}</td>
                          <td className="p-2 text-neutral-500">{p.notes || '-'}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-700">{formatMoney(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete Customer Profile"
        message="Cannot delete customers who have recorded sales or payments in their ledger."
        confirmText="Delete Customer"
      />
    </div>
  );
};
