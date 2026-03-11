import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Search, 
    Filter,
    FileText,
    User,
    Calendar,
    ArrowUpRight,
    Loader2,
    CheckCircle,
    PenTool,
    FileSearch,
    Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const GoSign = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [notification, setNotification] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/gosign/tasks');
            setTasks(response.data.tasks || []);
        } catch (error) {
            console.error('Error fetching GoSign tasks:', error);
            showNotification('Gagal memuat data persetujuan', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleSign = async (taskId) => {
        try {
            const formData = new URLSearchParams();
            formData.append('task_id', taskId);
            
            const response = await axios.post('/api/gosign/sign', formData);
            showNotification(response.data.message, 'success');
            fetchTasks(); // Refresh
        } catch (error) {
            console.error('Error signing:', error);
            showNotification(error.response?.data?.error || 'Gagal menandatangani dokumen', 'error');
        }
    };

    const handleOpenDetail = (task) => {
        try {
            const data = JSON.parse(task.data_json);
            setSelectedTask({ ...task, details: data });
            setShowDetail(true);
        } catch (e) {
            console.error('Error parsing task data:', e);
            showNotification('Gagal memuat detail dokumen', 'error');
        }
    };

    const filteredTasks = tasks.filter(item => 
        item.form_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.creator_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Approved':
                return { bg: '#f0fdf4', text: '#166534', border: '#dcfce7', icon: <CheckCircle2 size={14} /> };
            case 'Rejected':
                return { bg: '#fef2f2', text: '#991b1b', border: '#fee2e2', icon: <XCircle size={14} /> };
            case 'Waiting':
                return { bg: '#f0f9ff', text: '#0369a1', border: '#e0f2fe', icon: <Loader2 size={14} className="animate-spin" /> };
            default:
                return { bg: '#fffbeb', text: '#92400e', border: '#fef3c7', icon: <Clock size={14} /> };
        }
    };

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>GoSign Approval</h1>
                    <p style={{ color: 'var(--text-light)' }}>Kelola persetujuan tanda tangan digital dokumen GoForm</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="search-container">
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari permohonan..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ 
                    background: 'white', 
                    padding: '1.5rem', 
                    borderRadius: '20px', 
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ color: 'var(--text-light)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Menunggu Persetujuan</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{tasks.filter(a => a.status === 'Pending').length}</div>
                </div>
                <div style={{ 
                    background: 'white', 
                    padding: '1.5rem', 
                    borderRadius: '20px', 
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ color: 'var(--text-light)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Telah Selesai</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{tasks.filter(a => a.status === 'Completed').length}</div>
                </div>
            </div>

            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Dokumen & Pemohon</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Unit / Bagian</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Tanggal</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Status</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '5rem', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                         ) : filteredTasks.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Tidak ada data persetujuan.
                                </td>
                            </tr>
                        ) : filteredTasks.map((item) => {
                            const mySignerEntry = item.signers?.find(s => s.user_id === user?.ID);
                            const hasSigned = mySignerEntry?.signed;
                            const totalSigners = item.signers?.length || 0;
                            const signedCount = item.signers?.filter(s => s.signed).length || 0;

                            let statusLabel = item.status;
                            let statusVariant = item.status === 'Completed' ? 'Approved' : 'Pending';

                            if (item.status === 'Pending') {
                                if (hasSigned) {
                                    statusLabel = "Menunggu Pihak Lain";
                                    statusVariant = "Waiting";
                                } else {
                                    statusLabel = "Perlu TTD Anda";
                                    statusVariant = "Pending";
                                }
                            }

                            const statusStyle = getStatusStyle(statusVariant);
                            return (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: '40px', height: '40px', background: 'rgba(30, 89, 197, 0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.938rem' }}>{item.form_name}</div>
                                                <div style={{ fontSize: '0.813rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <User size={12} /> {item.creator_name}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>{item.section}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Calendar size={14} /> {new Date(item.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <span style={{
                                            padding: '0.375rem 0.75rem',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            background: statusStyle.bg,
                                            color: statusStyle.text,
                                            border: `1px solid ${statusStyle.border}`,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        }}>
                                            {statusStyle.icon}
                                            {statusLabel}
                                        </span>
                                        <div style={{ fontSize: '0.625rem', color: '#94a3b8', marginTop: '0.25rem', fontWeight: 700 }}>
                                            Progres: {signedCount}/{totalSigners} Selesai
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            {!hasSigned && item.status === 'Pending' && (
                                                <button 
                                                    onClick={() => handleSign(item.id)}
                                                    style={{ 
                                                        background: '#10b981', 
                                                        color: 'white', 
                                                        border: 'none', 
                                                        padding: '0.5rem 1rem', 
                                                        borderRadius: '8px', 
                                                        fontSize: '0.813rem', 
                                                        fontWeight: 700, 
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem'
                                                    }}
                                                >
                                                    <PenTool size={14} /> Tanda Tangan
                                                </button>
                                            )}
                                                <button 
                                                    onClick={() => handleOpenDetail(item)}
                                                    style={{ 
                                                        background: 'var(--primary)', 
                                                        color: 'white', 
                                                        border: 'none', 
                                                        padding: '0.5rem 1rem', 
                                                        borderRadius: '8px', 
                                                        fontSize: '0.813rem', 
                                                        fontWeight: 600, 
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem'
                                                    }}
                                                >
                                                    Detail <ArrowUpRight size={14} />
                                                </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {showDetail && selectedTask && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDetail(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                position: 'relative',
                                background: 'white',
                                width: '100%',
                                maxWidth: '800px',
                                maxHeight: '90vh',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Detail Permohonan</h2>
                                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>{selectedTask.form_name}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button 
                                        onClick={() => window.open(`/api/gosign/preview/${selectedTask.id}`, '_blank')}
                                        style={{ 
                                            background: 'rgba(30, 89, 197, 0.1)', 
                                            border: '1px solid var(--primary)', 
                                            padding: '0.5rem 1rem', 
                                            borderRadius: '12px', 
                                            cursor: 'pointer', 
                                            color: 'var(--primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.813rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        <FileSearch size={16} /> Lihat Draft PDF
                                    </button>
                                    <button 
                                        onClick={() => setShowDetail(false)}
                                        style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem', borderRadius: '12px', cursor: 'pointer', color: '#64748b' }}
                                    >
                                        <XCircle size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                    <div style={{ padding: '1.25rem', background: '#f0f9ff', borderRadius: '16px', border: '1px solid #e0f2fe' }}>
                                        <p style={{ fontSize: '0.625rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pihak Pertama (Pemberi/IT)</p>
                                        <div style={{ fontWeight: 700, fontSize: '0.938rem' }}>{selectedTask.details.P1?.Name}</div>
                                        <div style={{ fontSize: '0.813rem', color: '#64748b' }}>{selectedTask.details.P1?.Position || '-'}</div>
                                    </div>
                                    <div style={{ padding: '1.25rem', background: '#fdf4ff', borderRadius: '16px', border: '1px solid #fae8ff' }}>
                                        <p style={{ fontSize: '0.625rem', fontWeight: 800, color: '#86198f', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pihak Kedua (Penerima)</p>
                                        <div style={{ fontWeight: 700, fontSize: '0.938rem' }}>{selectedTask.details.P2?.Name}</div>
                                        <div style={{ fontSize: '0.813rem', color: '#64748b' }}>{selectedTask.details.P2?.Position || '-'}</div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Clock size={18} color="var(--primary)" /> Status Persetujuan
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        {selectedTask.signers?.map((signer, idx) => (
                                            <div key={idx} style={{ 
                                                padding: '1rem', 
                                                borderRadius: '16px', 
                                                border: '1px solid #f1f5f9',
                                                background: signer.signed ? '#f0fdf4' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem'
                                            }}>
                                                {signer.signed ? (
                                                    <CheckCircle size={20} color="#10b981" />
                                                ) : (
                                                    <Clock size={20} color="#64748b" />
                                                )}
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: signer.signed ? '#166534' : '#1e293b' }}>{signer.user_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: signer.signed ? '#15803d' : '#64748b' }}>
                                                        {signer.signed ? `Sudah Tanda Tangan` : 'Menunggu...'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FileText size={18} color="var(--primary)" /> Informasi Aset
                                    </h3>
                                    <div style={{ border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textAlign: 'left' }}>Aset / Barang</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textAlign: 'left' }}>Serial Number</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedTask.details.Items?.map((item, idx) => (
                                                    <tr key={idx} style={{ borderBottom: idx === selectedTask.details.Items.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>{item.AssetName}</td>
                                                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>{item.SerialNumber}</td>
                                                    </tr>
                                                ))}
                                                {selectedTask.details.Category === "Tukar" && (
                                                    <>
                                                        <tr style={{ background: '#fff7ed' }}>
                                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                                                <span style={{ color: '#c2410c', fontWeight: 800, fontSize: '0.625rem', display: 'block' }}>ASET BARU (NEW)</span>
                                                                <span style={{ fontWeight: 600 }}>{selectedTask.details.NewAsset?.AssetName}</span>
                                                            </td>
                                                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>{selectedTask.details.NewAsset?.SerialNumber}</td>
                                                        </tr>
                                                        <tr style={{ background: '#fef2f2' }}>
                                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                                                <span style={{ color: '#991b1b', fontWeight: 800, fontSize: '0.625rem', display: 'block' }}>ASET LAMA (OLD)</span>
                                                                <span style={{ fontWeight: 600 }}>{selectedTask.details.OldAsset?.AssetName}</span>
                                                            </td>
                                                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>{selectedTask.details.OldAsset?.SerialNumber}</td>
                                                        </tr>
                                                    </>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {selectedTask.details.Notes && (
                                    <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                        <p style={{ fontSize: '0.625rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Catatan Tambahan</p>
                                        <p style={{ fontSize: '0.875rem', margin: 0, lineScale: 1.5 }}>{selectedTask.details.Notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
                                <button 
                                    onClick={() => setShowDetail(false)}
                                    style={{ 
                                        padding: '0.75rem 2rem', 
                                        borderRadius: '12px', 
                                        border: '1px solid var(--border)', 
                                        background: 'white', 
                                        fontWeight: 700, 
                                        cursor: 'pointer' 
                                    }}
                                >
                                    Tutup
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        style={{
                            position: 'fixed',
                            top: '20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 10000,
                            padding: '1rem 2rem',
                            borderRadius: '16px',
                            background: notification.type === 'success' ? '#10b981' : '#ef4444',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                            fontWeight: 700
                        }}
                    >
                        {notification.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GoSign;
