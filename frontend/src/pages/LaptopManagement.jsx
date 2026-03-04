import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Laptop,
    Search,
    Loader2,
    UserPlus,
    PencilLine,
    CircleCheck,
    CircleX,
    Hash,
    Barcode,
    Building2,
    Briefcase
} from 'lucide-react';

const LaptopManagement = () => {
    const [data, setData] = useState({ assets: [], users: [] });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
            const response = await axios.get('/api/assets-kso/laptop');
            setData(response.data);
        } catch (error) {
            console.error('Error fetching laptop data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>Laptop Management</h1>
                    <p style={{ color: 'var(--text-light)' }}>Manajemen pemegang aset laptop perusahaan</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '50px', padding: '0.25rem 1rem', minWidth: '350px' }}>
                    <Search size={18} color="var(--primary)" style={{ marginRight: '0.75rem' }} />
                    <input
                        type="text"
                        placeholder="Cari asset, SN, pemegang..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', padding: '0.5rem 0', fontWeight: 500 }}
                    />
                </div>
            </div>

            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>No. Inventaris</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Informasi Aset</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Pemegang</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Cabang / Jabatan</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Label Device</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Aksi</th>
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
                                        Tidak ada data laptop ditemukan.
                                    </td>
                                </tr>
                            ) : filteredAssets.map((asset) => (
                                <tr key={asset.ID} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{asset.InventoryNumber}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Barcode size={10} /> {asset.SerialNumber}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{asset.AssetName}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{asset.Brand} {asset.Model}</div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        {asset.User ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                                                    {asset.User.Name?.[0]}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{asset.User.Name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{asset.User.NIK}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.875rem' }}>Belum di-assign</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        {asset.User ? (
                                            <>
                                                <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                                    <Building2 size={14} color="var(--text-light)" /> {asset.User.Branch}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Briefcase size={14} color="var(--text-light)" /> {asset.User.Position}
                                                </div>
                                            </>
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        {asset.DeviceName ? (
                                            <span style={{ background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>{asset.DeviceName}</span>
                                        ) : (
                                            <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>No Label</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => openAssignModal(asset)}
                                                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: 'var(--primary)', display: 'flex' }}
                                                title="Assign User"
                                            >
                                                <UserPlus size={18} />
                                            </button>
                                            <button
                                                onClick={() => openLabelModal(asset)}
                                                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#6366f1', display: 'flex' }}
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
                    <div className="chart-container" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Assign User</h2>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Aset</label>
                            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', fontWeight: 500 }}>
                                {currentAsset.InventoryNumber} - {currentAsset.AssetName}
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Pilih Karyawan</label>
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                            >
                                <option value="">-- Unassign / Kosongkan --</option>
                                {data.users.map(user => (
                                    <option key={user.ID} value={user.ID}>{user.Name} - {user.NIK} ({user.Branch})</option>
                                ))}
                            </select>
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
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

export default LaptopManagement;
