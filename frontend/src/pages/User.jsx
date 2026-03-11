import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users,
    Search,
    UserPlus,
    Trash2,
    Edit,
    Loader2,
    Building2,
    Check,
    Download,
    Upload,
    X,
    Plus,
    Phone,
    Mail,
    Briefcase,
    Shield,
    Key,
    UserCog
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import SearchableSelect from '../components/SearchableSelect';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [importLoading, setImportLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [masterData, setMasterData] = useState({
        branches: [],
        departments: [],
        sub_departments: [],
        positions: []
    });
    const [roles, setRoles] = useState([]);

    // Edit State
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState(null);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        id: null,
        isLoading: false
    });

    const [formData, setFormData] = useState({
        nik: '',
        name: '',
        email: '',
        branch: '',
        department: '',
        sub_department: '',
        position: '',
        status_karyawan: 'Tetap',
        phone_number: '',
        role: '',
        password: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const userRes = await axios.get('/api/users');
            setUsers(userRes.data.users || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterData = async () => {
        try {
            const [b, d, sd, p, r] = await Promise.all([
                axios.get('/api/master-data/branch'),
                axios.get('/api/master-data/department'),
                axios.get('/api/master-data/sub-department'),
                axios.get('/api/master-data/position'),
                axios.get('/api/roles')
            ]);
            setMasterData({
                branches: b.data.branches || [],
                departments: d.data.departments || [],
                sub_departments: sd.data.sub_departments || [],
                positions: p.data.positions || []
            });
            setRoles(r.data.roles || []);
        } catch (error) {
            console.error('Error fetching master data:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchMasterData();
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
            // Check if there is an admin record for this user and delete it too
            const admin = admins.find(a => a.UserID === confirmModal.id);
            if (admin) {
                await axios.delete(`/api/setting/users/delete/${admin.ID}`);
            }
            
            await axios.delete(`/api/users/delete/${confirmModal.id}`);
            setConfirmModal({ isOpen: false, id: null, isLoading: false });
            fetchData();
        } catch (error) {
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
            console.error('Error deleting user:', error);
            alert('Gagal menghapus data.');
        }
    };

    const handleEdit = (user) => {
        setFormData({
            nik: user.NIK || '',
            name: user.Name || '',
            email: user.Email || '',
            branch: user.Branch || '',
            department: user.Department || '',
            sub_department: user.SubDepartment || '',
            position: user.Position || '',
            status_karyawan: user.StatusKaryawan || 'Tetap',
            phone_number: user.PhoneNumber || '',
            role: user.Role || '',
            password: ''
        });
        setEditId(user.ID);
        setIsEdit(true);
        setShowModal(true);
    };

    const handleExport = () => {
        window.open('/api/users/export', '_blank');
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportLoading(true);
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        try {
            const response = await axios.post('/api/users/import', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(response.data.message);
            fetchData();
        } catch (error) {
            console.error('Import error:', error);
            alert('Gagal mengimpor data: ' + (error.response?.data?.error || error.message));
        } finally {
            setImportLoading(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleStore = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            const params = new URLSearchParams();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== '') {
                    params.append(key, formData[key]);
                }
            });

            let savedUserId = editId;
            if (isEdit) {
                await axios.post(`/api/users/update/${editId}`, params);
            } else {
                const res = await axios.post('/api/users/store', params);
                // Handle both id and ID casing based on API response
                savedUserId = res.data.user?.id || res.data.user?.ID;
                if (!savedUserId) {
                    console.error('Failed to get saved user ID from response:', res.data);
                    throw new Error('Gagal mendapatkan ID user yang baru disimpan.');
                }
            }

            // No longer creating Admin record by default, as User table now has Role and Password.
            // auth_handler.go is updated to support login via User table Email/NIK.
            
            setShowModal(false);
            setEditId(null);
            setIsEdit(false);
            setFormData({
                nik: '', name: '', email: '', branch: '', department: '',
                sub_department: '', position: '', status_karyawan: 'Tetap',
                phone_number: '', role: '', password: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Gagal menyimpan data: ' + (error.response?.data?.error || error.message));
        } finally {
            setModalLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const query = searchTerm.toLowerCase();
        return (
            user.Name?.toLowerCase().includes(query) ||
            user.NIK?.toLowerCase().includes(query) ||
            user.Department?.toLowerCase().includes(query) ||
            user.Email?.toLowerCase().includes(query)
        );
    });

    const getRoleBadge = (roleName) => {
        switch (roleName) {
            case 'Super Admin': return { label: 'Super Admin', color: '#eff6ff', textColor: '#3b82f6', icon: Shield };
            case 'Koordinator': return { label: 'Koordinator', color: '#f5f3ff', textColor: '#8b5cf6', icon: UserCog };
            case 'Top Management': return { label: 'Top Management', color: '#ecfdf5', textColor: '#10b981', icon: Shield };
            case 'staf': return { label: 'staf', color: '#f0fdf4', textColor: '#15803d', icon: Key };
            default: return { label: roleName, color: '#f9fafb', textColor: '#6b7280', icon: Users };
        }
    };

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>User Management</h1>
                    <p style={{ color: 'var(--text-light)' }}>Kelola data karyawan dan hak akses aplikasi</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="search-container">
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari user atau NIK..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setIsEdit(false);
                            setEditId(null);
                            setFormData({
                                nik: '', name: '', email: '', branch: '', department: '',
                                sub_department: '', position: '', status_karyawan: 'Tetap',
                                phone_number: '', role: '', password: ''
                            });
                            setShowModal(true);
                        }}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                        <UserPlus size={20} /> Tambah User
                    </button>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={handleExport}
                            style={{ background: 'white', color: '#64748b', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Export ke Excel"
                        >
                            <Download size={20} />
                        </button>
                        <label
                            style={{ background: 'white', color: '#64748b', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: '12px', cursor: importLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Import via Excel/CSV"
                        >
                            {importLoading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                            <input type="file" hidden accept=".csv, .xlsx" onChange={handleImport} disabled={importLoading} />
                        </label>
                    </div>
                </div>
            </div>

            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Personel</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Unit / Bagian</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Akses Login</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Status</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', textAlign: 'right' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '5rem', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Tidak ada data user ditemukan.
                                </td>
                            </tr>
                        ) : filteredUsers.map((user) => {
                            const roleName = user.Role;
                            const badge = roleName ? getRoleBadge(roleName) : null;
                            
                            return (
                                <tr key={user.ID} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="table-row-hover">
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: '42px', height: '42px', background: 'rgba(30, 89, 197, 0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1rem', fontWeight: 700 }}>
                                                {user.Name.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.938rem', marginBottom: '0.125rem' }}>{user.Name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>NIK: {user.NIK}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                            <Building2 size={12} /> {user.Branch}
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>{user.Department}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        {user.Role ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>{user.Email}</div>
                                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>NIK: {user.NIK}</div>
                                                </div>
                                                {badge && (
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        background: badge.color,
                                                        color: badge.textColor,
                                                        width: 'fit-content',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}>
                                                        <badge.icon size={10} /> {badge.label}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic' }}>No login access</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <span style={{
                                            padding: '0.375rem 0.75rem',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: user.StatusKaryawan === 'Tetap' ? '#f0fdf4' : '#f8fafc',
                                            color: user.StatusKaryawan === 'Tetap' ? '#166534' : '#64748b',
                                            border: user.StatusKaryawan === 'Tetap' ? '1px solid #dcfce7' : '1px solid #e2e8f0'
                                        }}>
                                            {user.StatusKaryawan}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button onClick={() => handleEdit(user)} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: 'var(--primary)', cursor: 'pointer' }}><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(user.ID)} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Unified User Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '2rem' }}>
                    <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '850px', maxHeight: '95vh', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>{isEdit ? 'Edit Data User' : 'Tambah User Baru'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-light)' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleStore} style={{ padding: '2rem', overflowY: 'auto' }}>
                            {/* Personal Info Section */}
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '1.25rem', borderBottom: '2px solid #eff6ff', paddingBottom: '0.5rem' }}>Informasi Dasar</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>NIK</label>
                                        <input
                                            type="text" required placeholder="Contoh: 12345"
                                            value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Nama Lengkap</label>
                                        <input
                                            type="text" required placeholder="Nama lengkap..."
                                            value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Email</label>
                                        <input
                                            type="email" placeholder="name@company.com"
                                            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>No. Telepon</label>
                                        <input
                                            type="text" placeholder="0812..."
                                            value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Organization Section */}
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '1.25rem', borderBottom: '2px solid #eff6ff', paddingBottom: '0.5rem' }}>Penugasan</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <SearchableSelect
                                        label="Cabang" required
                                        value={formData.branch} onChange={(val) => setFormData({ ...formData, branch: val })}
                                        options={masterData.branches.map(b => ({ value: b.Name, label: b.Name }))}
                                        placeholder="Pilih Cabang"
                                    />
                                    <SearchableSelect
                                        label="Bagian" required
                                        value={formData.department} onChange={(val) => setFormData({ ...formData, department: val, sub_department: '' })}
                                        options={masterData.departments.map(d => ({ value: d.Name, label: d.Name }))}
                                        placeholder="Pilih Bagian"
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <SearchableSelect
                                        label="Jabatan" required
                                        value={formData.position} onChange={(val) => setFormData({ ...formData, position: val })}
                                        options={masterData.positions.map(p => ({ value: p.Name, label: p.Name }))}
                                        placeholder="Pilih Jabatan"
                                    />
                                    <SearchableSelect
                                        label="Status Karyawan" required
                                        value={formData.status_karyawan} onChange={(val) => setFormData({ ...formData, status_karyawan: val })}
                                        options={[
                                            { value: 'Tetap', label: 'Tetap' },
                                            { value: 'Kontrak', label: 'Kontrak' },
                                            { value: 'Probation', label: 'Probation' }
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Login Access Section */}
                            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                                <div style={{ fontWeight: 800, fontSize: '0.813rem', color: '#475569', textTransform: 'uppercase', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                    <Shield size={18} color="var(--primary)" /> Akses Login Aplikasi (Opsional)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Role Access</label>
                                        <select
                                            value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '0.875rem' }}
                                        >
                                            <option value="">No Access</option>
                                            {roles.map(r => <option key={r.ID} value={r.Name}>{r.Name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Password {isEdit && '(Fill to change)'}</label>
                                        <input
                                            type="password" placeholder="••••••••"
                                            value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                        />
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1rem', fontWeight: 500 }}>* Jika Role diisi, user ini dapat login menggunakan Email atau NIK sebagai kredensial.</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>Batal</button>
                                <button
                                    type="submit" disabled={modalLoading}
                                    style={{ padding: '0.75rem 2rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(30, 89, 197, 0.2)' }}
                                >
                                    {modalLoading ? <Loader2 className="animate-spin" size={20} /> : (isEdit ? <Check size={20} /> : <Plus size={20} />)}
                                    {isEdit ? 'Simpan Perubahan' : 'Simpan User'}
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
                title="Hapus User"
                message="Apakah Anda yakin ingin menghapus data user ini? Seluruh data akses login juga akan dihapus."
            />
        </div>
    );
};

export default UserManagement;
