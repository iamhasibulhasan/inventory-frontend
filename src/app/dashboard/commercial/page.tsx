'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { commercialAPI, suppliersAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, FormField, Tabs, EmptyState, Badge } from '@/components/ui';
import { Plus, Box, Tag, Sliders, Layers, Ruler, AlertTriangle, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';

type Row = Record<string, unknown>;

export default function CommercialPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState(searchParams.get('tab') || 'product');
  const changeTab = (t: string) => { setTab(t); router.push(`?tab=${t}`, { scroll: false }); };

  const [products, setProducts] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [attributes, setAttributes] = useState<Row[]>([]);
  const [uoms, setUoms] = useState<Row[]>([]);
  const [suppliers, setSuppliers] = useState<Row[]>([]);
  const [variants, setVariants] = useState<Row[]>([]);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  const [prodForm, setProdForm] = useState<Row>({ vat_rate: '15', has_variants: false, has_expiry: false, has_serial: false, min_stock_level: 10 });
  const [catForm, setCatForm] = useState({ name: '', parent_id: '' });
  const [uomForm, setUomForm] = useState({ name: '', symbol: '', uom_type: '' });
  const [attrForm, setAttrForm] = useState({ name: '', newValue: '' });
  const [variantForm, setVariantForm] = useState({ sku: '', purchase_price: '', selling_price: '', attribute_value_ids: [] as string[] });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catR, uomR, attrR, supR] = await Promise.all([
        commercialAPI.getCategories(), commercialAPI.getUOM(),
        commercialAPI.getAttributes(), suppliersAPI.getAll()
      ]);
      setCategories(catR.data.data); setUoms(uomR.data.data);
      setAttributes(attrR.data.data); setSuppliers(supR.data.data);
    } catch { } finally { setLoading(false); }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await commercialAPI.getProducts({ page: 1, limit: 50 });
      setProducts(r.data.data);
    } catch { toast.error('Failed to load products'); } finally { setLoading(false); }
  }, []);

  const fetchVariants = useCallback(async () => {
    if (!selectedProductForVariant) return;
    setLoading(true);
    try {
      const r = await commercialAPI.getVariants(selectedProductForVariant.id as string);
      setVariants(r.data.data);
    } catch { } finally { setLoading(false); }
  }, [selectedProductForVariant]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (tab === 'product' || tab === 'variant') fetchProducts();
    else setLoading(false);
  }, [tab, fetchProducts]);
  useEffect(() => { if (tab === 'variant' && selectedProductForVariant) fetchVariants(); }, [tab, selectedProductForVariant, fetchVariants]);

  const handleSaveProduct = async () => {
    if (!prodForm.name || !prodForm.sku) return toast.error('Name and SKU required');
    setSaving(true);
    try {
      if (selected) await commercialAPI.updateProduct(selected.id as string, prodForm);
      else await commercialAPI.createProduct(prodForm);
      toast.success(selected ? 'Product updated' : 'Product created');
      setModal(null); fetchProducts();
    } catch (e: unknown) { toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleSaveCategory = async () => {
    if (!catForm.name) return toast.error('Name required');
    setSaving(true);
    try {
      if (selected) await commercialAPI.updateCategory(selected.id as string, catForm);
      else await commercialAPI.createCategory(catForm);
      toast.success('Saved'); setModal(null); fetchAll();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  const handleSaveUOM = async () => {
    if (!uomForm.name || !uomForm.symbol) return toast.error('Name and symbol required');
    setSaving(true);
    try {
      if (selected) await commercialAPI.updateUOM(selected.id as string, uomForm);
      else await commercialAPI.createUOM(uomForm);
      toast.success('Saved'); setModal(null); fetchAll();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  const handleSaveAttribute = async () => {
    if (!attrForm.name) return toast.error('Attribute name required');
    setSaving(true);
    try {
      await commercialAPI.createAttribute({ name: attrForm.name });
      toast.success('Attribute created'); setModal(null); fetchAll();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  const addAttrValue = async (attrId: string, value: string) => {
    if (!value.trim()) return;
    try { await commercialAPI.addAttributeValue(attrId, { value }); toast.success('Value added'); fetchAll(); }
    catch { toast.error('Failed'); }
  };

  const handleSaveVariant = async () => {
    if (!selectedProductForVariant) return toast.error('Select a product first');
    if (!variantForm.sku) return toast.error('Variant SKU required');
    setSaving(true);
    try {
      await commercialAPI.createVariant(selectedProductForVariant.id as string, variantForm);
      toast.success('Variant created'); setModal(null); fetchVariants();
    } catch (e: unknown) { toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleAttrValue = (id: string) => {
    setVariantForm(f => ({
      ...f,
      attribute_value_ids: f.attribute_value_ids.includes(id)
        ? f.attribute_value_ids.filter(x => x !== id)
        : [...f.attribute_value_ids, id]
    }));
  };

  const TABS = [
    { key: 'product', label: '📦 Product' },
    { key: 'variant', label: '🎨 Product Variant' },
    { key: 'category', label: '🏷️ Category' },
    { key: 'attribute', label: '⚙️ Attributes' },
    { key: 'uom', label: '📏 Unit of Measure' },
  ];

  const productColumns = [
    {
      key: 'name', label: 'Product',
      render: (r: Row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{r.name as string}</p>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{r.sku as string}</p>
        </div>
      )
    },
    { key: 'category_name', label: 'Category', render: (r: Row) => <Badge variant="info">{(r.category_name as string) || '—'}</Badge> },
    { key: 'supplier_name', label: 'Supplier', render: (r: Row) => <span className="text-xs text-gray-500">{(r.supplier_name as string) || '—'}</span> },
    { key: 'purchase_price', label: 'Cost', render: (r: Row) => <span className="text-sm">৳{Number(r.purchase_price).toLocaleString()}</span> },
    { key: 'selling_price', label: 'Price', render: (r: Row) => <span className="font-semibold">৳{Number(r.selling_price).toLocaleString()}</span> },
    { key: 'vat_rate', label: 'VAT', render: (r: Row) => <span>{r.vat_rate as string}%</span> },
    {
      key: 'stock_qty', label: 'Stock', render: (r: Row) => {
        const qty = Number(r.stock_qty); const min = Number(r.min_stock_level);
        return <div className="flex items-center gap-1.5">
          <span className={qty <= min ? 'text-red-500 font-bold' : 'font-medium'}>{qty}</span>
          {qty <= min && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />}
        </div>;
      }
    },
    { key: 'has_variants', label: 'Variants', render: (r: Row) => r.has_variants ? <Badge variant="purple">Multi-variant</Badge> : <span className="text-gray-400 text-xs">Simple</span> },
    {
      key: 'has_expiry', label: 'Flags', render: (r: Row) => (
        <div className="flex gap-1">
          {r.has_expiry && <Badge variant="warning">Exp</Badge>}
          {r.has_serial && <Badge variant="info">Serial</Badge>}
        </div>
      )
    },
    { key: 'is_active', label: 'Status', render: (r: Row) => <StatusBadge status={(r.is_active as boolean) ? 'active' : 'inactive'} /> },
    {
      key: 'actions', label: '',
      render: (r: Row) => (
        <button onClick={e => { e.stopPropagation(); setSelected(r); setProdForm({ ...r }); setModal('editProduct'); }}
          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
      )
    },
  ];

  const variantColumns = [
    { key: 'sku', label: 'Variant SKU', render: (r: Row) => <span className="font-mono font-medium">{r.sku as string}</span> },
    {
      key: 'attributes', label: 'Attributes', render: (r: Row) => (
        <div className="flex flex-wrap gap-1">
          {((r.attributes as Row[]) || []).filter(a => a.attribute).map((a, i) => (
            <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {a.attribute as string}: <strong>{a.value as string}</strong>
            </span>
          ))}
        </div>
      )
    },
    { key: 'purchase_price', label: 'Cost', render: (r: Row) => r.purchase_price ? <span>৳{Number(r.purchase_price).toLocaleString()}</span> : <span className="text-gray-400">—</span> },
    { key: 'selling_price', label: 'Price', render: (r: Row) => r.selling_price ? <span className="font-semibold">৳{Number(r.selling_price).toLocaleString()}</span> : <span className="text-gray-400">—</span> },
    { key: 'is_active', label: 'Status', render: (r: Row) => <StatusBadge status={(r.is_active as boolean) ? 'active' : 'inactive'} /> },
  ];

  return (
    <div>
      <PageHeader title="Commercial" subtitle="Products, variants, categories, attributes & units"
        actions={
          tab === 'product' ? (
            <button className="btn-primary" onClick={() => { setSelected(null); setProdForm({ vat_rate: '15', has_variants: false, has_expiry: false, has_serial: false, min_stock_level: 10 }); setModal('product'); }}>
              <Plus className="w-4 h-4" /> Add Product
            </button>
          ) : tab === 'variant' && selectedProductForVariant ? (
            <button className="btn-primary" onClick={() => { setVariantForm({ sku: '', purchase_price: '', selling_price: '', attribute_value_ids: [] }); setModal('variant'); }}>
              <Plus className="w-4 h-4" /> Add Variant
            </button>
          ) : tab === 'category' ? (
            <button className="btn-primary" onClick={() => { setSelected(null); setCatForm({ name: '', parent_id: '' }); setModal('category'); }}>
              <Plus className="w-4 h-4" /> Add Category
            </button>
          ) : tab === 'uom' ? (
            <button className="btn-primary" onClick={() => { setSelected(null); setUomForm({ name: '', symbol: '', uom_type: '' }); setModal('uom'); }}>
              <Plus className="w-4 h-4" /> Add UOM
            </button>
          ) : tab === 'attribute' ? (
            <button className="btn-primary" onClick={() => { setAttrForm({ name: '', newValue: '' }); setModal('attribute'); }}>
              <Plus className="w-4 h-4" /> Add Attribute
            </button>
          ) : undefined
        }
      />

      <Tabs tabs={TABS} active={tab} onChange={changeTab} />

      {/* ===== PRODUCT TAB ===== */}
      {tab === 'product' && (
        <div className="card overflow-hidden">
          <DataTable columns={productColumns} data={products} loading={loading}
            emptyState={<EmptyState icon={<Box className="w-6 h-6" />} title="No products" description="Add your first product to start tracking inventory" />}
          />
        </div>
      )}

      {/* ===== VARIANT TAB ===== */}
      {tab === 'variant' && (
        <div className="space-y-4">
          {/* Product selector */}
          <div className="card p-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Product to Manage Variants</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {products.filter(p => p.has_variants).map(p => (
                <button key={p.id as string}
                  onClick={() => setSelectedProductForVariant(p)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${selectedProductForVariant?.id === p.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                >
                  <p className="font-medium text-sm truncate">{p.name as string}</p>
                  <p className="text-xs text-gray-400 font-mono">{p.sku as string}</p>
                </button>
              ))}
              {products.filter(p => !p.has_variants).length > 0 && (
                <div className="col-span-full">
                  <p className="text-xs text-gray-400 mt-2">Products without variants (enable "Has Variants" in product settings to add variants):</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {products.filter(p => !p.has_variants).map(p => (
                      <span key={p.id as string} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg text-gray-500">{p.name as string}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Variants table */}
          {selectedProductForVariant && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Variants: {selectedProductForVariant.name as string}</p>
                  <p className="text-xs text-gray-400 font-mono">{selectedProductForVariant.sku as string}</p>
                </div>
                <button className="btn-primary text-xs py-1.5"
                  onClick={() => { setVariantForm({ sku: '', purchase_price: '', selling_price: '', attribute_value_ids: [] }); setModal('variant'); }}>
                  <Plus className="w-3.5 h-3.5" /> Add Variant
                </button>
              </div>
              <DataTable columns={variantColumns} data={variants} loading={loading}
                emptyState={<EmptyState icon={<Layers className="w-6 h-6" />} title="No variants yet" description="Add size/color combinations" />}
              />
            </div>
          )}

          {!selectedProductForVariant && products.filter(p => p.has_variants).length === 0 && (
            <div className="card p-12 text-center">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No multi-variant products found</p>
              <p className="text-sm text-gray-400 mt-1">Enable "Has Variants" when creating a product</p>
            </div>
          )}
        </div>
      )}

      {/* ===== CATEGORY TAB ===== */}
      {tab === 'category' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? Array(6).fill(0).map((_, i) => <div key={i} className="card h-24 animate-pulse" />) :
            categories.length === 0 ? (
              <div className="col-span-3 card p-12 text-center">
                <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No categories yet</p>
              </div>
            ) : categories.map(c => (
              <div key={c.id as string} className="card p-4 flex items-center justify-between hover:shadow-card-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-brand-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{c.name as string}</p>
                    {c.parent_name && <p className="text-xs text-gray-400">↳ {c.parent_name as string}</p>}
                  </div>
                </div>
                <button onClick={() => { setSelected(c); setCatForm({ name: c.name as string, parent_id: (c.parent_id || '') as string }); setModal('editCategory'); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
        </div>
      )}

      {/* ===== ATTRIBUTE TAB ===== */}
      {tab === 'attribute' && (
        <div className="space-y-3">
          {loading ? Array(3).fill(0).map((_, i) => <div key={i} className="card h-24 animate-pulse" />) :
            attributes.length === 0 ? (
              <div className="card p-12 text-center">
                <Sliders className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No attributes yet</p>
              </div>
            ) : attributes.map(attr => (
              <div key={attr.id as string} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-brand-500" /> {attr.name as string}
                    <Badge variant="default">{((attr.values as Row[]) || []).length} values</Badge>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {((attr.values as Row[]) || []).map(v => (
                    <span key={v.id as string} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300">
                      {v.value as string}
                    </span>
                  ))}
                  <input
                    className="input !w-28 !py-1 !text-xs"
                    placeholder="+ add value"
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        await addAttrValue(attr.id as string, val);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ===== UOM TAB ===== */}
      {tab === 'uom' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading ? Array(8).fill(0).map((_, i) => <div key={i} className="card h-20 animate-pulse" />) :
            uoms.length === 0 ? (
              <div className="col-span-4 card p-12 text-center">
                <Ruler className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No units of measurement yet</p>
              </div>
            ) : uoms.map(u => (
              <div key={u.id as string} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{u.symbol as string}</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{u.name as string}</p>
                  <p className="text-xs text-gray-400">{(u.uom_type as string) || 'general'}</p>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ===== PRODUCT MODAL ===== */}
      <Modal isOpen={modal === 'product' || modal === 'editProduct'} onClose={() => setModal(null)}
        title={modal === 'editProduct' ? 'Edit Product' : 'Add Product'} size="xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FormField label="Product Name" required>
              <input className="input" value={(prodForm.name as string) || ''} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} placeholder="Samsung Galaxy A55 5G" />
            </FormField>
          </div>
          <FormField label="SKU" required>
            <input className="input" value={(prodForm.sku as string) || ''} onChange={e => setProdForm({ ...prodForm, sku: e.target.value })} placeholder="SKU-EL-001" />
          </FormField>
          <FormField label="Barcode">
            <input className="input" value={(prodForm.barcode as string) || ''} onChange={e => setProdForm({ ...prodForm, barcode: e.target.value })} />
          </FormField>
          <FormField label="Category">
            <select className="select" value={(prodForm.category_id as string) || ''} onChange={e => setProdForm({ ...prodForm, category_id: e.target.value })}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id as string} value={c.id as string}>{c.name as string}</option>)}
            </select>
          </FormField>
          <FormField label="Supplier">
            <select className="select" value={(prodForm.supplier_id as string) || ''} onChange={e => setProdForm({ ...prodForm, supplier_id: e.target.value })}>
              <option value="">Select supplier</option>
              {suppliers.map(s => <option key={s.id as string} value={s.id as string}>{s.name as string}</option>)}
            </select>
          </FormField>
          <FormField label="Unit of Measure">
            <select className="select" value={(prodForm.uom_id as string) || ''} onChange={e => setProdForm({ ...prodForm, uom_id: e.target.value })}>
              <option value="">Select UOM</option>
              {uoms.map(u => <option key={u.id as string} value={u.id as string}>{u.name as string} ({u.symbol as string})</option>)}
            </select>
          </FormField>
          <FormField label="VAT Rate (%)">
            <input type="number" className="input" value={(prodForm.vat_rate as string) || '15'} onChange={e => setProdForm({ ...prodForm, vat_rate: e.target.value })} />
          </FormField>
          <FormField label="Purchase Price (৳)" required>
            <input type="number" className="input" value={(prodForm.purchase_price as string) || ''} onChange={e => setProdForm({ ...prodForm, purchase_price: e.target.value })} placeholder="0.00" />
          </FormField>
          <FormField label="Selling Price (৳)" required>
            <input type="number" className="input" value={(prodForm.selling_price as string) || ''} onChange={e => setProdForm({ ...prodForm, selling_price: e.target.value })} placeholder="0.00" />
          </FormField>
          <FormField label="MRP (৳)">
            <input type="number" className="input" value={(prodForm.mrp as string) || ''} onChange={e => setProdForm({ ...prodForm, mrp: e.target.value })} />
          </FormField>
          <FormField label="Min Stock Level">
            <input type="number" className="input" value={(prodForm.min_stock_level as string) || '10'} onChange={e => setProdForm({ ...prodForm, min_stock_level: e.target.value })} />
          </FormField>
          <div className="col-span-2 flex items-center gap-6 pt-1">
            {([['has_expiry', 'Has Expiry Date'], ['has_serial', 'Has Serial/IMEI'], ['has_variants', 'Has Variants']] as [string, string][]).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!(prodForm[k])} onChange={e => setProdForm({ ...prodForm, [k]: e.target.checked })} className="w-4 h-4 accent-brand-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{l}</span>
              </label>
            ))}
          </div>
          <div className="col-span-2">
            <FormField label="Description">
              <textarea className="input resize-none" rows={2} value={(prodForm.description as string) || ''} onChange={e => setProdForm({ ...prodForm, description: e.target.value })} />
            </FormField>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveProduct} disabled={saving}>{saving ? 'Saving...' : selected ? 'Update' : 'Create'}</button>
        </div>
      </Modal>

      {/* ===== VARIANT MODAL ===== */}
      <Modal isOpen={modal === 'variant'} onClose={() => setModal(null)} title={`Add Variant — ${(selectedProductForVariant?.name as string) || ''}`} size="lg">
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            A variant represents a specific combination of attributes (e.g. Size: L + Color: Blue)
          </div>
          <FormField label="Variant SKU" required>
            <input className="input" value={variantForm.sku} onChange={e => setVariantForm({ ...variantForm, sku: e.target.value })} placeholder={`${(selectedProductForVariant?.sku as string) || 'SKU'}-L-BLU`} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Purchase Price (৳)">
              <input type="number" className="input" value={variantForm.purchase_price} onChange={e => setVariantForm({ ...variantForm, purchase_price: e.target.value })} placeholder="Leave blank to inherit" />
            </FormField>
            <FormField label="Selling Price (৳)">
              <input type="number" className="input" value={variantForm.selling_price} onChange={e => setVariantForm({ ...variantForm, selling_price: e.target.value })} placeholder="Leave blank to inherit" />
            </FormField>
          </div>
          <FormField label="Select Attribute Values">
            <div className="space-y-3 mt-1">
              {attributes.map(attr => (
                <div key={attr.id as string}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{attr.name as string}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {((attr.values as Row[]) || []).map(v => (
                      <button key={v.id as string} type="button"
                        onClick={() => toggleAttrValue(v.id as string)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${variantForm.attribute_value_ids.includes(v.id as string) ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
                        {v.value as string}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {variantForm.attribute_value_ids.length > 0 && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500">Selected: {variantForm.attribute_value_ids.map(id => {
                  for (const attr of attributes) {
                    const v = ((attr.values as Row[]) || []).find(v => v.id === id);
                    if (v) return `${attr.name}: ${v.value}`;
                  } return id;
                }).join(', ')}</p>
              </div>
            )}
          </FormField>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveVariant} disabled={saving}>{saving ? 'Creating...' : 'Create Variant'}</button>
        </div>
      </Modal>

      {/* ===== CATEGORY MODAL ===== */}
      <Modal isOpen={modal === 'category' || modal === 'editCategory'} onClose={() => setModal(null)} title={modal === 'editCategory' ? 'Edit Category' : 'Add Category'}>
        <div className="space-y-4">
          <FormField label="Name" required><input className="input" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Electronics" /></FormField>
          <FormField label="Parent Category">
            <select className="select" value={catForm.parent_id} onChange={e => setCatForm({ ...catForm, parent_id: e.target.value })}>
              <option value="">None (top-level)</option>
              {categories.filter(c => c.id !== selected?.id).map(c => <option key={c.id as string} value={c.id as string}>{c.name as string}</option>)}
            </select>
          </FormField>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveCategory} disabled={saving}>{saving ? 'Saving...' : selected ? 'Update' : 'Create'}</button>
        </div>
      </Modal>

      {/* ===== UOM MODAL ===== */}
      <Modal isOpen={modal === 'uom'} onClose={() => setModal(null)} title="Add Unit of Measurement">
        <div className="space-y-4">
          <FormField label="Name" required><input className="input" value={uomForm.name} onChange={e => setUomForm({ ...uomForm, name: e.target.value })} placeholder="Kilogram" /></FormField>
          <FormField label="Symbol" required><input className="input" value={uomForm.symbol} onChange={e => setUomForm({ ...uomForm, symbol: e.target.value })} placeholder="kg" /></FormField>
          <FormField label="Type"><input className="input" value={uomForm.uom_type} onChange={e => setUomForm({ ...uomForm, uom_type: e.target.value })} placeholder="weight / count / volume / length" /></FormField>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveUOM} disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
        </div>
      </Modal>

      {/* ===== ATTRIBUTE MODAL ===== */}
      <Modal isOpen={modal === 'attribute'} onClose={() => setModal(null)} title="Add Product Attribute">
        <div className="space-y-4">
          <FormField label="Attribute Name" required>
            <input className="input" value={attrForm.name} onChange={e => setAttrForm({ ...attrForm, name: e.target.value })} placeholder="Color, Size, Material, Storage..." />
          </FormField>
          <p className="text-xs text-gray-400">You can add values to this attribute after creating it.</p>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveAttribute} disabled={saving}>{saving ? 'Creating...' : 'Create Attribute'}</button>
        </div>
      </Modal>
    </div>
  );
}
