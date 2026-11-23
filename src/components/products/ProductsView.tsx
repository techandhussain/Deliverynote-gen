import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Package,
  Layers,
  Sparkles,
  ArrowUpDown,
  Tag,
} from 'lucide-react';
import { db } from '../../db/db';
import { formatCurrency, generateId } from '../../utils/formatters';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { ProductModal } from './ProductModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { Product } from '../../types';

interface ProductsViewProps {
  onNavigateToCreateDelivery?: (selectedProductId?: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ onNavigateToCreateDelivery }) => {
  const { settings } = useSettings();
  const toast = useToast();

  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortField, setSortField] = useState<'name' | 'stock' | 'price' | 'updatedAt'>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search filter
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          p.name.toLowerCase().includes(term) ||
          (p.sku && p.sku.toLowerCase().includes(term)) ||
          (p.description && p.description.toLowerCase().includes(term));

        // Category filter
        const matchesCategory =
          selectedCategory === 'all' || (p.category && p.category.trim() === selectedCategory);

        // Stock filter
        let matchesStock = true;
        if (settings.inventoryTracking && p.stock !== undefined) {
          if (stockFilter === 'in_stock') matchesStock = p.stock > 0;
          if (stockFilter === 'low_stock') matchesStock = p.stock > 0 && p.stock <= 5;
          if (stockFilter === 'out_of_stock') matchesStock = p.stock === 0;
        }

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'name') {
          valA = (valA || '').toLowerCase();
          valB = (valB || '').toLowerCase();
        } else {
          valA = valA ?? 0;
          valB = valB ?? 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [products, searchTerm, selectedCategory, stockFilter, sortField, sortDirection, settings.inventoryTracking]);

  const handleEdit = (product: Product) => {
    setProductToEdit(product);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setProductToEdit(null);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await db.products.delete(productToDelete.id);
      toast.success('Product Deleted', `"${productToDelete.name}" has been removed from catalogue.`);
      setProductToDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Delete Failed', 'Could not delete product from local database.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSort = (field: 'name' | 'stock' | 'price' | 'updatedAt') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Populate sample products for quick business evaluation if empty
  const handleLoadSampleProducts = async () => {
    const samples: Omit<Product, 'id'>[] = [
      {
        name: 'Ergonomic Office Chair',
        sku: 'FURN-CHR-01',
        category: 'Office Furniture',
        price: 189.99,
        stock: 14,
        description: 'High-back mesh ergonomic desk chair with lumbar support and 3D armrests.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: '4K Ultra-HD Monitor 27"',
        sku: 'ELEC-MON-27',
        category: 'Electronics',
        price: 329.5,
        stock: 8,
        description: 'IPS display with HDR400, USB-C 65W power delivery, and tilt/swivel stand.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'Wireless Mechanical Keyboard',
        sku: 'ACC-KEY-09',
        category: 'Accessories',
        price: 79.0,
        stock: 25,
        description: 'Hot-swappable tactile switches with RGB backlighting and Bluetooth 5.0.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'Heavy-Duty Packaging Boxes (Pack of 25)',
        sku: 'PKG-BOX-25',
        category: 'Packaging',
        price: 42.0,
        stock: 50,
        description: 'Double-walled corrugated shipping cartons, size 16x12x10 inches.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'Commercial Thermal Label Printer',
        sku: 'LOG-PRN-02',
        category: 'Logistics Hardware',
        price: 149.0,
        stock: 3,
        description: 'High speed direct thermal 4x6 label printer compatible with all carriers.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    try {
      for (const item of samples) {
        await db.products.add({
          ...item,
          id: generateId('prod'),
        });
      }
      toast.success('Sample Catalogue Loaded', 'Added 5 sample products for demonstration.');
    } catch (err) {
      console.error('Failed to load sample products:', err);
      toast.error('Error', 'Failed to load sample products.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Products Catalogue</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your items, pricing, SKU codes, and inventory levels
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {products.length === 0 && (
            <button
              type="button"
              onClick={handleLoadSampleProducts}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Load Sample Catalogue</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name, SKU, or specs..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 p-1"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stock Filter (if inventory tracking is enabled) */}
          {settings.inventoryTracking && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">All Stock Status</option>
                <option value="in_stock">In Stock (&gt; 0)</option>
                <option value="low_stock">Low Stock (≤ 5)</option>
                <option value="out_of_stock">Out of Stock (0)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {products.length === 0 ? (
        /* Empty Catalogue State */
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Your Product Catalogue is Empty</h3>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-6 leading-relaxed">
            Get started by adding your products. You will be able to select them seamlessly when creating
            deliveries, track their stock levels, and include them in delivery notes.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-blue-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Product</span>
            </button>
            <button
              type="button"
              onClick={handleLoadSampleProducts}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Load 5 Demo Products</span>
            </button>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Filter / Search yielded zero results */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No matching products found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            No products match "{searchTerm}" with the active filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setStockFilter('all');
            }}
            className="px-4 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Products Table & Responsive Mobile Cards */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Product</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">SKU / ID</th>
                  <th className="py-3 px-4">Category</th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => toggleSort('price')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Price</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  {settings.inventoryTracking && (
                    <th
                      className="py-3 px-4 text-center cursor-pointer hover:text-slate-800 transition-colors"
                      onClick={() => toggleSort('stock')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Available Stock</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  )}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProducts.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Product Name & Image */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-400 shrink-0">
                              <Package className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                              {p.name}
                            </p>
                            {p.description && (
                              <p className="text-xs text-slate-400 truncate max-w-xs">{p.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 px-4">
                        {p.sku ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200/60">
                            {p.sku}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        {p.category ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/50">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {p.category}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                        {p.price !== undefined ? formatCurrency(p.price, settings.currency) : (
                          <span className="text-xs text-slate-400 italic">Not set</span>
                        )}
                      </td>

                      {/* Available Stock */}
                      {settings.inventoryTracking && (
                        <td className="py-3.5 px-4 text-center">
                          {p.stock !== undefined ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                p.stock === 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : p.stock <= 5
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  p.stock === 0 ? 'bg-rose-500' : p.stock <= 5 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                              />
                              {p.stock} in stock
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Untracked</span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onNavigateToCreateDelivery && (
                            <button
                              type="button"
                              onClick={() => onNavigateToCreateDelivery(p.id)}
                              className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors mr-1"
                              title="Create delivery with this product"
                            >
                              Deliver
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEdit(p)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            aria-label="Edit product"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            aria-label="Delete product"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredProducts.map((p) => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{p.name}</h4>
                      {p.sku && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200/60 mt-0.5">
                          {p.sku}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 text-sm">
                      {p.price !== undefined ? formatCurrency(p.price, settings.currency) : '-'}
                    </p>
                    {p.category && <p className="text-xs text-slate-400 mt-0.5">{p.category}</p>}
                  </div>
                </div>

                {p.description && <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  {settings.inventoryTracking && p.stock !== undefined ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        p.stock === 0
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : p.stock <= 5
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {p.stock} in stock
                    </span>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-1">
                    {onNavigateToCreateDelivery && (
                      <button
                        type="button"
                        onClick={() => onNavigateToCreateDelivery(p.id)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg"
                      >
                        Deliver
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductToDelete(p)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Count Bar */}
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {filteredProducts.length} of {products.length} products
            </span>
            <span className="font-medium text-slate-600">
              {filteredProducts.filter((p) => (p.stock ?? 0) > 0).length} items in stock
            </span>
          </div>
        </div>
      )}

      {/* Product Add / Edit Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productToEdit={productToEdit}
        onSaved={() => {}}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? Existing historical deliveries will preserve this product's name and price snapshot.`}
        confirmLabel="Delete Product"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
