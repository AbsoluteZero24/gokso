import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Database,
    Search,
    Plus,
    Trash2,
    Edit,
    Loader2,
    Tag,
    Filter,
    Monitor,
    Laptop as LaptopIcon,
    Shield,
    Clock,
    ChevronRight,
    X,
    Check,
    Package,
    Hash,
    Info,
    MapPin
} from 'lucide-react';

const AssetKSOList = () => {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);
    const [stats, setStats] = useState({ total: 0, laptop: 0, computer: 0, others: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('2026');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [newAsset, setNewAsset] = useState({
        inventory_number: '',
        asset_name: '',
        category: '',
        brand: '',
        type_model: '',
        serial_number: '',
        device_name: '',
        specification: '',
        color: '',
        location: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/assets-kso?year=${filterYear}`);
            setAssets(response.data.assets);

            // Calculate stats
            const total = response.data.assets.length;
            const laptop = response.data.assets.filter(a => a.Category?.toLowerCase() === 'laptop').length;
            const computer = response.data.assets.filter(a => a.Category?.toLowerCase() === 'komputer').length;
            setStats({
                total,
                laptop,
                computer,
                others: total - laptop - computer
            });
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/master-data/asset-category');
            setCategories(response.data.categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchCategories();
    }, [filterYear]);

    const handleDelete = async (id) => {
        if (window.confirm('Yakin ingin menghapus aset ini?')) {
            try {
                await axios.delete(`/api/assets-kso/delete/${id}`);
                fetchData();
            } catch (error) {
                console.error('Error deleting asset:', error);
            }
        }
    };

    const handleStore = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            const params = new URLSearchParams();
            Object.keys(newAsset).forEach(key => params.append(key, newAsset[key]));

            await axios.post('/api/assets-kso/store', params);
            setShowModal(false);
            setNewAsset({
                inventory_number: '',
                asset_name: '',
                category: '',
                brand: '',
                type_model: '',
                serial_number: '',
                device_name: '',
                specification: '',
                color: '',
                location: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error storing asset:', error);
            alert('Gagal menambah aset. Pastikan No Inventaris belum terdaftar.');
        } finally {
            setModalLoading(false);
        }
    };

    const filteredAssets = assets.filter(asset =>
        asset.AssetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.InventoryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.User?.Name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-content">
            {/* Header & Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Inventori Aset</h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '0.25rem' }}>Manajemen data dan pelacakan seluruh aset perusahaan</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.25rem 1rem', width: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari No. Inventaris, Nama Aset..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', padding: '0.6rem 0', fontWeight: 500, fontSize: '0.875rem' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.25rem 1rem' }}>
                        <Filter size={16} color="var(--text-light)" style={{ marginRight: '0.5rem' }} />
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            style={{ border: 'none', background: 'none', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                            <option value="2024">2024</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                    >
                        <Plus size={20} /> Tambah Aset
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {[
                    { label: 'Total Aset', value: stats.total, icon: Database, color: '#3b82f6' },
                    { label: 'Laptops', value: stats.laptop, icon: LaptopIcon, color: '#8b5cf6' },
                    { label: 'Komputer', value: stats.computer, icon: Monitor, color: '#06b6d4' },
                    { label: 'Lainnya', value: stats.others, icon: Shield, color: '#10b981' }
                ].map((item, idx) => (
                    <div key={idx} className="chart-container" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ background: `${item.color}15`, color: item.color, padding: '1rem', borderRadius: '16px' }}>
                            <item.icon size={24} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.25rem' }}>{item.label}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{item.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Assets Table */}
            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.813rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)' }}>Aset Info</th>
                            <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.813rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)' }}>Kategori</th>
                            <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.813rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)' }}>Pemegang (User)</th>
                            <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.813rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)' }}>Status</th>
                            <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '0.813rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', textAlign: 'right' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '5rem', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                    <p style={{ marginTop: '1rem', color: 'var(--text-light)', fontWeight: 600 }}>Memuat data aset...</p>
                                </td>
                            </tr>
                        ) : filteredAssets.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Tidak ada data aset ditemukan untuk periode ini.
                                </td>
                            </tr>
                        ) : filteredAssets.map((asset) => (
                            <tr key={asset.ID} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.938rem' }}>{asset.InventoryNumber}</div>
                                    <div style={{ fontSize: '0.813rem', color: 'var(--text-light)', fontWeight: 500 }}>{asset.AssetName}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                                        <span style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, color: '#64748b' }}>SN: {asset.SerialNumber || '-'}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '8px' }}>
                                            {asset.Category?.toLowerCase() === 'laptop' ? <LaptopIcon size={14} /> : <Monitor size={14} />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{asset.Category}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{asset.TypeModel}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    {asset.UserID ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '32px', height: '32px', background: '#e0f2fe', color: '#0369a1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                                {(asset.User?.Name || 'U').charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{asset.User?.Name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{asset.User?.Department}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '0.813rem', color: 'var(--text-light)', fontStyle: 'italic' }}>Belum di-assign</span>
                                    )}
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <span style={{
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '50px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        background: asset.Status === 'Ready' ? '#dcfce7' : '#fee2e2',
                                        color: asset.Status === 'Ready' ? '#166534' : '#991b1b',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem'
                                    }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
                                        {asset.Status}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: 'var(--primary)', cursor: 'pointer' }}><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(asset.ID)} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Asset Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '750px', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem', borderRadius: '10px' }}><Package size={20} /></div>
                                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>Tambah Aset Baru</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-light)' }}><X size={24} /></button>
                        </div>

                        <div style={{ padding: '2rem', overflowY: 'auto' }}>
                            <form onSubmit={handleStore}>
                                {/* ID & NAME */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Hash size={12} /> No. Inventaris</label>
                                        <input
                                            type="text" required placeholder="Contoh: KSO/2026/001"
                                            value={newAsset.inventory_number}
                                            onChange={(e) => setNewAsset({ ...newAsset, inventory_number: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontWeight: 600 }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Info size={12} /> Nama Aset</label>
                                        <input
                                            type="text" required placeholder="Contoh: Laptop HP ProBook"
                                            value={newAsset.asset_name}
                                            onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontWeight: 600 }}
                                        />
                                    </div>
                                </div>

                                {/* CATEGORY & BRAND */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Kategori</label>
                                        <select
                                            required
                                            value={newAsset.category}
                                            onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontWeight: 600, appearance: 'none', background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 1rem center', backgroundSize: '1rem' }}
                                        >
                                            <option value="">-- Pilih Kategori --</option>
                                            {categories.map(c => <option key={c.ID} value={c.Name}>{c.Name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Merk / Brand</label>
                                        <input
                                            type="text" placeholder="Contoh: HP, Dell, Lenovo"
                                            value={newAsset.brand}
                                            onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontWeight: 600 }}
                                        />
                                    </div>
                                </div>

                                {/* TYPE MODEL & SN */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Tipe / Model</label>
                                        <input
                                            type="text" placeholder="Contoh: 440 G8"
                                            value={newAsset.type_model}
                                            onChange={(e) => setNewAsset({ ...newAsset, type_model: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontWeight: 600 }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Serial Number (SN)</label>
                                        <input
                                            type="text" placeholder="SN dari pabrikan..."
                                            value={newAsset.serial_number}
                                            onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontWeight: 600 }}
                                        />
                                    </div>
                                </div>

                                {/* DEVICE NAME & COLOR & LOCATION */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Label (Device Name)</label>
                                        <input
                                            type="text" placeholder="Contoh: CP-IT-LAP-01"
                                            value={newAsset.device_name}
                                            onChange={(e) => setNewAsset({ ...newAsset, device_name: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontWeight: 600 }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Warna</label>
                                        <input
                                            type="text" placeholder="Silver, Black, etc..."
                                            value={newAsset.color}
                                            onChange={(e) => setNewAsset({ ...newAsset, color: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontWeight: 600 }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={12} /> Lokasi</label>
                                        <input
                                            type="text" placeholder="Kantor Pusat, Cabang B, etc..."
                                            value={newAsset.location}
                                            onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontWeight: 600 }}
                                        />
                                    </div>
                                </div>

                                {/* SPECIFICATION */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Spesifikasi Lengkap</label>
                                    <textarea
                                        rows="3" placeholder="RAM 16GB, SSD 512GB, Processor i7..."
                                        value={newAsset.specification}
                                        onChange={(e) => setNewAsset({ ...newAsset, specification: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontWeight: 500, resize: 'vertical' }}
                                    ></textarea>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>Batal</button>
                                    <button
                                        type="submit"
                                        disabled={modalLoading}
                                        style={{ padding: '0.75rem 2rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}
                                    >
                                        {modalLoading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                        Simpan Aset
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetKSOList;
