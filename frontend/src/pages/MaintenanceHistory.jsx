import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    History,
    Search,
    Loader2,
    Eye,
    Calendar,
    MapPin,
    CircleCheck,
    Clock,
    ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MaintenanceHistory = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/maintenance/history');
            setDocuments(response.data.documents);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredDocs = documents.filter(doc =>
        doc.Period.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.Branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.Department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Riwayat Pemeliharaan</h1>
                    <p style={{ color: 'var(--text-light)' }}>Daftar dokumen laporan pemeliharaan yang sudah diajukan</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.25rem 1rem', width: '300px' }}>
                    <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                    <input
                        type="text"
                        placeholder="Cari riwayat..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', padding: '0.6rem 0', fontWeight: 500 }}
                    />
                </div>
            </div>

            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.813rem' }}>Periode</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.813rem' }}>Lokasi / Unit</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.813rem', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.813rem' }}>Tgl Submit</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.813rem' }}>Tgl Approval</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.813rem', textAlign: 'right' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '5rem', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                        ) : filteredDocs.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Belum ada riwayat laporan pemeliharaan.
                                </td>
                            </tr>
                        ) : filteredDocs.map((doc) => (
                            <tr key={doc.ID} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                        <Calendar size={16} color="var(--primary)" />
                                        {doc.Period}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Kategori: {doc.Category}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.2rem' }}>
                                        <MapPin size={12} /> {doc.Branch}
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{doc.Department}</div>
                                    <div style={{ fontSize: '0.813rem', color: 'var(--text-light)' }}>{doc.SubDepartment}</div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                    {doc.Status === 'Approved' ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '50px', background: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 700 }}>
                                            <CircleCheck size={12} /> Approved
                                        </span>
                                    ) : (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '50px', background: '#fef9c3', color: '#854d0e', fontSize: '0.75rem', fontWeight: 700 }}>
                                            <Clock size={12} /> Submitted
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.813rem' }}>{formatDate(doc.SubmittedAt)}</td>
                                <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.813rem' }}>{formatDate(doc.ApprovedAt)}</td>
                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                    <Link to={`/maintenance/history/detail/${doc.ID}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '10px', background: 'var(--primary)', color: 'white', fontSize: '0.813rem', fontWeight: 600, textDecoration: 'none' }}>
                                        <Eye size={16} /> Detail
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MaintenanceHistory;
