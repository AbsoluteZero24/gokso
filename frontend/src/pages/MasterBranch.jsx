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

const MasterBranch = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/master-data/branch');
            setBranches(response.data.branches);
        } catch (error) {
            console.error('Error fetching branches:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.25rem 1rem', width: '300px' }}>
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari cabang..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', padding: '0.6rem 0', fontWeight: 500 }}
                        />
                    </div>
                    <button style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={20} /> Tambah Cabang
                    </button>
                </div>
            </div>

            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, width: '80px' }}>No</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Nama Cabang</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Aksi</th>
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
                            <tr key={branch.ID} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem 1.5rem' }}>{idx + 1}</td>
                                <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{branch.Name}</td>
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

export default MasterBranch;
