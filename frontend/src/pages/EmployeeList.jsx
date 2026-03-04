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
    X,
    Check
} from 'lucide-react';

const EmployeeList = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [masterData, setMasterData] = useState({
        branches: [],
        departments: [],
        sub_departments: [],
        positions: []
    });

    const [newEmployee, setNewEmployee] = useState({
        nik: '',
        name: '',
        email: '',
        branch: '',
        department: '',
        sub_department: '',
        position: '',
        status_karyawan: 'Tetap'
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/employees');
            setEmployees(response.data.employees);
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
                branches: b.data.branches,
                departments: d.data.departments,
                sub_departments: sd.data.sub_departments,
                positions: p.data.positions
            });
        } catch (error) {
            console.error('Error fetching master data:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchMasterData();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus karyawan ini?')) {
            try {
                await axios.delete(`/api/employees/delete/${id}`);
                fetchData();
            } catch (error) {
                console.error('Error deleting employee:', error);
            }
        }
    };

    const handleStore = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            const params = new URLSearchParams();
            Object.keys(newEmployee).forEach(key => params.append(key, newEmployee[key]));

            await axios.post('/api/employees/store', params);
            setShowModal(false);
            setNewEmployee({
                nik: '',
                name: '',
                email: '',
                branch: '',
                department: '',
                sub_department: '',
                position: '',
                status_karyawan: 'Tetap'
            });
            fetchData();
        } catch (error) {
            console.error('Error storing employee:', error);
            alert('Gagal menambah karyawan.');
        } finally {
            setModalLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.NIK.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Daftar Karyawan</h1>
                    <p style={{ color: 'var(--text-light)' }}>Kelola data seluruh karyawan perusahaan</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.25rem 1rem', width: '300px' }}>
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari karyawan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', padding: '0.6rem 0', fontWeight: 500 }}
                        />
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                        <UserPlus size={20} /> Tambah Karyawan
                    </button>
                </div>
            </div>

            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.813rem' }}>Karyawan</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.813rem' }}>Unit / Bagian</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.813rem' }}>Kontak</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.813rem' }}>Status</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.813rem', textAlign: 'right' }}>Aksi</th>
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
                            <tr key={emp.ID} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                                            {emp.Name.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{emp.Name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>NIK: {emp.NIK}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.2rem' }}>
                                        <Building2 size={12} /> {emp.Branch}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{emp.Department}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.813rem', color: 'var(--primary)', fontWeight: 600 }}>
                                        <Briefcase size={12} /> {emp.Position}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-light)', fontSize: '0.875rem' }}>
                                        <Mail size={14} /> {emp.Email || '-'}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '50px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        background: emp.StatusKaryawan === 'Tetap' ? '#dcfce7' : '#f1f5f9',
                                        color: emp.StatusKaryawan === 'Tetap' ? '#166534' : '#64748b'
                                    }}>
                                        {emp.StatusKaryawan}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', color: 'var(--primary)', cursor: 'pointer' }}><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(emp.ID)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
                            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>Tambah Karyawan Baru</h3>
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

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Email</label>
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={newEmployee.email}
                                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Cabang</label>
                                    <select
                                        required
                                        value={newEmployee.branch}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, branch: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                    >
                                        <option value="">-- Pilih Cabang --</option>
                                        {masterData.branches.map(b => <option key={b.ID} value={b.Name}>{b.Name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Bagian</label>
                                    <select
                                        required
                                        value={newEmployee.department}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                    >
                                        <option value="">-- Pilih Bagian --</option>
                                        {masterData.departments.map(d => <option key={d.ID} value={d.Name}>{d.Name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Jabatan</label>
                                    <select
                                        required
                                        value={newEmployee.position}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                    >
                                        <option value="">-- Pilih Jabatan --</option>
                                        {masterData.positions.map(p => <option key={p.ID} value={p.Name}>{p.Name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Status</label>
                                    <select
                                        required
                                        value={newEmployee.status_karyawan}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, status_karyawan: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none' }}
                                    >
                                        <option value="Tetap">Tetap</option>
                                        <option value="Kontrak">Kontrak</option>
                                        <option value="Probation">Probation</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                                <button
                                    type="submit"
                                    disabled={modalLoading}
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {modalLoading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                    Simpan Karyawan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeList;
