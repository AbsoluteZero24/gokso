import React from 'react';
import { X, Archive, Info, Monitor, Loader2 } from 'lucide-react';
import SearchableSelect from '../shared/SearchableSelect';
import CustomDatePicker from '../shared/CustomDatePicker';

const BulkAssetModal = ({
    show,
    onClose,
    bulkAsset,
    setBulkAsset,
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(30, 89, 197, 0.1)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '12px' }}><Archive size={24} /></div>
                        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>Sisipan Masal (Bulk Addition)</h3>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                </div>
                <div style={{ padding: '2.5rem', overflowY: 'auto' }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1.25rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <Info size={20} color="#3b82f6" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                        <div style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: '1.6' }}>
                            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Tips Input Bulk:</strong>
                            Gunakan placeholder <code>[NUM]</code> pada No. Inventaris dan Nama Perangkat untuk penomoran otomatis.
                            Contoh: <code>KSO/2026/[NUM]</code> akan menjadi 001, 002, dst berdasarkan jumlah quantity.
                        </div>
                    </div>
                    
                    <form onSubmit={onSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>No. Inventaris (Pattern)</label>
                                <input type="text" required placeholder="Contoh: KSO/2026/[NUM]" value={bulkAsset.inventory_number_start} onChange={(e) => setBulkAsset({ ...bulkAsset, inventory_number_start: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Nama Perangkat (Pattern)</label>
                                <input type="text" placeholder="Contoh: NB-KSO[NUM]" value={bulkAsset.device_name_start} onChange={(e) => setBulkAsset({ ...bulkAsset, device_name_start: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Jumlah Unit (Qty)</label>
                                <input type="number" required min="1" max="50" value={bulkAsset.quantity} onChange={(e) => setBulkAsset({ ...bulkAsset, quantity: parseInt(e.target.value) })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Nama Aset (Base Name)</label>
                                <input type="text" required placeholder="Nama aset lengkap..." value={bulkAsset.asset_name} onChange={(e) => setBulkAsset({ ...bulkAsset, asset_name: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                            </div>
                            <SearchableSelect
                                label="Kategori"
                                required
                                value={bulkAsset.category}
                                onChange={(val) => setBulkAsset({ ...bulkAsset, category: val })}
                                options={categories.map(c => ({ value: c.Name, label: c.Name }))}
                                placeholder="Pilih Kategori"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Merk / Brand</label>
                                <input type="text" placeholder="Asus, Dell, HP..." value={bulkAsset.brand} onChange={(e) => setBulkAsset({ ...bulkAsset, brand: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Type / Model</label>
                                <input type="text" placeholder="Vivobook, Latitude, etc..." value={bulkAsset.type_model} onChange={(e) => setBulkAsset({ ...bulkAsset, type_model: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                            </div>
                        </div>

                        { (bulkAsset.category === 'Laptop' || bulkAsset.category === 'Komputer') ? (
                            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Monitor size={14} /> Spesifikasi Teknik (Berlaku untuk semua unit)
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
                                <textarea rows="4" placeholder="Detail spesifikasi aset..." value={bulkAsset.specification} onChange={(e) => setBulkAsset({ ...bulkAsset, specification: e.target.value })} style={{ width: '100%', padding: '1rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem', resize: 'vertical' }}></textarea>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                            <CustomDatePicker
                                label="Tanggal Pembelian"
                                required
                                selected={bulkAsset.purchase_date}
                                onChange={(val) => setBulkAsset({ ...bulkAsset, purchase_date: val })}
                            />
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Lokasi Penempatan</label>
                                <input type="text" placeholder="Ruang IT, Gudang, etc..." value={bulkAsset.location} onChange={(e) => setBulkAsset({ ...bulkAsset, location: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>Batal</button>
                            <button type="submit" disabled={modalLoading} style={{ padding: '0.75rem 2.5rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(30, 89, 197, 0.2)' }}>
                                {modalLoading ? <Loader2 className="animate-spin" size={20} /> : 'Simpan Semua Aset'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BulkAssetModal;
