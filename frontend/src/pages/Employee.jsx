import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users,
    Search,
    UserPlus,
    Trash2,
    Edit,
    Loader2,
    MoreVertical,
    Mail,
    Briefcase,
    Building2,
    Check,
    Download,
    Upload,
    X,
    Plus,
    Phone
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import SearchableSelect from '../components/SearchableSelect';

const EmployeeList = () => {
    const [employees, setEmployees] = useState([]);
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

    // Edit State
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState(null);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        id: null,
        isLoading: false
    });

    const [newEmployee, setNewEmployee] = useState({
        nik: '',
        name: '',
        email: '',
        branch: '',
        department: '',
        sub_department: '',
        position: '',
        status_karyawan: 'Tetap',
        phone_number: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/employees');
            setEmployees(response.data.employees || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterData = async () => {
        try {
            const [b, d, sd, p] = await Promise.all([
                axios.get('/api/master-data/branch'),
                axios.get('/api/master-data/department'),
                axios.get('/api/master-data/sub-department'),
                axios.get('/api/master-data/position')
            ]);
            setMasterData({
                branches: b.data.branches || [],
                departments: d.data.departments || [],
                sub_departments: sd.data.sub_departments || [],
                positions: p.data.positions || []
            });
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
            await axios.delete(`/api/employees/delete/${confirmModal.id}`);
            setConfirmModal({ isOpen: false, id: null, isLoading: false });
            fetchData();
        } catch (error) {
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
            console.error('Error deleting employee:', error);
            alert('Gagal menghapus karyawan.');
        }
    };

    const handleEdit = (emp) => {
        setNewEmployee({
            nik: emp.NIK || '',
            name: emp.Name || '',
            email: emp.Email || '',
            branch: emp.Branch || '',
            department: emp.Department || '',
            sub_department: emp.SubDepartment || '',
            position: emp.Position || '',
            status_karyawan: emp.StatusKaryawan || 'Tetap',
            phone_number: emp.PhoneNumber || ''
        });
        setEditId(emp.ID);
        setIsEdit(true);
        setShowModal(true);
    };

    const handleExport = () => {
        window.open('/api/employees/export', '_blank');
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/api/employees/import', formData, {
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
            Object.keys(newEmployee).forEach(key => params.append(key, newEmployee[key]));

            if (isEdit) {
                await axios.post(`/api/employees/update/${editId}`, params);
            } else {
                await axios.post('/api/employees/store', params);
            }

            setShowModal(false);
            setEditId(null);
            setIsEdit(false);
            setNewEmployee({
                nik: '',
                name: '',
                email: '',
                branch: '',
                department: '',
                sub_department: '',
                position: '',
                status_karyawan: 'Tetap',
                phone_number: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error storing employee:', error);
            alert('Gagal menambah karyawan.');
        } finally {
            setModalLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const query = searchTerm.toLowerCase();
        return (
            emp.Name?.toLowerCase().includes(query) ||
            emp.NIK?.toLowerCase().includes(query) ||
            emp.Department?.toLowerCase().includes(query) ||
            emp.Branch?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Daftar Karyawan</h1>
                    <p style={{ color: 'var(--text-light)' }}>Kelola data seluruh karyawan perusahaan</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="search-container">
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari karyawan..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setIsEdit(false);
                            setEditId(null);
                            setNewEmployee({
                                nik: '',
                                name: '',
                                email: '',
                                branch: '',
                                department: '',
                                sub_department: '',
                                position: '',
                                status_karyawan: 'Tetap',
                                phone_number: ''
                            });
                            setShowModal(true);
                        }}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                        <UserPlus size={20} /> Tambah Karyawan
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
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Karyawan</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Unit / Bagian</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Kontak</th>
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
                        ) : filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Tidak ada data karyawan ditemukan.
                                </td>
                            </tr>
                        ) : filteredEmployees.map((emp) => (
                            <tr key={emp.ID} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="table-row-hover">
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '42px', height: '42px', background: 'rgba(30, 89, 197, 0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1rem', fontWeight: 700 }}>
                                            {emp.Name.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.938rem', marginBottom: '0.125rem' }}>{emp.Name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>NIK: {emp.NIK}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                        <Building2 size={12} /> {emp.Branch}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155', marginBottom: '0.25rem' }}>{emp.Department}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.813rem', color: 'var(--primary)', fontWeight: 600 }}>
                                        <Briefcase size={12} /> {emp.Position}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                                        <Mail size={14} /> {emp.Email || '-'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                        <Phone size={14} /> {emp.PhoneNumber || '-'}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <span style={{
                                        padding: '0.375rem 0.75rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: emp.StatusKaryawan === 'Tetap' ? '#f0fdf4' : '#f8fafc',
                                        color: emp.StatusKaryawan === 'Tetap' ? '#166534' : '#64748b',
                                        border: emp.StatusKaryawan === 'Tetap' ? '1px solid #dcfce7' : '1px solid #e2e8f0'
                                    }}>
                                        {emp.StatusKaryawan}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button onClick={() => handleEdit(emp)} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: 'var(--primary)', cursor: 'pointer' }}><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(emp.ID)} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Employee Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>{isEdit ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-light)' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleStore} style={{ padding: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>NIK</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: 12345"
                                        value={newEmployee.nik}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, nik: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Nama Lengkap</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nama lengkap..."
                                        value={newEmployee.name}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Email</label>
                                    <input
                                        type="email"
                                        placeholder="name@company.com"
                                        value={newEmployee.email}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>No. Telepon</label>
                                    <input
                                        type="text"
                                        placeholder="0812..."
                                        value={newEmployee.phone_number}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, phone_number: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <SearchableSelect
                                    label="Cabang"
                                    required
                                    value={newEmployee.branch}
                                    onChange={(val) => setNewEmployee({ ...newEmployee, branch: val })}
                                    options={masterData.branches.map(b => ({ value: b.Name, label: b.Name }))}
                                    placeholder="Pilih Cabang"
                                />
                                <SearchableSelect
                                    label="Bagian"
                                    required
                                    value={newEmployee.department}
                                    onChange={(val) => setNewEmployee({ ...newEmployee, department: val })}
                                    options={masterData.departments.map(d => ({ value: d.Name, label: d.Name }))}
                                    placeholder="Pilih Bagian"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                <SearchableSelect
                                    label="Jabatan"
                                    required
                                    value={newEmployee.position}
                                    onChange={(val) => setNewEmployee({ ...newEmployee, position: val })}
                                    options={masterData.positions.map(p => ({ value: p.Name, label: p.Name }))}
                                    placeholder="Pilih Jabatan"
                                />
                                <SearchableSelect
                                    label="Status"
                                    required
                                    value={newEmployee.status_karyawan}
                                    onChange={(val) => setNewEmployee({ ...newEmployee, status_karyawan: val })}
                                    options={[
                                        { value: 'Tetap', label: 'Tetap' },
                                        { value: 'Kontrak', label: 'Kontrak' },
                                        { value: 'Probation', label: 'Probation' }
                                    ]}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                                <button
                                    type="submit"
                                    disabled={modalLoading}
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {modalLoading ? <Loader2 className="animate-spin" size={20} /> : (isEdit ? <Check size={20} /> : <Plus size={20} />)}
                                    {isEdit ? 'Simpan Perubahan' : 'Simpan Karyawan'}
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
                title="Hapus Karyawan"
                message="Apakah Anda yakin ingin menghapus data karyawan ini? Semua data terkait tugas dan aset yang dipinjam akan terpengaruh."
            />
        </div>
    );
};

export default EmployeeList;
