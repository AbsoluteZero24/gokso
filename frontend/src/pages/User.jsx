import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus,
    Trash2,
    Pencil,
    Search,
    Loader2,
    UserCog,
    Shield,
    Key
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const UserManagement = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        id: null,
        isLoading: false
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/setting/users');
            setAdmins(response.data.admins || []);
        } catch (error) {
            console.error('Error fetching admin users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
            await axios.delete(`/api/setting/users/delete/${confirmModal.id}`);
            setConfirmModal({ isOpen: false, id: null, isLoading: false });
            fetchData();
        } catch (error) {
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
            alert('Gagal menghapus user');
        }
    };

    const filteredAdmins = admins.filter(admin =>
        admin.Username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.EmployeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.NIK?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadge = (role) => {
        switch (role) {
            case 'super_admin': return { label: 'Super Admin', color: '#eff6ff', textColor: '#3b82f6', icon: Shield };
            case 'asset_manager': return { label: 'Asset Manager', color: '#f5f3ff', textColor: '#8b5cf6', icon: UserCog };
            case 'staf_it': return { label: 'Staf IT', color: '#ecfdf5', textColor: '#10b981', icon: Key };
            default: return { label: 'Support', color: '#f9fafb', textColor: '#6b7280', icon: UserCog };
        }
    };

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>User Management</h1>
                    <p style={{ color: 'var(--text-light)' }}>Manajemen hak akses admin panel</p>
                </div>

                <Link
                    to="/setting/user/create"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1.25rem',
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: 600
                    }}
                >
                    <Plus size={18} />
                    Tambah User
                </Link>
            </div>

            <div className="chart-container" style={{ padding: '0' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '50px', padding: '0.25rem 1rem', minWidth: '300px' }}>
                        <Search size={18} color="var(--primary)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari user admin..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', padding: '0.5rem 0' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Nama Karyawan</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Username</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Role</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Terdaftar</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center' }}>
                                        <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto' }} />
                                    </td>
                                </tr>
                            ) : filteredAdmins.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                        Tidak ada data user admin ditemukan.
                                    </td>
                                </tr>
                            ) : filteredAdmins.map((admin) => {
                                const badge = getRoleBadge(admin.Role);
                                return (
                                    <tr key={admin.ID} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="table-row-hover">
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.938rem', marginBottom: '0.125rem' }}>{admin.EmployeeName}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{admin.NIK}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <code style={{ background: 'rgba(225, 29, 72, 0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: '#e11d48', fontWeight: 600, fontSize: '0.813rem', border: '1px solid rgba(225, 29, 72, 0.1)' }}>{admin.Username}</code>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <span style={{
                                                padding: '0.375rem 0.75rem',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: badge.color,
                                                color: badge.textColor,
                                                border: `1px solid ${badge.textColor}20`,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}>
                                                <badge.icon size={14} />
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
                                            {new Date(admin.CreatedAt).toLocaleString('id-ID', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <Link to={`/setting/user/edit/${admin.ID}`} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #fbbf2430', background: '#fffbeb', color: '#d97706', display: 'flex' }}>
                                                    <Pencil size={18} />
                                                </Link>
                                                <button onClick={() => handleDelete(admin.ID)} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #f8717130', background: '#fef2f2', color: '#dc2626', display: 'flex', cursor: 'pointer' }}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmDelete}
                loading={confirmModal.isLoading}
                title="Hapus User Admin"
                message="Apakah Anda yakin ingin menghapus user admin ini? Hak akses mereka ke dashboard akan segera dicabut."
            />
        </div>
    );
};

export default UserManagement;
