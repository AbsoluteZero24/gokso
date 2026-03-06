import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Building2,
    Search,
    Loader2,
    Plus,
    Trash2,
    Edit,
    ArrowRight
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const MasterBranch = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
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
            const response = await axios.get('/api/master-data/branch');
            setBranches(response.data.branches || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setEditingBranch(null);
        setFormData({ name: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (branch) => {
        setEditingBranch(branch);
        setFormData({ name: branch.Name });
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
            await axios.delete(`/api/master-data/branch/delete/${confirmModal.id}`);
            setConfirmModal({ isOpen: false, id: null, isLoading: false });
            fetchData();
        } catch (error) {
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
            alert('Gagal menghapus cabang: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const params = new URLSearchParams();
            params.append('name', formData.name);

            if (editingBranch) {
                await axios.post(`/api/master-data/branch/update/${editingBranch.ID}`, params);
            } else {
                await axios.post('/api/master-data/branch/store', params);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert('Gagal menyimpan: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredBranches = branches.filter(b =>
        b.Name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Master Cabang</h1>
                    <p style={{ color: 'var(--text-light)' }}>Daftar seluruh cabang perusahaan</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="search-container">
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari cabang..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                        <Plus size={20} /> Tambah Cabang
                    </button>
                </div>
            </div>

            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', width: '80px' }}>No</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Nama Cabang</th>
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
                        ) : filteredBranches.length === 0 ? (
                            <tr>
                                <td colSpan="3" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Tidak ada data cabang ditemukan.
                                </td>
                            </tr>
                        ) : filteredBranches.map((branch, idx) => (
                            <tr key={branch.ID} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="table-row-hover">
                                <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>{String(idx + 1).padStart(2, '0')}</td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(30, 89, 197, 0.05)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Building2 size={18} />
                                        </div>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.938rem' }}>{branch.Name}</div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleEdit(branch)}
                                            style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s' }}
                                            className="btn-action-hover"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(branch.ID)}
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="chart-container" style={{ width: '100%', maxWidth: '450px', margin: '1rem', position: 'relative' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{editingBranch ? 'Edit Cabang' : 'Tambah Cabang'}</h2>
                            <p style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Masukkan nama cabang baru perusahaan</p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#64748b' }}>Nama Cabang</label>
                                <input
                                    type="text"
                                    required
                                    className="search-input"
                                    style={{ width: '100%', padding: '0.75rem 1rem' }}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                                    Simpan
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
                title="Hapus Cabang"
                message="Apakah Anda yakin ingin menghapus cabang ini? Semua karyawan di cabang ini akan terpengaruh."
            />
        </div>
    );
};

export default MasterBranch;
