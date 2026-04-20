import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ShieldCheck,
    Plus,
    Search,
    Edit,
    Trash2,
    Loader2,
    ShieldAlert,
    Check,
    X,
    Server,
    Users,
    Key,
    ChevronRight
} from 'lucide-react';
import ConfirmModal from '../../components/shared/ConfirmModal';

/**
 * Komponen Roles: Mengelola hak akses (permission) dan tingkatan pengguna (role)
 * Halaman ini memungkinkan Super Admin untuk menambah, mengedit, dan menghapus role sistem.
 */
const Roles = () => {
    // State untuk menyimpan daftar role dari database
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State untuk kontrol Modal
    const [showModal, setShowModal] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    
    // State untuk menyimpan ID modul mana saja yang sedang dibuka (expanded) di daftar checkbox
    const [expandedGroups, setExpandedGroups] = useState([]);

    // State data role baru/yang sedang diedit
    const [newRole, setNewRole] = useState({
        name: '',
        description: '',
        permissions: [],
        dms_filter_scope: 'All',
        allowed_sections: ''
    });

    // State untuk modal konfirmasi penghapusan
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        id: null,
        isLoading: false
    });

    /**
     * Struktur hierarki perizinan modul.
     * Digunakan untuk merender daftar switch/checkbox di dalam modal.
     */
    const permissionGroups = [
        { id: 'view_dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
        {
            id: 'view_goasset',
            label: 'GoAsset (Main Menu)',
            children: [
                {
                    id: 'view_inventory',
                    label: 'Inventori (Module)',
                    children: [
                        { id: 'view_asset_list', label: 'Aset' },
                        { id: 'view_asset_service', label: 'Service' },
                        { id: 'view_asset_warehouse', label: 'Gudang' },
                        { id: 'view_asset_inactive', label: 'Inactive' }
                    ]
                },
                { id: 'view_asset_management', label: 'Asset Management' }
            ]
        },
        { id: 'view_goform', label: 'GoForm', icon: 'FileText' },
        { id: 'view_gosign', label: 'GoSign', icon: 'Check' },
        {
            id: 'view_godms',
            label: 'GoDMS (Main Menu)',
            children: [
                { id: 'view_edoc', label: 'eDoc' },
                { id: 'view_edid', label: 'eDID' },
                { id: 'view_trash', label: 'Trash' }
            ]
        },
        {
            id: 'view_administration',
            label: 'Administration (Main Menu)',
            children: [
                { id: 'view_employee_list', label: 'Employee List' }
            ]
        },
        {
            id: 'view_setting',
            label: 'Setting (Main Menu)',
            children: [
                {
                    id: 'view_master_collection',
                    label: 'Master Collection',
                    children: [
                        { id: 'view_master_category', label: 'Master Kategori' },
                        { id: 'view_master_branch', label: 'Master Cabang' },
                        { id: 'view_master_department', label: 'Master Bagian' },
                        { id: 'view_master_position', label: 'Master Jabatan' }
                    ]
                },
                { id: 'view_roles', label: 'Roles Management' }
            ]
        }
    ];

    /**
     * Fungsi rekursif untuk mendapatkan semua ID anak dari suatu modul.
     * Digunakan saat mematikan modul utama, sehingga anak-anaknya juga ikut mati.
     */
    const getAllChildIds = (item) => {
        let ids = [];
        if (item.children) {
            item.children.forEach(child => {
                ids.push(child.id);
                ids = [...ids, ...getAllChildIds(child)];
            });
        }
        return ids;
    };

    /**
     * Mengambil data roles dari API backend.
     */
    // Mengambil daftar tingkatan hak akses (role) dari server
    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/roles');
            // Menstandarisasi format data dari backend (menggunakan kunci huruf kecil sesuai model Go)
            const formattedRoles = (response.data.roles || []).map(r => ({
                id: r.id || r.ID,
                name: r.name || r.Name,
                description: r.description || r.Description,
                permissions: (r.permissions || r.Permissions) ? (r.permissions || r.Permissions).split(',').map(p => p.trim()) : [],
                dms_filter_scope: r.dms_filter_scope || r.DMSFilterScope || 'All',
                allowed_sections: r.allowed_sections || r.AllowedSections || '',
                userCount: r.user_count || r.UserCount || 0
            }));
            setRoles(formattedRoles);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching roles:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    /**
     * Menyimpan data role (Tambah atau Update).
     */
    const handleStore = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('name', newRole.name);
            params.append('description', newRole.description);
            params.append('permissions', newRole.permissions.join(','));
            params.append('dms_filter_scope', newRole.dms_filter_scope);
            params.append('allowed_sections', newRole.allowed_sections);

            if (isEdit) {
                await axios.post(`/api/roles/update/${editId}`, params);
            } else {
                await axios.post('/api/roles/store', params);
            }

            setShowModal(false);
            setNewRole({ name: '', description: '', permissions: [], dms_filter_scope: 'All', allowed_sections: '' });
            setSuccessMessage(isEdit ? 'Role berhasil diperbarui!' : 'Role berhasil dibuat!');
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error storing role:', error);
            alert('Gagal menyimpan role: ' + (error.response?.data?.error || error.message));
        } finally {
            setModalLoading(false);
        }
    };

    /**
     * Menyiapkan modal untuk proses edit role.
     */
    const handleEdit = (role) => {
        setNewRole({
            name: role.name,
            description: role.description,
            permissions: role.permissions || [],
            dms_filter_scope: role.dms_filter_scope || 'All',
            allowed_sections: role.allowed_sections || ''
        });
        setEditId(role.id);
        setIsEdit(true);
        setShowModal(true);
    };

    /**
     * Membuka modal konfirmasi hapus.
     */
    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            id,
            isLoading: false
        });
    };

    /**
     * Mengeksekusi penghapusan role melalui API.
     */
    const handleConfirmDelete = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
            await axios.delete(`/api/roles/delete/${confirmModal.id}`);
            setConfirmModal({ isOpen: false, id: null, isLoading: false });
            fetchData();
        } catch (error) {
            console.error('Error deleting role:', error);
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
            alert('Gagal menghapus role.');
        }
    };

    /**
     * Membuka atau menutup grup perizinan (collapse/expand).
     */
    const toggleExpansion = (id, e) => {
        e.stopPropagation();
        setExpandedGroups(prev => 
            prev.includes(id) 
                ? prev.filter(g => g !== id) 
                : [...prev, id]
        );
    };

    /**
     * Mengaktifkan atau menonaktifkan izin untuk suatu modul.
     */
    const togglePermission = (item) => {
        const isCurrentlyActive = newRole.permissions.includes(item.id);
        const childIds = getAllChildIds(item);

        setNewRole(prev => {
            let nextPermissions = [...prev.permissions];
            
            if (isCurrentlyActive) {
                // Matikan modul ini dan semua modul di bawahnya (anak)
                nextPermissions = nextPermissions.filter(p => p !== item.id && !childIds.includes(p));
            } else {
                // Aktifkan modul ini
                nextPermissions.push(item.id);
            }
            
            return { ...prev, permissions: nextPermissions };
        });

        // Otomatis buka daftar anak saat modul utama diaktifkan
        if (!isCurrentlyActive && item.children) {
            setExpandedGroups(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
        }
    };

    // Filter role berdasarkan pencarian di UI
    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-content">
            {/* Header Halaman */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Role Management</h1>
                    <p style={{ color: 'var(--text-light)' }}>Kelola tingkatan akses dan hak istimewa pengguna sistem.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {successMessage && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem' }}>
                            <ShieldCheck size={18} /> {successMessage}
                        </div>
                    )}
                    <div className="search-container">
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari role..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setIsEdit(false);
                            setNewRole({ name: '', description: '', permissions: [], dms_filter_scope: 'All', allowed_sections: '' });
                            setShowModal(true);
                        }}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                        <Plus size={20} /> Tambah Role
                    </button>
                </div>
            </div>

            {/* Tabel Daftar Role */}
            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Role Name</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Description</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Users</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '5rem', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                        ) : filteredRoles.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Tidak ada role ditemukan.
                                </td>
                            </tr>
                        ) : filteredRoles.map((role, idx) => {
                            const roleId = role.id || role.ID;
                            const roleName = role.name || role.Name || '-';
                            const roleDesc = role.description || role.Description || '-';
                            const roleUserCount = role.userCount || 0;

                            return (
                                <tr key={roleId} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: '40px', height: '40px', background: 'rgba(30, 89, 197, 0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                <ShieldCheck size={20} />
                                            </div>
                                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{roleName}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                                        {roleDesc}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                                            <Users size={16} color="#94a3b8" /> {roleUserCount} Users
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button onClick={() => handleEdit(role)} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: 'var(--primary)', cursor: 'pointer' }} title="Edit Hak Akses"><Edit size={16} /></button>
                                            <button 
                                                onClick={() => handleDelete(roleId)} 
                                                disabled={roleName === 'Super Admin'} 
                                                style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: '#ef4444', cursor: roleName === 'Super Admin' ? 'not-allowed' : 'pointer', opacity: roleName === 'Super Admin' ? 0.5 : 1 }}
                                                title="Hapus Role"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal Tambah/Edit Role */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '2rem' }}>
                    <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '800px', maxHeight: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        {/* Judul Modal */}
                        <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>{isEdit ? 'Edit Hak Akses Role' : 'Tambah Role Baru'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleStore} style={{ padding: '2.5rem', overflowY: 'auto' }}>
                            {/* Input Nama & Deskripsi */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Role Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: IT Administrator"
                                        value={newRole.name}
                                        onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Description</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Jelaskan cakupan akses role ini..."
                                        value={newRole.description}
                                        onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }}
                                    />
                                </div>
                            </div>

                            {/* Daftar Perizinan Modul */}
                            <div style={{ marginBottom: '2.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '1.25rem', textTransform: 'uppercase' }}>Module Permissions</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {permissionGroups.map(group => {
                                        const renderPermissionItem = (item, depth = 0) => {
                                            const isActive = newRole.permissions.includes(item.id);
                                            const hasChildren = item.children && item.children.length > 0;
                                            
                                            return (
                                                <React.Fragment key={item.id}>
                                                    <div 
                                                        onClick={() => togglePermission(item)}
                                                        style={{ 
                                                            padding: '0.875rem 1.25rem', 
                                                            borderRadius: '16px', 
                                                            border: '1px solid',
                                                            borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                                                            background: isActive ? 'rgba(30, 89, 197, 0.05)' : 'white',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '1rem',
                                                            marginLeft: `${depth * 2.5}rem`,
                                                            transition: 'all 0.2s',
                                                            boxShadow: isActive ? '0 4px 6px -1px rgba(30, 89, 197, 0.1)' : 'none'
                                                        }}
                                                    >
                                                        {/* Switch Toggle */}
                                                        <div 
                                                            style={{ 
                                                                width: '40px', 
                                                                height: '22px', 
                                                                borderRadius: '11px', 
                                                                background: isActive ? 'var(--primary)' : '#e2e8f0',
                                                                position: 'relative',
                                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            <div style={{ 
                                                                position: 'absolute',
                                                                top: '2px',
                                                                left: isActive ? '20px' : '2px',
                                                                width: '18px',
                                                                height: '18px',
                                                                borderRadius: '50%',
                                                                background: 'white',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                            }} />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.938rem', fontWeight: 700, color: isActive ? 'var(--primary)' : '#1e293b' }}>{item.label}</div>
                                                            {depth === 0 && <div style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.025em' }}>MAIN MODULE</div>}
                                                        </div>
                                                        {/* Tombol Expand/Collapse untuk modul yang punya sub-menu */}
                                                        {hasChildren && (
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => toggleExpansion(item.id, e)}
                                                                style={{ 
                                                                    border: 'none', 
                                                                    background: 'none', 
                                                                    padding: '0.5rem', 
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    borderRadius: '8px',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <ChevronRight size={18} style={{ 
                                                                    transform: expandedGroups.includes(item.id) ? 'rotate(90deg)' : 'none', 
                                                                    transition: 'transform 0.3s', 
                                                                    color: '#94a3b8' 
                                                                }} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Merender anak (sub-menu) jika statusnya terbuka (expanded) */}
                                                    {hasChildren && expandedGroups.includes(item.id) && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
                                                            {item.children.map(child => renderPermissionItem(child, depth + 1))}
                                                        </div>
                                                    )}
                                                </React.Fragment>
                                            );
                                        };
                                        
                                        return renderPermissionItem(group);
                                    })}
                                </div>
                            </div>

                            {/* Konfigurasi Tingkat Lanjut (DMS Scope & Section) */}
                            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <div style={{ width: '32px', height: '32px', background: 'var(--primary)', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Server size={18} />
                                    </div>
                                    <h4 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Advanced Configurations</h4>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    {/* Cakupan Visibilitas Dokumen (GoDMS) */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>DMS Visibility Scope</label>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            {['All', 'Department'].map(scope => (
                                                <button
                                                    key={scope}
                                                    type="button"
                                                    onClick={() => setNewRole({ ...newRole, dms_filter_scope: scope })}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.75rem',
                                                        borderRadius: '10px',
                                                        border: '1px solid',
                                                        borderColor: newRole.dms_filter_scope === scope ? 'var(--primary)' : 'var(--border)',
                                                        background: newRole.dms_filter_scope === scope ? 'white' : 'transparent',
                                                        color: newRole.dms_filter_scope === scope ? 'var(--primary)' : '#64748b',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        fontSize: '0.875rem'
                                                    }}
                                                >
                                                    {scope === 'All' ? 'Full Access' : 'Department Only'}
                                                </button>
                                            ))}
                                        </div>
                                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem', fontWeight: 500 }}>
                                            {newRole.dms_filter_scope === 'All' 
                                                ? 'User can see all documents across all departments.' 
                                                : "User can only see documents matching their assigned department."}
                                        </p>
                                    </div>

                                    {/* Pembatasan Bagian Tertentu (Opsional) */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Specific Allowed Sections (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="Sistem Informasi, Operasi, dll..."
                                            value={newRole.allowed_sections}
                                            onChange={(e) => setNewRole({ ...newRole, allowed_sections: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.875rem' }}
                                        />
                                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem', fontWeight: 500 }}>
                                            Pisahkan dengan koma. Kosongkan jika ingin menggunakan departemen utama user.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tombol Aksi Modal */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>Batal</button>
                                <button
                                    type="submit"
                                    disabled={modalLoading}
                                    style={{ padding: '0.75rem 2.5rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(30, 89, 197, 0.2)' }}
                                >
                                    {modalLoading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                    {isEdit ? 'Simpan Perubahan' : 'Buat Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmDelete}
                loading={confirmModal.isLoading}
                title="Hapus Role"
                message="Apakah Anda yakin ingin menghapus role ini? Pengguna yang terikat dengan role ini akan kehilangan akses spesifik mereka."
            />
        </div>
    );
};

export default Roles;
