import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { Product, Material } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Trash,
  Power
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const {
    formatMoney,
    showToast,
    dataVersion,
    triggerRefresh
  } = useFactory();

  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] =
    useState<number | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] =
    useState('0');
  const [productionCost, setProductionCost] =
    useState('0');
  const [initialQuantity, setInitialQuantity] =
    useState('0');
  const [isActive, setIsActive] =
    useState(true);

  const [bomItems, setBomItems] =
    useState<
      Array<{
        material_id: number;
        quantity_required: string;
      }>
    >([]);

  const [saving, setSaving] =
    useState(false);

  const loadData = async () => {
    setLoading(true);

    try {
      const [
        prodData,
        matData
      ] = await Promise.all([
        api.getProducts(),
        api.getMaterials(),
      ]);

      setProducts(prodData);

      setRawMaterials(
        matData.filter(
          (m) => m.is_active === 1
        )
      );
    } catch (err: any) {
      showToast(
        err.message ||
          'Error loading product catalog',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion]);

  const openCreateModal = () => {
    setEditingProduct(null);

    setName('');
    setSellingPrice('0');
    setProductionCost('0');
    setInitialQuantity('0');
    setIsActive(true);

    // Default with 1 empty BOM row
    if (rawMaterials.length > 0) {
      setBomItems([
        {
          material_id:
            rawMaterials[0].id,
          quantity_required: '1'
        }
      ]);
    } else {
      setBomItems([]);
    }

    setIsFormOpen(true);
  };

  const openEditModal = (
    prod: Product
  ) => {
    setEditingProduct(prod);

    setName(prod.name);
    setSellingPrice(
      String(prod.selling_price)
    );

    setProductionCost(
      String(prod.production_cost)
    );

    setIsActive(
      prod.is_active === 1
    );

    if (
      prod.bom &&
      prod.bom.length > 0
    ) {
      setBomItems(
        prod.bom.map((b) => ({
          material_id: b.material_id,
          quantity_required:
            String(
              b.quantity_required
            )
        }))
      );
    } else {
      setBomItems([]);
    }

    setIsFormOpen(true);
  };

  const addBomRow = () => {
    if (
      rawMaterials.length === 0
    ) {
      return;
    }

    setBomItems([
      ...bomItems,
      {
        material_id:
          rawMaterials[0].id,
        quantity_required: '1'
      }
    ]);
  };

  const updateBomRow = (
    index: number,
    field:
      | 'material_id'
      | 'quantity_required',
    value: any
  ) => {
    const updated = [
      ...bomItems
    ];

    updated[index] = {
      ...updated[index],
      [field]: value
    };

    setBomItems(updated);

    // Auto-update calculated production cost
    let calculatedCost = 0;

    for (
      const item of updated
    ) {
      const mat =
        rawMaterials.find(
          (m) =>
            m.id ===
            Number(
              item.material_id
            )
        );

      if (mat) {
        calculatedCost +=
          (Number(
            item.quantity_required
          ) || 0) *
          (mat.purchase_price ||
            0);
      }
    }

    setProductionCost(
      String(
        Number(
          calculatedCost.toFixed(2)
        )
      )
    );
  };

  const removeBomRow = (
    index: number
  ) => {
    const updated =
      bomItems.filter(
        (_, idx) =>
          idx !== index
      );

    setBomItems(updated);
  };

  const handleSave = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setSaving(true);

    try {
      const bomPayload =
        bomItems
          .filter(
            (item) =>
              item.material_id &&
              Number(
                item.quantity_required
              ) > 0
          )
          .map((item) => ({
            material_id:
              Number(
                item.material_id
              ),
            quantity_required:
              Number(
                item.quantity_required
              )
          }));

      if (editingProduct) {
        await api.updateProduct(
          editingProduct.id,
          {
            name,
            selling_price:
              Number(
                sellingPrice
              ),
            production_cost:
              Number(
                productionCost
              ),
            is_active:
              isActive,
            bom:
              bomPayload
          }
        );

        showToast(
          'Product and BOM updated successfully'
        );
      } else {
        await api.createProduct({
          name,
          selling_price:
            Number(
              sellingPrice
            ),
          production_cost:
            Number(
              productionCost
            ),
          initial_quantity:
            Number(
              initialQuantity
            ),
          bom:
            bomPayload
        });

        showToast(
          'Product and Bill of Materials created successfully'
        );
      }

      setIsFormOpen(false);

      triggerRefresh();
    } catch (err: any) {
      showToast(
        err.message ||
          'Failed to save product',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // Activate / Deactivate product
  const handleToggleStatus = async (
    prod: Product
  ) => {
    try {
      const newStatus =
        prod.is_active !== 1;

      await api.toggleProductStatus(
        prod.id,
        newStatus
      );

      showToast(
        newStatus
          ? 'Product activated successfully'
          : 'Product deactivated successfully'
      );

      triggerRefresh();
    } catch (err: any) {
      showToast(
        err.message ||
          'Failed to update product status',
        'error'
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) {
      return;
    }

    try {
      await api.deleteProduct(
        deleteConfirmId
      );

      showToast(
        'Product removed or deactivated'
      );

      setDeleteConfirmId(null);

      triggerRefresh();
    } catch (err: any) {
      showToast(
        err.message ||
          'Failed to delete product',
        'error'
      );
    }
  };

  const filteredProducts =
    products.filter((p) =>
      p.name
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        )
    );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />

          <input
            type="text"
            placeholder="Search finished products..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
            className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <button
          onClick={
            openCreateModal
          }
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />

          <span>
            New Product & BOM
          </span>
        </button>
      </div>

      {/* Products Inventory & BOM Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs">

            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">

              <tr>
                <th className="py-3 px-4">
                  Finished Product
                </th>

                <th className="py-3 px-4">
                  Bill of Materials (BOM per unit)
                </th>

                <th className="py-3 px-4 text-right">
                  Available Stock
                </th>

                <th className="py-3 px-4 text-right">
                  Unit Production Cost
                </th>

                <th className="py-3 px-4 text-right">
                  Selling Price
                </th>

                <th className="py-3 px-4 text-right">
                  Inventory Valuation
                </th>

                <th className="py-3 px-4 text-center">
                  Status
                </th>

                <th className="py-3 px-4 text-right">
                  Actions
                </th>
              </tr>

            </thead>

            <tbody className="divide-y divide-neutral-100 text-neutral-700">

              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-neutral-400"
                  >
                    {loading
                      ? 'Loading catalog...'
                      : 'No products found. Click "New Product & BOM" to add your manufactured goods.'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map(
                  (prod) => (
                    <tr
                      key={prod.id}
                      className="hover:bg-neutral-50/50 transition-colors"
                    >

                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {prod.name}
                      </td>

                      <td className="py-3 px-4 text-neutral-600 max-w-xs">

                        {prod.bom &&
                        prod.bom.length >
                          0 ? (
                          <div className="flex flex-wrap gap-1 text-[11px]">

                            {prod.bom.map(
                              (
                                b,
                                i
                              ) => (
                                <span
                                  key={
                                    i
                                  }
                                  className="inline-flex items-center text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded"
                                >
                                  {
                                    b.material_name
                                  }
                                  :{' '}
                                  {
                                    b.quantity_required
                                  }{' '}
                                  {
                                    b.material_unit
                                  }
                                </span>
                              )
                            )}

                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">
                            No BOM defined
                          </span>
                        )}

                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-neutral-900">
                        {prod.quantity}{' '}
                        <span className="text-neutral-500 font-normal">
                          units
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatMoney(
                          prod.production_cost ||
                            prod.calculated_bom_cost
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-neutral-900">
                        {formatMoney(
                          prod.selling_price
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-neutral-900">
                        {formatMoney(
                          prod.stock_value
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">

                        <span
                          className={`text-[11px] font-medium ${
                            prod.is_active
                              ? 'text-emerald-700'
                              : 'text-neutral-400'
                          }`}
                        >
                          {prod.is_active
                            ? 'Active'
                            : 'Inactive'}
                        </span>

                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">

                        <div className="flex items-center justify-end gap-1">

                          {/* Activate / Deactivate */}
                          <button
                            onClick={() =>
                              handleToggleStatus(
                                prod
                              )
                            }
                            title={
                              prod.is_active
                                ? 'Deactivate Product'
                                : 'Activate Product'
                            }
                            className={`p-1 rounded transition-colors ${
                              prod.is_active
                                ? 'text-neutral-400 hover:text-amber-600'
                                : 'text-neutral-400 hover:text-emerald-600'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() =>
                              openEditModal(
                                prod
                              )
                            }
                            title="Edit Product & BOM"
                            className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() =>
                              setDeleteConfirmId(
                                prod.id
                              )
                            }
                            title="Delete / Deactivate"
                            className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() =>
          setIsFormOpen(false)
        }
        title={
          editingProduct
            ? `Edit Product: ${editingProduct.name}`
            : 'Create Finished Product'
        }
        subtitle="Specify product prices and define required Bill of Materials (BOM)"
        maxWidth="xl"
      >

        <form
          onSubmit={handleSave}
          className="space-y-4"
        >

          <div>

            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Product Name *
            </label>

            <input
              type="text"
              required
              placeholder="e.g. Wooden Dining Table, Office Chair"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />

          </div>

          <div className="grid grid-cols-2 gap-3">

            <div>

              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Selling Price *
              </label>

              <input
                type="number"
                step="any"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) =>
                  setSellingPrice(
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />

            </div>

            <div>

              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Standard Production Cost *
              </label>

              <input
                type="number"
                step="any"
                min="0"
                required
                value={productionCost}
                onChange={(e) =>
                  setProductionCost(
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />

              <span className="text-[10px] text-neutral-400 block mt-0.5">
                Auto-calculated from BOM or set manually
              </span>

            </div>

          </div>

          {/* Initial quantity only for new product */}
          {!editingProduct && (
            <div>

              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Initial Finished Stock Available
              </label>

              <input
                type="number"
                step="any"
                min="0"
                value={initialQuantity}
                onChange={(e) =>
                  setInitialQuantity(
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />

            </div>
          )}

          {/* BILL OF MATERIALS SECTION */}
          <div className="pt-2 border-t border-neutral-200">

            <div className="flex items-center justify-between mb-2">

              <div>

                <span className="text-xs font-semibold text-neutral-900 block">
                  Bill of Materials (BOM)
                </span>

                <span className="text-[11px] text-neutral-500">
                  Exact raw materials required to produce 1 unit of this finished product
                </span>

              </div>

              <button
                type="button"
                onClick={addBomRow}
                className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />

                <span>
                  Add Material
                </span>
              </button>

            </div>

            {bomItems.length === 0 ? (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-center text-xs text-neutral-500">
                No materials assigned yet. Click "Add Material" to define BOM.
              </div>
            ) : (
              <div className="space-y-2">

                {bomItems.map(
                  (
                    item,
                    idx
                  ) => {

                    const selectedMat =
                      rawMaterials.find(
                        (m) =>
                          m.id ===
                          Number(
                            item.material_id
                          )
                      );

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2"
                      >

                        <select
                          value={
                            item.material_id
                          }
                          onChange={(e) =>
                            updateBomRow(
                              idx,
                              'material_id',
                              Number(
                                e.target.value
                              )
                            )
                          }
                          className="flex-1 px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        >

                          {rawMaterials.map(
                            (m) => (
                              <option
                                key={
                                  m.id
                                }
                                value={
                                  m.id
                                }
                              >
                                {m.name} (
                                {
                                  m.unit
                                }) -{' '}
                                {formatMoney(
                                  m.purchase_price
                                )}
                                /
                                {
                                  m.unit
                                }
                              </option>
                            )
                          )}

                        </select>

                        <div className="w-32 flex items-center gap-1">

                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            required
                            value={
                              item.quantity_required
                            }
                            onChange={(e) =>
                              updateBomRow(
                                idx,
                                'quantity_required',
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg text-xs font-mono text-right focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            placeholder="Qty"
                          />

                          <span className="text-xs text-neutral-500 w-10">
                            {
                              selectedMat?.unit ||
                              ''
                            }
                          </span>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeBomRow(
                              idx
                            )
                          }
                          className="p-1.5 text-neutral-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash className="w-4 h-4" />
                        </button>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

          {/* Form buttons */}
          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">

            <button
              type="button"
              onClick={() =>
                setIsFormOpen(false)
              }
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : editingProduct
                  ? 'Update Product'
                  : 'Save Product'}
            </button>

          </div>

        </form>

      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={
          !!deleteConfirmId
        }
        onClose={() =>
          setDeleteConfirmId(null)
        }
        onConfirm={
          handleDelete
        }
        title="Remove or Deactivate Product"
        message="If this product has been manufactured or sold, it will be deactivated to keep historical invoices intact."
        confirmText="Confirm"
      />

    </div>
  );
};