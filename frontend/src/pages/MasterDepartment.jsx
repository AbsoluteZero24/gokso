import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Building2,
    Search,
    Loader2,
    Plus,
    Trash2,
    Edit,
    Database,
    ArrowRight
} from 'lucide-react';

const MasterDepartment = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/master-data/department');
            setDepartments(response.data.departments);
        } catch (error) {
            console.error('Error fetching departments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredDepartments = departments.filter(d =>
        d.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.MasterBranch?.Name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Master Bagian</h1>
                    <p style={{ color: 'var(--text-light)' }}>Daftar seluruh departemen di perusahaan</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.25rem 1rem', width: '300px' }}>
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari bagian..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', padding: '0.6rem 0', fontWeight: 500 }}
                        />
                    </div>
                    <button style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={20} /> Tambah Bagian
                    </button>
                </div>
            </div>

            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, width: '80px' }}>No</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Cabang</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Nama Bagian</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '5rem', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                        ) : filteredDepartments.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Tidak ada data bagian ditemukan.
                                </td>
                            </tr>
                        ) : filteredDepartments.map((dept, idx) => (
                            <tr key={dept.ID} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem 1.5rem' }}>{idx + 1}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.813rem', color: 'var(--text-light)' }}>
                                        <Building2 size={14} /> {dept.MasterBranch?.Name || 'N/A'}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{dept.Name}</td>
                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', color: 'var(--primary)' }}><Edit size={16} /></button>
                                        <button style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', color: '#ef4444' }}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MasterDepartment;
