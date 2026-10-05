import React from 'react';
import { Modal } from './Modal';
import { Sale, Settings } from '../types';
import { Printer, Download, CheckCircle, Clock } from 'lucide-react';
import { useFactory } from '../context/FactoryContext';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  settings?: Settings | null;
  payments?: any[];
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  settings: propSettings,
  payments = [],
}) => {
  const { settings: ctxSettings, formatMoney } = useFactory();
  const settings = propSettings || ctxSettings;

  if (!sale) return null;

  const isFullyPaid = sale.remaining_amount <= 0;
  const isPartial = sale.paid_amount > 0 && sale.remaining_amount > 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sales Tax Invoice" maxWidth="2xl">
      <div className="printable-invoice">
        {/* Printable Paper Canvas */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 sm:p-8 space-y-6 text-neutral-800">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-neutral-200 pb-6 gap-4">
            <div>
              <div className="text-xl font-bold tracking-tight text-neutral-900">
                {settings?.factory_name || 'Manufacturing Plant'}
              </div>
              <div className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                {settings?.address || 'Industrial District, Sector 4'}<br />
                Phone: {settings?.phone || 'N/A'}
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                COMMERCIAL INVOICE
              </span>
              <div className="text-lg font-mono font-semibold text-neutral-900 mt-0.5">
                {sale.invoice_number}
              </div>
              <div className="text-xs text-neutral-500 mt-1 font-mono">
                Date: {sale.date}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border"
                style={{
                  backgroundColor: isFullyPaid ? '#ECFDF5' : isPartial ? '#FFFBEB' : '#FEF2F2',
                  borderColor: isFullyPaid ? '#A7F3D0' : isPartial ? '#FDE68A' : '#FECACA',
                  color: isFullyPaid ? '#065F46' : isPartial ? '#92400E' : '#991B1B',
                }}
              >
                {isFullyPaid ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                <span>{isFullyPaid ? 'PAID IN FULL' : isPartial ? 'PARTIALLY PAID' : 'UNPAID'}</span>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
              <span className="text-neutral-400 uppercase font-semibold tracking-wider block mb-1">
                Billed To (Customer):
              </span>
              <div className="font-semibold text-sm text-neutral-900">{sale.customer_name}</div>
              {sale.customer_phone && <div className="text-neutral-600 mt-0.5">Phone: {sale.customer_phone}</div>}
              {sale.customer_address && <div className="text-neutral-600 mt-0.5">{sale.customer_address}</div>}
            </div>

            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
              <span className="text-neutral-400 uppercase font-semibold tracking-wider block mb-1">
                Payment Terms & Method:
              </span>
              <div className="text-neutral-900 font-medium capitalize">
                Method: {sale.payment_method}
              </div>
              <div className="text-neutral-500 mt-0.5">
                Recorded by: {sale.created_by || 'Admin'}
              </div>
              {sale.notes && (
                <div className="text-neutral-500 mt-1 italic">
                  Note: {sale.notes}
                </div>
              )}
            </div>
          </div>

          {/* Product Items Table */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100/70 border-b border-neutral-200 text-neutral-600 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                <tr>
                  <td className="py-3 px-3">
                    <div className="font-medium text-neutral-900">{sale.product_name || 'Finished Product'}</div>
                    <div className="text-[11px] text-neutral-500">Manufactured standard production unit</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-medium">
                    {sale.quantity}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {formatMoney(sale.selling_price)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-neutral-900">
                    {formatMoney(sale.total_amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-neutral-600">
                <span>Subtotal:</span>
                <span className="font-mono tabular-nums">{formatMoney(sale.total_amount)}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-600 border-t border-neutral-100">
                <span>Amount Paid:</span>
                <span className="font-mono tabular-nums font-medium text-emerald-600">
                  - {formatMoney(sale.paid_amount)}
                </span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold text-neutral-900 border-t-2 border-neutral-200">
                <span>Balance Due:</span>
                <span className={`font-mono tabular-nums ${sale.remaining_amount > 0 ? 'text-rose-600' : 'text-neutral-900'}`}>
                  {formatMoney(sale.remaining_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History on this invoice if any */}
          {payments.length > 0 && (
            <div className="pt-4 border-t border-neutral-100 text-xs">
              <span className="text-neutral-400 uppercase font-semibold tracking-wider block mb-2">
                Recorded Payment Receipts:
              </span>
              <div className="space-y-1 font-mono text-[11px]">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex justify-between text-neutral-600">
                    <span>{p.date} · {p.payment_number} ({p.payment_method}):</span>
                    <span className="text-neutral-900 font-semibold">{formatMoney(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Signatures */}
          <div className="pt-8 border-t border-neutral-200 grid grid-cols-2 gap-8 text-center text-xs text-neutral-500">
            <div>
              <div className="border-b border-neutral-300 w-36 mx-auto mb-1"></div>
              <span>Authorized Signature</span>
            </div>
            <div>
              <div className="border-b border-neutral-300 w-36 mx-auto mb-1"></div>
              <span>Customer Acknowledgment</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-between no-print pt-2">
          <span className="text-xs text-neutral-500">
            Official receipt for inventory delivery and commercial ledger records.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
