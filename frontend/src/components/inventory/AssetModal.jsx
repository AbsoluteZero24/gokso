import React from 'react';
import { X, Loader2, Monitor } from 'lucide-react';
import SearchableSelect from '../shared/SearchableSelect';
import CustomDatePicker from '../shared/CustomDatePicker';

const AssetModal = ({ 
    show, 
    onClose, 
    isEdit, 
    newAsset, 
    setNewAsset, 
    compSpecs, 
    setCompSpecs, 
    categories, 
    ramTypes, 
    storageTypes, 
    modalLoading, 
    onSubmit 
}) => {
    if (!show) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '2rem' }}>
            <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>{isEdit ? 'Edit Aset' : 'Tambah Aset'}</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                </div>
                <div style={{ padding: '2.5rem', overflowY: 'auto' }}>
                    <form onSubmit={onSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>No. Inventaris</label>
                                <input type="text" required placeholder="Contoh: KSO/2026/001" value={newAsset.inventory_number} onChange={(e) => setNewAsset({ ...newAsset, inventory_number: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Nama Aset</label>
                                <input type="text" required placeholder="Nama aset lengkap..." value={newAsset.asset_name} onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.25rem' }}>
                            <SearchableSelect
                                label="Kategori"
                                required
                                value={newAsset.category}
                                onChange={(val) => setNewAsset({ ...newAsset, category: val })}
                                options={categories.map(c => ({ value: c.Name, label: c.Name }))}
                                placeholder="Pilih Kategori"
                            />
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Merk / Brand</label>
                                <input type="text" placeholder="Asus, Dell, HP..." value={newAsset.brand} onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                            </div>
                        </div>
                        
                        { (newAsset.category === 'Laptop' || newAsset.category === 'Komputer') ? (
                            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Monitor size={14} /> Spesifikasi Teknis {newAsset.category}
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Sistem Operasi</label>
                                        <input type="text" placeholder="Windows 11, macOS, etc" value={compSpecs.os} onChange={(e) => setCompSpecs({ ...compSpecs, os: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Processor</label>
                                        <input type="text" placeholder="Core i7, Ryzen 7, etc" value={compSpecs.processor} onChange={(e) => setCompSpecs({ ...compSpecs, processor: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.8fr 1.1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>RAM Size</label>
                                        <input type="number" value={compSpecs.ramSize} onChange={(e) => setCompSpecs({ ...compSpecs, ramSize: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Unit</label>
                                        <select value={compSpecs.ramUnit} onChange={(e) => setCompSpecs({ ...compSpecs, ramUnit: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem', background: 'white' }}>
                                            <option value="GB">GB</option>
                                            <option value="TB">TB</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>RAM Type</label>
                                        <select value={compSpecs.ramType} onChange={(e) => setCompSpecs({ ...compSpecs, ramType: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem', background: 'white' }}>
                                            <option value="">Pilih Type</option>
                                            {ramTypes.map(t => <option key={t.ID || t.Name} value={t.Name}>{t.Name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.8fr 1.1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Storage Size</label>
                                        <input type="number" value={compSpecs.storageSize} onChange={(e) => setCompSpecs({ ...compSpecs, storageSize: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Unit</label>
                                        <select value={compSpecs.storageUnit} onChange={(e) => setCompSpecs({ ...compSpecs, storageUnit: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem', background: 'white' }}>
                                            <option value="GB">GB</option>
                                            <option value="TB">TB</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Storage Type</label>
                                        <select value={compSpecs.storageType} onChange={(e) => setCompSpecs({ ...compSpecs, storageType: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem', background: 'white' }}>
                                            <option value="">Pilih Type</option>
                                            {storageTypes.map(t => <option key={t.ID || t.Name} value={t.Name}>{t.Name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Spesifikasi Teknis</label>
                                <textarea rows="4" placeholder="Detail spesifikasi aset..." value={newAsset.specification} onChange={(e) => setNewAsset({ ...newAsset, specification: e.target.value })} style={{ width: '100%', padding: '1rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem', resize: 'vertical' }}></textarea>
                            </div>
                        )}
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                            <CustomDatePicker
                                label="Tanggal Pembelian"
                                required
                                selected={newAsset.purchase_date}
                                onChange={(val) => setNewAsset({ ...newAsset, purchase_date: val })}
                            />
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Lokasi Penempatan</label>
                                <input type="text" placeholder="Ruang IT, Gudang, etc..." value={newAsset.location} onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '2.5rem' }}>
                            <SearchableSelect
                                label="Status"
                                value={newAsset.status}
                                onChange={(val) => setNewAsset({ ...newAsset, status: val })}
                                options={[
                                    { value: 'Ready', label: 'Ready' },
                                    { value: 'Rusak', label: 'Rusak' },
                                    { value: 'Obsolete', label: 'Obsolete' },
                                    { value: 'Hilang', label: 'Hilang' }
                                ]}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>Batal</button>
                            <button type="submit" disabled={modalLoading} style={{ padding: '0.75rem 2.5rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(30, 89, 197, 0.2)' }}>
                                {modalLoading ? <Loader2 className="animate-spin" size={20} /> : 'Simpan Aset'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AssetModal;
