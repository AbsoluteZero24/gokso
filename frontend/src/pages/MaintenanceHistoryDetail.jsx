import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ChevronLeft,
    Printer,
    CircleCheck,
    Clock,
    Calendar,
    MapPin,
    Laptop,
    Check,
    X,
    Loader2,
    TriangleAlert
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const MaintenanceHistoryDetail = () => {
    const { id } = useParams();
    const [data, setData] = useState({ doc: null, reports: [] });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/maintenance/history/${id}`);
            setData(response.data);
        } catch (error) {
            console.error('Error fetching detail:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

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

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    const { doc, reports } = data;

    if (!doc) {
        return (
            <div className="page-content" style={{ textAlign: 'center', padding: '5rem' }}>
                <TriangleAlert size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                <h2>Laporan tidak ditemukan</h2>
                <Link to="/maintenance/history" className="btn-primary" style={{ marginTop: '1rem', textDecoration: 'none' }}>Kembali ke Riwayat</Link>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <Link to="/maintenance/history" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-light)', textDecoration: 'none', fontWeight: 600, marginBottom: '1rem' }}>
                        <ChevronLeft size={18} /> Kembali ke Riwayat
                    </Link>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Detail Laporan Pemeliharaan</h1>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', color: 'var(--text-light)', fontSize: '0.875rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={16} /> {doc.Period}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={16} /> {doc.Branch}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>Unit: {doc.Department} - {doc.SubDepartment}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    {doc.Status === 'Approved' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                            <CircleCheck size={20} /> APPROVED
                        </span>
                    ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '10px', background: '#fef9c3', color: '#854d0e', fontWeight: 700 }}>
                            <Clock size={20} /> SUBMITTED
                        </span>
                    )}
                    <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '10px', background: 'white', border: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                        <Printer size={18} /> Cetak Laporan
                    </button>
                </div>
            </div>

            <div className="chart-container" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.813rem' }}>No</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.813rem' }}>Nama User / Label Aset</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.813rem', textAlign: 'center' }}>Antivirus</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.813rem', textAlign: 'center' }}>Clear Temp</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.813rem', textAlign: 'center' }}>Kondisi</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.813rem' }}>Tanggal Periksa</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.813rem' }}>Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report, idx) => (
                            <tr key={report.ID} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{idx + 1}</td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{report.UserName}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>{report.UserPosition}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                                        <Laptop size={12} /> {report.Asset?.InventoryNumber} - {report.Asset?.DeviceName}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                    {report.AntivirusUpdated ? <Check size={18} color="#10b981" /> : <X size={18} color="#ef4444" />}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                    {report.ClearTemporary ? <Check size={18} color="#10b981" /> : <X size={18} color="#ef4444" />}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '0.25rem 0.625rem',
                                        borderRadius: '50px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        background: report.OverallCondition === 'Normal' ? '#dcfce7' : '#fee2e2',
                                        color: report.OverallCondition === 'Normal' ? '#166534' : '#991b1b'
                                    }}>
                                        {report.OverallCondition}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem 1.5rem', fontSize: '0.813rem' }}>{new Date(report.InspectionDate).toLocaleDateString('id-ID')}</td>
                                <td style={{ padding: '1rem 1.5rem', fontSize: '0.813rem', color: 'var(--text-light)' }}>{report.Remarks || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h6 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '1rem' }}>Informasi Penyerahan</h6>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Submit Oleh:</span>
                            <span style={{ fontWeight: 600 }}>{doc.SubmittedByID || 'System Admin'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Waktu Submit:</span>
                            <span style={{ fontWeight: 600 }}>{formatDate(doc.SubmittedAt)}</span>
                        </div>
                    </div>
                </div>
                <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h6 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '1rem' }}>Informasi Persetujuan</h6>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Disetujui Oleh:</span>
                            <span style={{ fontWeight: 600 }}>{doc.ApprovedByID || (doc.Status === 'Approved' ? 'System Manager' : '-')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Waktu Persetujuan:</span>
                            <span style={{ fontWeight: 600 }}>{formatDate(doc.ApprovedAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceHistoryDetail;
