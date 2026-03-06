import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Laptop,
    Search,
    Loader2,
    UserPlus,
    PencilLine,
    Barcode,
    Building2,
    Briefcase,
    ChevronDown,
    LayoutGrid,
    Monitor,
    Smartphone,
    Printer,
    HardDrive
} from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';

const AssetManagement = () => {
    const [data, setData] = useState({ assets: [], users: [], categories: [] });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Laptop');

    // Modal states
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [currentAsset, setCurrentAsset] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/assets-kso/laptop?category=${selectedCategory}`);
            setData({
                assets: response.data.assets || [],
                users: response.data.users || [],
                categories: response.data.categories || []
            });
        } catch (error) {
            console.error('Error fetching asset data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedCategory]);

    const getCategoryIcon = (catName) => {
        const lower = catName.toLowerCase();
        if (lower.includes('laptop')) return <Laptop size={16} />;
        if (lower.includes('komputer') || lower.includes('pc')) return <Monitor size={16} />;
        if (lower.includes('printer')) return <Printer size={16} />;
        if (lower.includes('handphone') || lower.includes('hp')) return <Smartphone size={16} />;
        return <HardDrive size={16} />;
    };

    const openAssignModal = (asset) => {
        setCurrentAsset(asset);
        setSelectedUserId(asset.UserID || '');
        setShowAssignModal(true);
    };

    const openLabelModal = (asset) => {
        setCurrentAsset(asset);
        setNewLabel(asset.DeviceName || '');
        setShowLabelModal(true);
    };

    const handleAssign = async () => {
        setSubmitting(true);
        try {
            const params = new URLSearchParams();
            params.append('asset_id', currentAsset.ID);
            params.append('user_id', selectedUserId);

            await axios.post('/api/assets-kso/laptop/assign', params);
            setShowAssignModal(false);
            fetchData();
        } catch (error) {
            alert('Gagal update assignment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateLabel = async () => {
        setSubmitting(true);
        try {
            const params = new URLSearchParams();
            params.append('asset_id', currentAsset.ID);
            params.append('device_name', newLabel);

            await axios.post('/api/assets-kso/update-label', params);
            setShowLabelModal(false);
            fetchData();
        } catch (error) {
            alert('Gagal update label');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredAssets = data.assets.filter(asset =>
        asset.InventoryNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.SerialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.AssetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.User?.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.DeviceName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>Asset Management</h1>
                    <p style={{ color: 'var(--text-light)' }}>Kelola distribusi aset kategori <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{selectedCategory}</span></p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <div style={{ width: '220px' }}>
                        <SearchableSelect
                            value={selectedCategory}
                            onChange={(val) => setSelectedCategory(val)}
                            options={data.categories.map(cat => ({
                                value: cat.Name,
                                label: cat.Name
                            }))}
                            placeholder="Pilih Kategori"
                        />
                    </div>

                    <div className="search-container">
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari asset, SN, pemegang..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>No. Inventaris</th>
                                <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Informasi Aset</th>
                                <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Pemegang</th>
                                <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Cabang / Jabatan</th>
                                <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Label Device</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '5rem', textAlign: 'center' }}>
                                        <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                    </td>
                                </tr>
                            ) : filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                        Tidak ada data {selectedCategory.toLowerCase()} ditemukan.
                                    </td>
                                </tr>
                            ) : filteredAssets.map((asset) => (
                                <tr key={asset.ID} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="table-row-hover">
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.938rem', marginBottom: '0.25rem' }}>{asset.InventoryNumber}</div>
                                        <div style={{ fontSize: '0.688rem', color: '#64748b', background: '#f8fafc', padding: '0.125rem 0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                                            <Barcode size={10} /> {asset.SerialNumber}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155', marginBottom: '0.125rem' }}>{asset.AssetName}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{asset.Brand} {asset.TypeModel}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        {asset.User ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(30, 89, 197, 0.05)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, border: '1px solid rgba(30, 89, 197, 0.1)' }}>
                                                    {asset.User.Name?.[0]}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{asset.User.Name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{asset.User.NIK}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.813rem', background: '#f8fafc', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>Belum di-assign</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        {asset.User ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <div style={{ fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 500, color: '#475569' }}>
                                                    <Building2 size={12} color="#94a3b8" /> {asset.User.Branch}
                                                </div>
                                                <div style={{ fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, color: 'var(--primary)' }}>
                                                    <Briefcase size={12} color="var(--primary)" /> {asset.User.Position}
                                                </div>
                                            </div>
                                        ) : <span style={{ color: '#cbd5e1' }}>-</span>}
                                    </td>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        {asset.DeviceName ? (
                                            <span style={{ background: 'rgba(99, 102, 241, 0.05)', color: '#6366f1', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.1)' }}>{asset.DeviceName}</span>
                                        ) : (
                                            <span style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 500 }}>No Label</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => openAssignModal(asset)}
                                                style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: 'var(--primary)', display: 'flex', cursor: 'pointer', transition: 'all 0.2s' }}
                                                className="btn-action-hover"
                                                title="Assign User"
                                            >
                                                <UserPlus size={18} />
                                            </button>
                                            <button
                                                onClick={() => openLabelModal(asset)}
                                                style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#6366f1', display: 'flex', cursor: 'pointer', transition: 'all 0.2s' }}
                                                className="btn-action-hover"
                                                title="Edit Label"
                                            >
                                                <PencilLine size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Assign Modal */}
            {showAssignModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem', backdropFilter: 'blur(4px)' }}>
                    <div className="chart-container" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Assign User</h2>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Aset</label>
                            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', fontWeight: 500 }}>
                                {currentAsset.InventoryNumber} - {currentAsset.AssetName}
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <SearchableSelect
                                label="Pilih Karyawan"
                                value={selectedUserId}
                                onChange={(val) => setSelectedUserId(val)}
                                options={[
                                    { value: '', label: '-- Unassign / Kosongkan --' },
                                    ...data.users.map(user => ({
                                        value: user.ID,
                                        label: `${user.Name} - ${user.NIK} (${user.Branch})`
                                    }))
                                ]}
                                placeholder="Pilih Karyawan"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowAssignModal(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', fontWeight: 600 }}>Batal</button>
                            <button
                                onClick={handleAssign}
                                disabled={submitting}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {submitting && <Loader2 className="animate-spin" size={18} />}
                                Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Label Modal */}
            {showLabelModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem', backdropFilter: 'blur(4px)' }}>
                    <div className="chart-container" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Update Label Device</h2>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Label / Nama Perangkat</label>
                            <input
                                type="text"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                placeholder="Contoh: NB-KSO001"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowLabelModal(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', fontWeight: 600 }}>Batal</button>
                            <button
                                onClick={handleUpdateLabel}
                                disabled={submitting}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#6366f1',
                                    color: 'white',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {submitting && <Loader2 className="animate-spin" size={18} />}
                                Update Label
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetManagement;
