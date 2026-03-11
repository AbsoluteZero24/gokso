import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Briefcase,
    Search,
    Loader2,
    Plus,
    Trash2,
    Edit,
    Database
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const MasterPosition = () => {
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState(null);
    const [formData, setFormData] = useState({ name: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Confirm modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        id: null,
        isLoading: false
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/master-data/position');
            setPositions(response.data.positions || []);
        } catch (error) {
            console.error('Error fetching positions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setEditingPosition(null);
        setFormData({ name: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (position) => {
        setEditingPosition(position);
        setFormData({ name: position.Name });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            id,
            isLoading: false
        });
    };

    const handleConfirmDelete = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
            await axios.delete(`/api/master-data/position/delete/${confirmModal.id}`);
            setConfirmModal({ isOpen: false, id: null, isLoading: false });
            fetchData();
        } catch (error) {
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
            alert('Gagal menghapus jabatan: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const params = new URLSearchParams();
            params.append('name', formData.name);

            if (editingPosition) {
                await axios.post(`/api/master-data/position/update/${editingPosition.ID}`, params);
            } else {
                await axios.post('/api/master-data/position/store', params);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert('Gagal menyimpan: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredPositions = positions.filter(p =>
        p.Name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Master Jabatan</h1>
                    <p style={{ color: 'var(--text-light)' }}>Kelola data jabatan di perusahaan</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="search-container">
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari jabatan..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                        <Plus size={20} /> Tambah Jabatan
                    </button>
                </div>
            </div>

            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', width: '80px' }}>No</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Nama Jabatan</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', textAlign: 'right' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="3" style={{ padding: '5rem', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                        ) : filteredPositions.length === 0 ? (
                            <tr>
                                <td colSpan="3" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Tidak ada data jabatan ditemukan.
                                </td>
                            </tr>
                        ) : filteredPositions.map((pos, idx) => (
                            <tr key={pos.ID} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="table-row-hover">
                                <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>{String(idx + 1).padStart(2, '0')}</td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(30, 89, 197, 0.05)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Briefcase size={18} />
                                        </div>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.938rem' }}>{pos.Name}</div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleEdit(pos)}
                                            style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s' }}
                                            className="btn-action-hover"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(pos.ID)}
                                            style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}
                                            className="btn-action-hover"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '2rem' }}>
                    <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>{editingPosition ? 'Edit Jabatan' : 'Tambah Jabatan'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: '2.5rem' }}>
                            <div style={{ marginBottom: '2.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Nama Jabatan</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Masukkan nama jabatan..."
                                    className="search-input"
                                    style={{ width: '100%', padding: '0.875rem 1.125rem', fontSize: '1rem' }}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.625rem' }}>* Contoh: Supervisor, Manager, Staf, Operator, dsb.</p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer', color: '#64748b' }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 2.5rem', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(30, 89, 197, 0.2)' }}
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                    Simpan Jabatan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmDelete}
                loading={confirmModal.isLoading}
                title="Hapus Jabatan"
                message="Apakah Anda yakin ingin menghapus jabatan ini? Semua karyawan dengan jabatan ini akan terpengaruh."
            />
        </div>
    );
};

export default MasterPosition;
