'use client';
import { useState, useEffect, useCallback } from 'react';
import { stockAPI, warehouseAPI } from '@/lib/api';
import { PageHeader, DataTable, Modal, Tabs, EmptyState, StockTypeBadge, Badge } from '@/components/ui';
import { BarChart3, Search, MapPin, Package, AlertTriangle, Grid } from 'lucide-react';
import toast from 'react-hot-toast';

type StockItem = Record<string, unknown>;
type BinMapItem = Record<string, unknown>;

export default function StockOverviewPage() {
  const [tab, setTab] = useState('overview');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [stores, setStores] = useState<Record<string,unknown>[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [warehouseMap, setWarehouseMap] = useState<BinMapItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lowStock, setLowStock] = useState(false);
  const [binDetail, setBinDetail] = useState<Record<string,unknown>|null>(null);
  const [productBins, setProductBins] = useState<{product: StockItem; bins: Record<string,unknown>[]}|null>(null);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const r = await stockAPI.getOverview({ search: search||undefined, store_id: selectedStore||undefined, low_stock: lowStock?'true':undefined });
      setStock(r.data.data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [search, selectedStore, lowStock]);

  const fetchMap = useCallback(async () => {
    if (!selectedStore) { setWarehouseMap([]); setLoading(false); return; }
    setLoading(true);
    try {
      const r = await stockAPI.getWarehouseMap(selectedStore);
      setWarehouseMap(r.data.data);
    } catch {}
    finally { setLoading(false); }
  }, [selectedStore]);

  useEffect(() => { if (tab==='overview') fetchStock(); else if (tab==='map') fetchMap(); }, [tab, fetchStock, fetchMap]);
  useEffect(() => { warehouseAPI.getStores().then(r=>setStores(r.data.data)).catch(()=>{}); }, []);

  const showBinDetail = async (binId: string) => {
    try {
      const r = await stockAPI.getBinDetail(binId);
      setBinDetail(r.data.data);
    } catch {}
  };

  const showProductBins = async (item: StockItem) => {
    try {
      const r = await stockAPI.getProductBins(item.id as string);
      setProductBins({ product: item, bins: r.data.data });
    } catch {}
  };

  const getBinColor = (bin: BinMapItem) => {
    const stock = Number(bin.total_stock||0);
    const cap = Number(bin.max_capacity||100);
    const type = bin.bin_type as string;
    if (type==='scrap') return 'bg-gray-200 dark:bg-gray-700 text-gray-500';
    if (type==='damage') return 'bg-red-100 dark:bg-red-900/30 text-red-600';
    if (stock===0) return 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400';
    if (stock >= cap) return 'bg-red-100 dark:bg-red-900/20 text-red-700';
    if (stock >= cap*0.7) return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700';
    return 'bg-green-100 dark:bg-green-900/20 text-green-700';
  };

  // Group bins by rack for mapping view
  const groupedByRack = warehouseMap.reduce((acc: Record<string, BinMapItem[]>, bin) => {
    const key = `${bin.floor_name}__${bin.room_name}__${bin.rack_name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(bin);
    return acc;
  }, {});

  const tabs = [
    { key: 'overview', label: '📊 Stock Overview' },
    { key: 'map', label: '🗺️ Warehouse Map' },
    { key: 'movements', label: '↔️ Movements' },
  ];

  const columns = [
    { key: 'name', label: 'Product', render: (r: StockItem) => (
      <div><p className="font-medium text-gray-900 dark:text-white">{r.name as string}</p><p className="text-xs text-gray-400 font-mono">{r.sku as string}</p></div>
    )},
    { key: 'category_name', label: 'Category', render: (r: StockItem) => <Badge variant="info">{(r.category_name as string)||'—'}</Badge> },
    { key: 'good_qty', label: 'Good', render: (r: StockItem) => <StockTypeBadge type="good" qty={Number(r.good_qty||0)}/> },
    { key: 'hold_qty', label: 'Hold', render: (r: StockItem) => <StockTypeBadge type="hold" qty={Number(r.hold_qty||0)}/> },
    { key: 'processing_qty', label: 'Processing', render: (r: StockItem) => <StockTypeBadge type="processing" qty={Number(r.processing_qty||0)}/> },
    { key: 'damage_qty', label: 'Damage', render: (r: StockItem) => <StockTypeBadge type="damage" qty={Number(r.damage_qty||0)}/> },
    { key: 'expired_qty', label: 'Expired', render: (r: StockItem) => <StockTypeBadge type="expired" qty={Number(r.expired_qty||0)}/> },
    { key: 'scrap_qty', label: 'Scrap', render: (r: StockItem) => <StockTypeBadge type="scrap" qty={Number(r.scrap_qty||0)}/> },
    { key: 'total_qty', label: 'Total', render: (r: StockItem) => <span className="font-bold text-lg">{r.total_qty as string}</span> },
    { key: 'alert', label: '', render: (r: StockItem) => Number(r.good_qty||0) <= Number(r.min_stock_level||0) ? <AlertTriangle className="w-4 h-4 text-yellow-500"/> : null },
    { key: 'bins', label: 'Bins', render: (r: StockItem) => (
      <button onClick={e=>{e.stopPropagation();showProductBins(r);}} className="text-xs text-brand-500 flex items-center gap-1 hover:underline"><MapPin className="w-3 h-3"/>View bins</button>
    )},
  ];

  return (
    <div>
      <PageHeader title="Stock Overview" subtitle="Real-time inventory levels and warehouse locations" />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <input className="input pl-9" placeholder="Search products..." value={search} onChange={e=>{setSearch(e.target.value);}}/>
            </div>
            <select className="select w-48" value={selectedStore} onChange={e=>setSelectedStore(e.target.value)}>
              <option value="">All warehouses</option>
              {stores.map(s=><option key={s.id as string} value={s.id as string}>{s.name as string}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={lowStock} onChange={e=>setLowStock(e.target.checked)} className="rounded"/>
              <span className="text-gray-600 dark:text-gray-400">Low stock only</span>
            </label>
          </div>
          <div className="card overflow-hidden">
            <DataTable columns={columns} data={stock} loading={loading}
              emptyState={<EmptyState icon={<BarChart3 className="w-6 h-6"/>} title="No stock data" description="Stock is updated automatically as you receive and ship products"/>}
            />
          </div>
        </>
      )}

      {tab === 'map' && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <select className="select w-64" value={selectedStore} onChange={e=>setSelectedStore(e.target.value)}>
              <option value="">Select warehouse to view map</option>
              {stores.map(s=><option key={s.id as string} value={s.id as string}>{s.name as string}</option>)}
            </select>
            <div className="flex items-center gap-4 text-xs text-gray-500 ml-4">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 inline-block"/>Has stock</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border-2 border-gray-300 inline-block"/>Empty</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 inline-block"/>70%+ full</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block"/>Full/Damage</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 inline-block"/>Scrap bin</span>
            </div>
          </div>

          {!selectedStore ? (
            <div className="card p-12 text-center">
              <Grid className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
              <p className="text-gray-500">Select a warehouse to view the mapping</p>
            </div>
          ) : loading ? (
            <div className="card p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto"/></div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByRack).map(([key, bins]) => {
                const [floor, room, rack] = key.split('__');
                return (
                  <div key={key} className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{floor}</span>
                      <span className="text-gray-300">›</span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{room}</span>
                      <span className="text-gray-300">›</span>
                      <span className="text-xs font-bold text-brand-600 uppercase tracking-wide">{rack}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {bins.map(bin=>(
                        <button key={bin.id as string}
                          onClick={()=>showBinDetail(bin.id as string)}
                          className={`relative flex flex-col items-center p-2 rounded-xl w-20 h-20 transition-all hover:scale-105 hover:shadow-md ${getBinColor(bin)}`}
                          title={`${bin.code as string}: ${bin.total_stock as string} items`}>
                          <span className="text-[9px] font-mono font-bold leading-none">{(bin.code as string)?.split('BIN-')[1]||bin.code as string}</span>
                          <span className="text-xl font-bold mt-1">{bin.total_stock as string||0}</span>
                          <span className="text-[8px] mt-0.5 opacity-70">{Number(bin.product_count||0)>0?`${bin.product_count} SKUs`:'empty'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bin Detail Popup */}
      {binDetail && (
        <Modal isOpen={!!binDetail} onClose={()=>setBinDetail(null)} title={`Bin: ${binDetail.code as string}`}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"><p className="text-xs text-gray-400">Floor</p><p className="font-medium">{binDetail.floor_name as string}</p></div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"><p className="text-xs text-gray-400">Room</p><p className="font-medium">{binDetail.room_name as string}</p></div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"><p className="text-xs text-gray-400">Rack</p><p className="font-medium">{binDetail.rack_name as string}</p></div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"><p className="text-xs text-gray-400">Row</p><p className="font-medium">{binDetail.row_name as string}</p></div>
            </div>
            {((binDetail.stock as Record<string,unknown>[])||[]).length > 0 ? (
              <div>
                <p className="label mb-2">Products in this bin</p>
                {(binDetail.stock as Record<string,unknown>[]).map((s,i)=>(
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-2">
                    <div>
                      <p className="font-medium text-sm">{s.product_name as string}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.sku as string}</p>
                    </div>
                    <span className="text-2xl font-bold text-brand-600">{s.quantity as string}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400 text-center py-4">This bin is empty</p>}
          </div>
        </Modal>
      )}

      {/* Product Bins Modal */}
      {productBins && (
        <Modal isOpen={!!productBins} onClose={()=>setProductBins(null)} title={`Bin Locations: ${productBins.product.name as string}`} size="lg">
          {productBins.bins.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No bin assignments found</p>
          ) : (
            <div className="space-y-2">
              {productBins.bins.map((b,i)=>(
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-brand-500 flex-shrink-0"/>
                    <div>
                      <p className="font-mono font-bold text-sm">{b.bin_code as string}</p>
                      <p className="text-xs text-gray-400">{b.store_name as string} › {b.floor_name as string} › {b.room_name as string} › {b.rack_name as string} › {b.row_name as string}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-brand-600">{b.quantity as string}</span>
                    <p className="text-xs text-gray-400">units</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
