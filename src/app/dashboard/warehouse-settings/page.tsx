'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { warehouseAPI, locationAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, FormField, Tabs, EmptyState, Badge } from '@/components/ui';
import { Plus, Warehouse, Layers, DoorOpen, Server, AlignJustify, Box, Grid, MapPin, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WarehouseSettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState(searchParams.get('tab') || 'store');
  const changeTab = (t: string) => { setTab(t); router.push(`?tab=${t}`, { scroll: false }); };

  const [stores, setStores] = useState<Record<string,unknown>[]>([]);
  const [floors, setFloors] = useState<Record<string,unknown>[]>([]);
  const [rooms, setRooms] = useState<Record<string,unknown>[]>([]);
  const [racks, setRacks] = useState<Record<string,unknown>[]>([]);
  const [rowsList, setRowsList] = useState<Record<string,unknown>[]>([]);
  const [bins, setBins] = useState<Record<string,unknown>[]>([]);
  const [cities, setCities] = useState<Record<string,unknown>[]>([]);
  const [mapStore, setMapStore] = useState('');
  const [mapData, setMapData] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<Record<string,unknown>|null>(null);
  const [form, setForm] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'store') { const r = await warehouseAPI.getStores(); setStores(r.data.data); }
      if (tab === 'floor') { const r = await warehouseAPI.getFloors(); setFloors(r.data.data); }
      if (tab === 'room') { const r = await warehouseAPI.getRooms(); setRooms(r.data.data); }
      if (tab === 'rack') { const r = await warehouseAPI.getRacks(); setRacks(r.data.data); }
      if (tab === 'row') { const r = await warehouseAPI.getRows(); setRowsList(r.data.data); }
      if (tab === 'bin') { const r = await warehouseAPI.getBins(); setBins(r.data.data); }
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    locationAPI.getCities().then(r=>setCities(r.data.data)).catch(()=>{});
    warehouseAPI.getStores().then(r=>setStores(r.data.data)).catch(()=>{});
  }, []);

  const loadMap = async (storeId: string) => {
    setMapStore(storeId);
    try {
      const r = await warehouseAPI.getTree(storeId);
      // Build flat bin list with positions
      setMapData(r.data.data.bins || []);
    } catch {}
  };

  const openCreate = () => { setEditItem(null); setForm({}); setModal(true); };
  const openEdit = (item: Record<string,unknown>) => { setEditItem(item); setForm(Object.fromEntries(Object.entries(item).map(([k,v])=>[k,String(v??'')]))); setModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'store') {
        if (!form.name || !form.code) return toast.error('Name and code required');
        if (editItem) await warehouseAPI.updateStore(editItem.id as string, form);
        else await warehouseAPI.createStore(form);
      }
      if (tab === 'floor') {
        if (!form.name || !form.store_id) return toast.error('Name and store required');
        await warehouseAPI.createFloor(form);
      }
      if (tab === 'room') {
        if (!form.name || !form.floor_id) return toast.error('Name and floor required');
        await warehouseAPI.createRoom(form);
      }
      if (tab === 'rack') {
        if (!form.name || !form.room_id) return toast.error('Name and room required');
        await warehouseAPI.createRack(form);
      }
      if (tab === 'row') {
        if (!form.name || !form.rack_id) return toast.error('Name and rack required');
        await warehouseAPI.createRow(form);
      }
      if (tab === 'bin') {
        if (!form.name || !form.row_id) return toast.error('Name and row required');
        if (editItem) await warehouseAPI.updateBin(editItem.id as string, form);
        else await warehouseAPI.createBin(form);
      }
      toast.success(editItem ? 'Updated' : 'Created');
      setModal(false);
      fetchData();
    } catch (e: unknown) { toast.error((e as {response?:{data?:{message?:string}}})?.response?.data?.message||'Failed'); }
    finally { setSaving(false); }
  };

  const tabs = [
    { key: 'store', label: '🏭 Store' },
    { key: 'floor', label: '🏢 Floor' },
    { key: 'room', label: '🚪 Room' },
    { key: 'rack', label: '🗄️ Rack' },
    { key: 'row', label: '═ Row' },
    { key: 'bin', label: '📦 Bin' },
    { key: 'mapping', label: '🗺️ Mapping View' },
  ];

  // bin colors
  const getBinBg = (bin: Record<string,unknown>) => {
    const stock = Number(bin.current_stock||0);
    const max = Number(bin.max_capacity||100);
    if (bin.bin_type==='scrap') return '#e5e7eb';
    if (bin.bin_type==='damage') return '#fecaca';
    if (stock===0) return '#f9fafb';
    if (stock>=max) return '#fca5a5';
    if (stock>=max*0.7) return '#fed7aa';
    return '#bbf7d0';
  };

  const storeColumns = [
    { key: 'name', label: 'Store', render: (r: Record<string,unknown>) => <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center"><Warehouse className="w-4 h-4 text-brand-500"/></div><div><p className="font-medium text-sm">{r.name as string}</p><p className="text-xs text-gray-400 font-mono">{r.code as string}</p></div></div> },
    { key: 'city_name', label: 'City', render: (r: Record<string,unknown>) => <span className="text-sm text-gray-500">{(r.city_name as string)||'—'}</span> },
    { key: 'manager_name', label: 'Manager', render: (r: Record<string,unknown>) => <span className="text-sm">{(r.manager_name as string)||'—'}</span> },
    { key: 'is_active', label: 'Status', render: (r: Record<string,unknown>) => <StatusBadge status={(r.is_active as boolean)?'active':'inactive'}/> },
    { key: 'actions', label: '', render: (r: Record<string,unknown>) => <button onClick={e=>{e.stopPropagation();openEdit(r);}} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil className="w-3.5 h-3.5"/></button> },
  ];

  const binColumns = [
    { key: 'code', label: 'Bin Code', render: (r: Record<string,unknown>) => <span className="font-mono font-semibold text-sm">{r.code as string}</span> },
    { key: 'name', label: 'Name', render: (r: Record<string,unknown>) => <span>{r.name as string}</span> },
    { key: 'row_name', label: 'Location', render: (r: Record<string,unknown>) => <span className="text-xs text-gray-500">{r.store_name as string} › {r.floor_name as string} › {r.room_name as string} › {r.rack_name as string} › {r.row_name as string}</span> },
    { key: 'bin_type', label: 'Type', render: (r: Record<string,unknown>) => <StatusBadge status={r.bin_type as string}/> },
    { key: 'current_stock', label: 'Stock', render: (r: Record<string,unknown>) => <span className="font-semibold">{r.current_stock as string}</span> },
    { key: 'max_capacity', label: 'Max', render: (r: Record<string,unknown>) => <span className="text-gray-500">{r.max_capacity as string||'—'}</span> },
    { key: 'is_active', label: 'Status', render: (r: Record<string,unknown>) => <StatusBadge status={(r.is_active as boolean)?'active':'inactive'}/> },
    { key: 'actions', label: '', render: (r: Record<string,unknown>) => <button onClick={e=>{e.stopPropagation();openEdit(r);}} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil className="w-3.5 h-3.5"/></button> },
  ];

  const genericColumns = (fields: {k:string;l:string}[]) => [
    ...fields.map(f => ({ key: f.k, label: f.l, render: (r: Record<string,unknown>) => <span className="text-sm">{(r[f.k] as string)||'—'}</span> })),
  ];

  return (
    <div>
      <PageHeader title="Warehouse Settings" subtitle="Configure store hierarchy: Store → Floor → Room → Rack → Row → Bin"
        actions={tab!=='mapping' ? <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4"/>Add {tab.charAt(0).toUpperCase()+tab.slice(1)}</button> : undefined}
      />
      <Tabs tabs={tabs} active={tab} onChange={changeTab} />

      {tab === 'store' && <div className="card overflow-hidden"><DataTable columns={storeColumns} data={stores} loading={loading} emptyState={<EmptyState icon={<Warehouse className="w-6 h-6"/>} title="No stores"/>}/></div>}
      {tab === 'floor' && <div className="card overflow-hidden"><DataTable columns={[{key:'name',label:'Floor'},{key:'store_name',label:'Store'},{key:'floor_number',label:'Floor #'}]} data={floors} loading={loading} emptyState={<EmptyState icon={<Layers className="w-6 h-6"/>} title="No floors"/>}/></div>}
      {tab === 'room' && <div className="card overflow-hidden"><DataTable columns={genericColumns([{k:'name',l:'Room'},{k:'floor_name',l:'Floor'},{k:'store_name',l:'Store'}])} data={rooms} loading={loading} emptyState={<EmptyState icon={<DoorOpen className="w-6 h-6"/>} title="No rooms"/>}/></div>}
      {tab === 'rack' && <div className="card overflow-hidden"><DataTable columns={genericColumns([{k:'name',l:'Rack'},{k:'code',l:'Code'},{k:'room_name',l:'Room'},{k:'floor_name',l:'Floor'}])} data={racks} loading={loading} emptyState={<EmptyState icon={<Server className="w-6 h-6"/>} title="No racks"/>}/></div>}
      {tab === 'row' && <div className="card overflow-hidden"><DataTable columns={genericColumns([{k:'name',l:'Row'},{k:'rack_name',l:'Rack'}])} data={rowsList} loading={loading} emptyState={<EmptyState icon={<AlignJustify className="w-6 h-6"/>} title="No rows"/>}/></div>}
      {tab === 'bin' && <div className="card overflow-hidden"><DataTable columns={binColumns} data={bins} loading={loading} emptyState={<EmptyState icon={<Box className="w-6 h-6"/>} title="No bins"/>}/></div>}

      {tab === 'mapping' && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <select className="select w-64" value={mapStore} onChange={e=>loadMap(e.target.value)}>
              <option value="">Select store to view map</option>
              {stores.map(s=><option key={s.id as string} value={s.id as string}>{s.name as string}</option>)}
            </select>
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {[['#bbf7d0','Has Stock'],['#f9fafb','Empty'],['#fed7aa','70%+ Full'],['#fca5a5','Full'],['#e5e7eb','Scrap'],['#fecaca','Damage']].map(([c,l])=>(
                <span key={l} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block border border-gray-200" style={{background:c}}/>{l}</span>
              ))}
            </div>
          </div>

          {!mapStore ? (
            <div className="card p-12 text-center"><Grid className="w-12 h-12 text-gray-300 mx-auto mb-3"/><p className="text-gray-500 text-sm">Select a store to view the warehouse map</p></div>
          ) : (
            <div className="space-y-4">
              {/* Group by rack */}
              {Object.entries(
                mapData.reduce((acc: Record<string,Record<string,unknown>[]>, bin) => {
                  const key = `${bin.floor_name}||${bin.room_name}||${bin.rack_name}`;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(bin as Record<string,unknown>);
                  return acc;
                }, {})
              ).map(([key, rackBins]) => {
                const [floor, room, rack] = key.split('||');
                return (
                  <div key={key} className="card p-4">
                    <div className="flex items-center gap-2 mb-4 text-xs">
                      <span className="font-medium text-gray-500">{floor}</span><span className="text-gray-300">›</span>
                      <span className="font-medium text-gray-500">{room}</span><span className="text-gray-300">›</span>
                      <span className="font-bold text-brand-600 text-sm">{rack}</span>
                      <Badge variant="info">{rackBins.length} bins</Badge>
                    </div>
                    {/* Cinema-seat style grid */}
                    <div className="flex flex-wrap gap-2">
                      {rackBins.map((bin: Record<string,unknown>) => {
                        const stock = Number(bin.current_stock||0);
                        const max = Number(bin.max_capacity||100);
                        const pct = max > 0 ? Math.round((stock/max)*100) : 0;
                        return (
                          <div key={bin.id as string} className="flex flex-col items-center p-2 rounded-xl w-[72px] h-[72px] justify-between cursor-pointer transition-all hover:scale-110 hover:shadow-lg border"
                            style={{ background: getBinBg(bin), borderColor: '#e5e7eb' }}
                            title={`${bin.code as string}: ${stock} / ${max}`}>
                            <span className="text-[8px] font-mono font-bold text-gray-600 leading-none text-center w-full truncate">{(bin.code as string)?.split('BIN-')[1]||bin.code as string}</span>
                            <span className="text-lg font-black text-gray-800 leading-none">{stock}</span>
                            <span className="text-[8px] text-gray-500">{max>0?`${pct}%`:'—'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modal} onClose={()=>setModal(false)} title={`${editItem?'Edit':'Add'} ${tab.charAt(0).toUpperCase()+tab.slice(1)}`}>
        <div className="space-y-4">
          {tab === 'store' && <>
            <FormField label="Store Name" required><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Main Warehouse Dhaka"/></FormField>
            <FormField label="Code" required><input className="input" value={form.code||''} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="WH-DK-01"/></FormField>
            <FormField label="Address"><textarea className="input resize-none" rows={2} value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}/></FormField>
            <FormField label="City">
              <select className="select" value={form.city_id||''} onChange={e=>setForm({...form,city_id:e.target.value})}>
                <option value="">Select city</option>
                {cities.map(c=><option key={c.id as string} value={c.id as string}>{c.name as string}</option>)}
              </select>
            </FormField>
          </>}
          {tab === 'floor' && <>
            <FormField label="Store" required>
              <select className="select" value={form.store_id||''} onChange={e=>setForm({...form,store_id:e.target.value})}>
                <option value="">Select store</option>
                {stores.map(s=><option key={s.id as string} value={s.id as string}>{s.name as string}</option>)}
              </select>
            </FormField>
            <FormField label="Floor Name" required><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ground Floor"/></FormField>
            <FormField label="Floor Number"><input type="number" className="input" value={form.floor_number||''} onChange={e=>setForm({...form,floor_number:e.target.value})}/></FormField>
          </>}
          {tab === 'room' && <>
            <FormField label="Floor" required>
              <select className="select" value={form.floor_id||''} onChange={e=>setForm({...form,floor_id:e.target.value})}>
                <option value="">Select floor</option>
                {floors.map(f=><option key={f.id as string} value={f.id as string}>{f.name as string} — {f.store_name as string}</option>)}
              </select>
            </FormField>
            <FormField label="Room Name" required><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Room A"/></FormField>
          </>}
          {tab === 'rack' && <>
            <FormField label="Room" required>
              <select className="select" value={form.room_id||''} onChange={e=>setForm({...form,room_id:e.target.value})}>
                <option value="">Select room</option>
                {rooms.map(r=><option key={r.id as string} value={r.id as string}>{r.name as string} — {r.store_name as string}</option>)}
              </select>
            </FormField>
            <FormField label="Rack Name" required><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Rack A1"/></FormField>
            <FormField label="Rack Code"><input className="input" value={form.code||''} onChange={e=>setForm({...form,code:e.target.value})} placeholder="R-A1"/></FormField>
          </>}
          {tab === 'row' && <>
            <FormField label="Rack" required>
              <select className="select" value={form.rack_id||''} onChange={e=>setForm({...form,rack_id:e.target.value})}>
                <option value="">Select rack</option>
                {racks.map(r=><option key={r.id as string} value={r.id as string}>{r.name as string} ({r.code as string})</option>)}
              </select>
            </FormField>
            <FormField label="Row Name" required><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Row 1"/></FormField>
          </>}
          {tab === 'bin' && <>
            <FormField label="Row" required>
              <select className="select" value={form.row_id||''} onChange={e=>setForm({...form,row_id:e.target.value})}>
                <option value="">Select row</option>
                {rowsList.map(r=><option key={r.id as string} value={r.id as string}>{r.name as string} — {r.rack_name as string}</option>)}
              </select>
            </FormField>
            <FormField label="Bin Name" required><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Bin A1-1-1"/></FormField>
            <FormField label="Bin Code"><input className="input" value={form.code||''} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="BIN-A1-1-1"/></FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Bin Type">
                <select className="select" value={form.bin_type||'good'} onChange={e=>setForm({...form,bin_type:e.target.value})}>
                  {['good','scrap','damage','hold'].map(t=><option key={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Max Capacity">
                <input type="number" className="input" value={form.max_capacity||''} onChange={e=>setForm({...form,max_capacity:e.target.value})} placeholder="100"/>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Position X"><input type="number" className="input" value={form.position_x||''} onChange={e=>setForm({...form,position_x:e.target.value})}/></FormField>
              <FormField label="Position Y"><input type="number" className="input" value={form.position_y||''} onChange={e=>setForm({...form,position_y:e.target.value})}/></FormField>
            </div>
          </>}
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving...':editItem?'Update':'Create'}</button>
        </div>
      </Modal>
    </div>
  );
}
