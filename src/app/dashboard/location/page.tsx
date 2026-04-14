'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { locationAPI } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, FormField, Tabs, EmptyState } from '@/components/ui';
import { Plus, Globe, Map, Building2, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Country { id: string; name: string; code: string; is_active: boolean; }
interface State { id: string; name: string; code: string; country_name: string; country_id: string; is_active: boolean; }
interface City { id: string; name: string; postal_code: string; state_name: string; state_id: string; country_name: string; is_active: boolean; }

export default function LocationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState(searchParams.get('tab') || 'country');
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<Record<string,string>|null>(null);
  const [form, setForm] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);

  const changeTab = (t: string) => { setTab(t); router.push(`?tab=${t}`, { scroll: false }); };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'country') { const r = await locationAPI.getCountries(); setCountries(r.data.data); }
      if (tab === 'state') { const r = await locationAPI.getStates(); setStates(r.data.data); }
      if (tab === 'city') { const r = await locationAPI.getCities(); setCities(r.data.data); }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditItem(null); setForm({}); setModal(true); };
  const openEdit = (item: Record<string,string>) => { setEditItem(item); setForm({...item}); setModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'country') {
        if (!form.name || !form.code) return toast.error('Name and code required');
        if (editItem) await locationAPI.updateCountry(editItem.id, form);
        else await locationAPI.createCountry(form);
      }
      if (tab === 'state') {
        if (!form.name || !form.country_id) return toast.error('Name and country required');
        if (editItem) await locationAPI.updateState(editItem.id, form);
        else await locationAPI.createState(form);
      }
      if (tab === 'city') {
        if (!form.name || !form.state_id) return toast.error('Name and state required');
        if (editItem) await locationAPI.updateCity(editItem.id, form);
        else await locationAPI.createCity(form);
      }
      toast.success(editItem ? 'Updated' : 'Created');
      setModal(false);
      fetch();
    } catch (e: unknown) { toast.error((e as {response?:{data?:{message?:string}}})?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this record?')) return;
    try {
      if (tab === 'country') await locationAPI.deleteCountry(id);
      if (tab === 'state') await locationAPI.deleteState(id);
      if (tab === 'city') await locationAPI.deleteCity(id);
      toast.success('Deactivated');
      fetch();
    } catch { toast.error('Failed'); }
  };

  const tabs = [
    { key: 'country', label: '🌍 Countries' },
    { key: 'state', label: '🗺️ States' },
    { key: 'city', label: '🏙️ Cities' },
  ];

  const actionCol = (row: Record<string,string>) => (
    <div className="flex gap-1">
      <button onClick={e=>{e.stopPropagation();openEdit(row);}} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil className="w-3.5 h-3.5"/></button>
      <button onClick={e=>{e.stopPropagation();handleDelete(row.id);}} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
    </div>
  );

  const countryColumns = [
    { key: 'name', label: 'Country', render: (r: Country) => <span className="font-medium">{r.name}</span> },
    { key: 'code', label: 'Code', render: (r: Country) => <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{r.code}</span> },
    { key: 'is_active', label: 'Status', render: (r: Country) => <StatusBadge status={r.is_active?'active':'inactive'}/> },
    { key: 'actions', label: '', render: (r: Country) => actionCol(r as unknown as Record<string,string>) },
  ];
  const stateColumns = [
    { key: 'name', label: 'State', render: (r: State) => <span className="font-medium">{r.name}</span> },
    { key: 'country_name', label: 'Country', render: (r: State) => <span className="text-sm text-gray-500">{r.country_name}</span> },
    { key: 'code', label: 'Code', render: (r: State) => r.code ? <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.code}</span> : <span className="text-gray-400">—</span> },
    { key: 'is_active', label: 'Status', render: (r: State) => <StatusBadge status={r.is_active?'active':'inactive'}/> },
    { key: 'actions', label: '', render: (r: State) => actionCol(r as unknown as Record<string,string>) },
  ];
  const cityColumns = [
    { key: 'name', label: 'City', render: (r: City) => <span className="font-medium">{r.name}</span> },
    { key: 'state_name', label: 'State', render: (r: City) => <span className="text-sm text-gray-500">{r.state_name}</span> },
    { key: 'country_name', label: 'Country', render: (r: City) => <span className="text-sm text-gray-400">{r.country_name}</span> },
    { key: 'postal_code', label: 'Postal', render: (r: City) => r.postal_code || '—' },
    { key: 'is_active', label: 'Status', render: (r: City) => <StatusBadge status={r.is_active?'active':'inactive'}/> },
    { key: 'actions', label: '', render: (r: City) => actionCol(r as unknown as Record<string,string>) },
  ];

  return (
    <div>
      <PageHeader title="Location" subtitle="Manage countries, states, and cities"
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4"/>Add {tab.charAt(0).toUpperCase()+tab.slice(1)}</button>}
      />
      <Tabs tabs={tabs} active={tab} onChange={changeTab} />
      <div className="card overflow-hidden">
        {tab==='country' && <DataTable columns={countryColumns} data={countries} loading={loading} emptyState={<EmptyState icon={<Globe className="w-6 h-6"/>} title="No countries"/>}/>}
        {tab==='state' && <DataTable columns={stateColumns} data={states} loading={loading} emptyState={<EmptyState icon={<Map className="w-6 h-6"/>} title="No states"/>}/>}
        {tab==='city' && <DataTable columns={cityColumns} data={cities} loading={loading} emptyState={<EmptyState icon={<Building2 className="w-6 h-6"/>} title="No cities"/>}/>}
      </div>

      <Modal isOpen={modal} onClose={()=>setModal(false)} title={`${editItem?'Edit':'Add'} ${tab.charAt(0).toUpperCase()+tab.slice(1)}`}>
        <div className="space-y-4">
          {tab==='country' && <>
            <FormField label="Country Name" required><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Bangladesh"/></FormField>
            <FormField label="Country Code" required><input className="input" value={form.code||''} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="BD" maxLength={4}/></FormField>
          </>}
          {tab==='state' && <>
            <FormField label="Country" required>
              <select className="select" value={form.country_id||''} onChange={e=>setForm({...form,country_id:e.target.value})}>
                <option value="">Select country</option>
                {countries.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="State Name" required><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Dhaka Division"/></FormField>
            <FormField label="State Code"><input className="input" value={form.code||''} onChange={e=>setForm({...form,code:e.target.value})} placeholder="DH"/></FormField>
          </>}
          {tab==='city' && <>
            <FormField label="State" required>
              <select className="select" value={form.state_id||''} onChange={e=>setForm({...form,state_id:e.target.value})}>
                <option value="">Select state</option>
                {states.map(s=><option key={s.id} value={s.id}>{s.name} ({s.country_name})</option>)}
              </select>
            </FormField>
            <FormField label="City Name" required><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Dhaka"/></FormField>
            <FormField label="Postal Code"><input className="input" value={form.postal_code||''} onChange={e=>setForm({...form,postal_code:e.target.value})} placeholder="1000"/></FormField>
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
