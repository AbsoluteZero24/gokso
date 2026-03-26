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
    Download,
    Trash2,
    AlertTriangle,
    Plus,
    Upload as UploadIcon,
    Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/shared/Toast';
import ConfirmModal from '../../components/shared/ConfirmModal';
import SearchableSelect from '../../components/shared/SearchableSelect';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Konfigurasi worker react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const GoSign = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // Toast & Dialog State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null, loading: false });
    const [confirmReject, setConfirmReject] = useState({ show: false, id: null, loading: false, reason: '' });
    
    // Manual Upload State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showVisualSigner, setShowVisualSigner] = useState(false); // Modal penempatan visual
    const [allUsers, setAllUsers] = useState([]);
    const [folders, setFolders] = useState([]);

    // Mengambil daftar tugas persetujuan (GoSign) dari server
    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/gosign/tasks');
            // Menstandarisasi status untuk kemudahan pembacaan di frontend
            const rawTasks = response.data.tasks || [];
            setTasks(rawTasks);
        } catch (error) {
            console.error('Error fetching GoSign tasks:', error);
            showNotification('Gagal memuat data persetujuan', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/users');
            setAllUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchFolders = async () => {
        try {
            const response = await axios.get('/api/godms/folders/list-all');
            setFolders(response.data.folders || []);
        } catch (error) {
            console.error('Error fetching folders:', error);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchUsers();
        fetchFolders();
    }, []);

    const showNotification = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const handleSign = async (taskId) => {
        try {
            const formData = new URLSearchParams();
            formData.append('task_id', taskId);
            
            const response = await axios.post('/api/gosign/sign', formData);
            showNotification(response.data.message, 'success');
            setShowDetail(false);
            setSelectedTask(null);
            fetchTasks(); // Refresh
        } catch (error) {
            console.error('Error signing:', error);
            showNotification(error.response?.data?.error || 'Gagal menandatangani dokumen', 'error');
        }
    };

    const handleReject = (taskId) => {
        setConfirmReject({ show: true, id: taskId, loading: false, reason: '' });
    };

    const handleConfirmReject = async () => {
        if (!confirmReject.reason.trim()) {
            showNotification('Mohon masukkan alasan penolakan', 'error');
            return;
        }

        setConfirmReject(prev => ({ ...prev, loading: true }));
        try {
            const formData = new URLSearchParams();
            formData.append('task_id', confirmReject.id);
            formData.append('reason', confirmReject.reason);
            
            const response = await axios.post('/api/gosign/reject', formData);
            showNotification(response.data.message, 'success');
            setShowDetail(false);
            fetchTasks();
        } catch (error) {
            console.error('Error rejecting:', error);
            showNotification(error.response?.data?.error || 'Gagal menolak dokumen', 'error');
        } finally {
            setConfirmReject({ show: false, id: null, loading: false, reason: '' });
        }
    };
    
    const handleDelete = (taskId) => {
        setConfirmDelete({ show: true, id: taskId, loading: false });
    };

    const handleConfirmDelete = async () => {
        setConfirmDelete(prev => ({ ...prev, loading: true }));
        try {
            await axios.delete(`/api/gosign/delete/${confirmDelete.id}`);
            showNotification('Permohonan berhasil dihapus', 'success');
            setShowDetail(false);
            fetchTasks();
        } catch (error) {
            console.error('Error deleting:', error);
            showNotification(error.response?.data?.error || 'Gagal menghapus permohonan', 'error');
        } finally {
            setConfirmDelete({ show: false, id: null, loading: false });
        }
    };

    const handleOpenDetail = (task) => {
        try {
            // Jika TaskType Upload, bisa jadi tidak ada data_json (karena upload manual)
            const data = task.data_json && task.data_json !== "" ? JSON.parse(task.data_json) : {};
            setSelectedTask({ ...task, details: data });
            setShowDetail(true);
        } catch (e) {
            console.error('Error parsing task data:', e, task.data_json);
            showNotification('Gagal memuat detail dokumen', 'error');
        }
    };

    const filteredTasks = tasks.filter(item => 
        item.form_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.creator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.signers?.some(s => s.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
                    <button 
                        onClick={() => setShowUploadModal(true)}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            padding: '0.625rem 1.25rem', 
                            background: 'var(--primary)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '12px', 
                            fontSize: '0.875rem', 
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(30, 89, 197, 0.25)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Plus size={18} /> Ajukan GoSign
                    </button>
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
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Nama Penyetuju</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Tanggal</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Status</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '5rem', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                         ) : filteredTasks.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                    Tidak ada data persetujuan.
                                </td>
                            </tr>
                        ) : filteredTasks.map((item) => {
                            const mySignerEntry = item.signers?.find(s => s.user_id === user?.admin_id);
                            const hasSigned = mySignerEntry?.signed;
                            const totalSigners = item.signers?.length || 0;
                            const signedCount = item.signers?.filter(s => s.signed).length || 0;

                            let statusLabel = item.status;
                            let statusVariant = (item.status === 'Completed' || item.status === 'Signed') ? 'Approved' : item.status;

                            if (item.status === 'Pending') {
                                if (hasSigned) {
                                    statusLabel = "Menunggu Lainnya";
                                    statusVariant = "Waiting";
                                } else {
                                    statusLabel = "Perlu TTD Anda";
                                    statusVariant = "Pending";
                                }
                            } else if (item.status === 'Rejected') {
                                statusLabel = "Ditolak";
                                statusVariant = "Rejected";
                            }

                            const statusStyle = getStatusStyle(statusVariant);
                            return (
                                <motion.tr 
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: filteredTasks.indexOf(item) * 0.05 }}
                                    style={{ borderBottom: '1px solid #f1f5f9' }} 
                                    className="table-row-hover"
                                >
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
                                        <div style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>
                                            {item.signers?.filter(s => s.user_name !== item.creator_name).map(s => s.user_name).join(', ') || '-'}
                                        </div>
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
                                            {item.status === 'Pending' && (
                                                (hasSigned && signedCount < totalSigners) ? (
                                                    <button 
                                                        disabled
                                                        style={{ 
                                                            background: '#f1f5f9', 
                                                            color: '#94a3b8', 
                                                            border: '1px solid #e2e8f0', 
                                                            padding: '0.5rem 1rem', 
                                                            borderRadius: '8px', 
                                                            fontSize: '0.813rem', 
                                                            fontWeight: 700, 
                                                            cursor: 'not-allowed',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.4rem'
                                                        }}
                                                    >
                                                        <Clock size={14} /> Menunggu
                                                    </button>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleSign(item.id); }}
                                                            style={{ 
                                                                background: hasSigned ? '#0ea5e9' : '#10b981', 
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
                                                            {hasSigned ?  <CheckCircle2 size={14} /> : <PenTool size={14} />} {hasSigned ? 'Selesaikan' : 'TTD'}
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleReject(item.id); }}
                                                            title="Tolak Permohonan"
                                                            style={{ 
                                                                background: '#ef4444', 
                                                                color: 'white', 
                                                                border: 'none', 
                                                                padding: '0.5rem', 
                                                                borderRadius: '8px', 
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center'
                                                            }}
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </div>
                                                )
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
                                            {user?.role?.toLowerCase() === 'super admin' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                    title="Hapus Permohonan"
                                                    style={{ 
                                                        background: '#fef2f2', 
                                                        color: '#ef4444', 
                                                        border: '1px solid #fee2e2', 
                                                        padding: '0.5rem', 
                                                        borderRadius: '8px', 
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
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
                                {/* 
                                    DETAIL PARTISIPAN (Pihak 1 & Pihak 2 / Disusun & Disetujui)
                                    Pemeriksaan dilakukan secara dinamis untuk mendukung perbedaan struktur DataJSON 
                                    antara form BAST Laptop dan form FM.SI.0101.
                                */}
                                {selectedTask.task_type !== 'Upload' && (() => {
                                    const details = selectedTask.details || {};
                                    const isFMSI0101 = selectedTask.form_id === 'FM.SI.0101' || details.Form === 'FMSI0101';
                                    
                                    // Fallback key mapping untuk Pihak 1
                                    const p1 = details.P1 || details.preparer || details.p1 || details.P1User;
                                    // Fallback key mapping untuk Pihak 2
                                    const p2 = details.P2 || details.approver || details.p2 || details.P2User;

                                    const label1 = isFMSI0101 ? "Disusun oleh" : "Pihak Pertama (Pemberi/IT)";
                                    const label2 = isFMSI0101 ? "Disetujui oleh" : "Pihak Kedua (Penerima)";

                                    // Helper untuk mengambil nama/jabatan (antisipasi case-sensitivity dari backend)
                                    const getName = (obj) => obj?.name || obj?.Name || '-';
                                    const getPos = (obj) => obj?.position || obj?.Position || '-';

                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                            <div style={{ padding: '1.25rem', background: '#f0f9ff', borderRadius: '16px', border: '1px solid #e0f2fe' }}>
                                                <p style={{ fontSize: '0.625rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{label1}</p>
                                                <div style={{ fontWeight: 700, fontSize: '0.938rem' }}>{getName(p1)}</div>
                                                <div style={{ fontSize: '0.813rem', color: '#64748b' }}>{getPos(p1)}</div>
                                            </div>
                                            <div style={{ padding: '1.25rem', background: '#fdf4ff', borderRadius: '16px', border: '1px solid #fae8ff' }}>
                                                <p style={{ fontSize: '0.625rem', fontWeight: 800, color: '#86198f', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{label2}</p>
                                                <div style={{ fontWeight: 700, fontSize: '0.938rem' }}>{getName(p2)}</div>
                                                <div style={{ fontSize: '0.813rem', color: '#64748b' }}>{getPos(p2)}</div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Clock size={18} color="var(--primary)" /> Status Persetujuan
                                    </h3>

                                    {/* Rejection Reason - High Visibility */}
                                    {selectedTask.status === 'Rejected' && selectedTask.rejection_reason && (
                                        <div style={{ 
                                            marginBottom: '1.5rem', 
                                            padding: '1.25rem', 
                                            background: '#fef2f2', 
                                            borderRadius: '16px', 
                                            border: '1px solid #fee2e2',
                                            display: 'flex',
                                            gap: '1rem',
                                            alignItems: 'flex-start'
                                        }}>
                                            <div style={{ padding: '0.5rem', borderRadius: '10px', background: '#fee2e2', color: '#dc2626' }}>
                                                <AlertTriangle size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.025em' }}>Alasan Penolakan</div>
                                                <div style={{ fontSize: '0.938rem', color: '#dc2626', fontWeight: 600, lineHeight: 1.5 }}>{selectedTask.rejection_reason}</div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        {selectedTask.signers?.map((signer, idx) => {
                                            const isRejector = signer.rejected || (selectedTask.status === 'Rejected' && String(signer.user_id) === String(selectedTask.rejector_id));
                                            
                                            return (
                                                <div key={idx} style={{ 
                                                    padding: '1rem', 
                                                    borderRadius: '16px', 
                                                    border: '1px solid #f1f5f9',
                                                    background: signer.signed ? '#f0fdf4' : (isRejector ? '#fef2f2' : 'white'),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem'
                                                }}>
                                                    {signer.signed ? (
                                                        <CheckCircle size={20} color="#10b981" />
                                                    ) : isRejector ? (
                                                        <XCircle size={20} color="#dc2626" />
                                                    ) : (
                                                        <Clock size={20} color="#64748b" />
                                                    )}
                                                    <div>
                                                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: signer.signed ? '#166534' : (isRejector ? '#991b1b' : '#1e293b') }}>{signer.user_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: signer.signed ? '#15803d' : (isRejector ? '#dc2626' : '#64748b') }}>
                                                            {signer.signed ? `Sudah Tanda Tangan` : (isRejector ? 'Menolak' : 'Menunggu...')}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {selectedTask.details.Period && (
                                    <div style={{ marginBottom: '2rem', padding: '1rem 1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'white', border: '1px solid #e2e8f0', color: 'var(--primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <Calendar size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.625rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Periode Laporan</div>
                                            <div style={{ fontWeight: 700, fontSize: '0.938rem', color: '#1e293b' }}>Tahun {selectedTask.details.Period}</div>
                                        </div>
                                    </div>
                                )}

                                    <div style={{ marginBottom: '2rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FileText size={18} color="var(--primary)" /> Detail Dokumen
                                        </h3>
                                        
                                        {selectedTask.task_type === 'Upload' ? (
                                            <div style={{ 
                                                padding: '1.5rem', 
                                                background: '#f8fafc', 
                                                borderRadius: '16px', 
                                                border: '1px solid #e2e8f0',
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '1.5rem'
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '0.625rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>Nama File Dokumen</div>
                                                    <div style={{ fontSize: '0.938rem', fontWeight: 700, color: '#1e293b' }}>{selectedTask.file_name}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.625rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>Unit / Bagian</div>
                                                    <div style={{ fontSize: '0.938rem', fontWeight: 700, color: '#1e293b' }}>{selectedTask.section}</div>
                                                </div>
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <div style={{ fontSize: '0.625rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>Tipe Pengajuan</div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>Manual Upload Dokumen</div>
                                                </div>
                                            </div>
                                        ) : (
                                            (selectedTask.details.Form === 'FMSI0101' || selectedTask.form_id === 'FM.SI.0101') ? (
                                                <div style={{ 
                                                    padding: '1.5rem', 
                                                    background: '#f8fafc', 
                                                    borderRadius: '16px', 
                                                    border: '1px solid #e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem'
                                                }}>
                                                    <div style={{ 
                                                        width: '48px', 
                                                        height: '48px', 
                                                        background: 'rgba(30, 89, 197, 0.1)', 
                                                        borderRadius: '12px', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        color: 'var(--primary)' 
                                                    }}>
                                                        <FileText size={24} />
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '0.938rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                                                            Permohonan dokumen <strong>FM.SI.0101 Daftar Server KSO SCSI</strong> untuk periode <strong>{(selectedTask.details.Period || selectedTask.details.period || '2026')}</strong>.
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden', overflowX: 'auto' }}>
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
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )
                                        )}
                                    </div>

                                {selectedTask.details.Notes && (
                                    <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                        <p style={{ fontSize: '0.625rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Catatan Tambahan</p>
                                        <p style={{ fontSize: '0.875rem', margin: 0, lineScale: 1.5 }}>{selectedTask.details.Notes}</p>
                                    </div>
                                )}
                            </div>

                             {/* Modal Footer */}
                             <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', gap: '1rem' }}>
                                {selectedTask.status === 'Pending' && !selectedTask.signers?.find(s => s.user_id === user?.admin_id)?.signed && (
                                     <>
                                        <button 
                                            onClick={() => handleReject(selectedTask.id)}
                                            style={{ 
                                                padding: '0.75rem 1.5rem', 
                                                borderRadius: '12px', 
                                                border: '1px solid #fee2e2', 
                                                background: '#fef2f2', 
                                                color: '#991b1b',
                                                fontWeight: 800, 
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <XCircle size={18} /> Tolak Permohonan
                                        </button>
                                        <button 
                                            onClick={() => handleSign(selectedTask.id)}
                                            style={{ 
                                                padding: '0.75rem 2rem', 
                                                borderRadius: '12px', 
                                                border: 'none', 
                                                background: '#10b981', 
                                                color: 'white',
                                                fontWeight: 800, 
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                                            }}
                                        >
                                            <PenTool size={18} /> Tanda Tangan Sekarang
                                        </button>
                                     </>
                                )}
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

            {/* Confirm Reject Modal */}
            <AnimatePresence>
                {confirmReject.show && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !confirmReject.loading && setConfirmReject({ ...confirmReject, show: false })}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(8px)' }}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{
                                position: 'relative',
                                background: 'white',
                                width: '100%',
                                maxWidth: '440px',
                                borderRadius: '24px',
                                padding: '2rem',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ 
                                width: '64px', 
                                height: '64px', 
                                background: '#fef2f2', 
                                borderRadius: '20px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                margin: '0 auto 1.5rem',
                                color: '#ef4444'
                            }}>
                                <XCircle size={32} />
                            </div>
                            
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Tolak Permohonan</h3>
                            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                Apakah Anda yakin ingin menolak permohonan ini? Mohon berikan alasan penolakan untuk pemohon.
                            </p>

                            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', marginLeft: '0.25rem' }}>
                                    Alasan Penolakan
                                </label>
                                <textarea
                                    value={confirmReject.reason}
                                    onChange={(e) => setConfirmReject({ ...confirmReject, reason: e.target.value })}
                                    placeholder="Contoh: Lampiran belum lengkap atau ada kesalahan data..."
                                    disabled={confirmReject.loading}
                                    style={{
                                        width: '100%',
                                        height: '100px',
                                        padding: '1rem',
                                        borderRadius: '16px',
                                        border: '1.5px solid #e2e8f0',
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                        resize: 'none',
                                        transition: 'all 0.2s',
                                        background: '#f8fafc'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary)';
                                        e.target.style.background = 'white';
                                        e.target.style.boxShadow = '0 0 0 4px rgba(30, 89, 197, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e2e8f0';
                                        e.target.style.background = '#f8fafc';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button
                                    disabled={confirmReject.loading}
                                    onClick={() => setConfirmReject({ ...confirmReject, show: false })}
                                    style={{
                                        padding: '0.875rem',
                                        borderRadius: '14px',
                                        border: '1px solid #e2e8f0',
                                        background: 'white',
                                        color: '#64748b',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    disabled={confirmReject.loading}
                                    onClick={handleConfirmReject}
                                    style={{
                                        padding: '0.875rem',
                                        borderRadius: '14px',
                                        border: 'none',
                                        background: '#ef4444',
                                        color: 'white',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {confirmReject.loading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <>Konfirmasi Tolak</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Notification Toast */}
            <AnimatePresence>
                {toast.show && (
                    <Toast 
                        message={toast.message} 
                        type={toast.type} 
                        onClose={() => setToast({ ...toast, show: false })} 
                    />
                )}
            </AnimatePresence>

            <ConfirmModal 
                isOpen={confirmDelete.show}
                onClose={() => setConfirmDelete({ ...confirmDelete, show: false })}
                onConfirm={handleConfirmDelete}
                loading={confirmDelete.loading}
                title="Hapus Permohonan"
                message="Apakah Anda yakin ingin menghapus permohonan ini secara permanen? Tindakan ini tidak dapat dibatalkan."
            />

            <UploadGoSignModal 
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                users={allUsers}
                folders={folders}
                onSuccess={() => {
                    setShowUploadModal(false);
                    fetchTasks();
                    showNotification('Permohonan GoSign berhasil diajukan', 'success');
                }}
            />
        </div>
    );
};


const UploadGoSignModal = ({ isOpen, onClose, users, folders, onSuccess }) => {
    const [docName, setDocName] = useState('');
    const [section, setSection] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [targetFolder, setTargetFolder] = useState('auto');
    const [signers, setSigners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showVisual, setShowVisual] = useState(false);
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        if (isOpen) {
            axios.get('/api/master-data/department').then(res => {
                setDepartments(res.data.departments || []);
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedFile) {
            const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
            setDocName(fileName);
        }
    }, [selectedFile]);

    if (!isOpen) return null;

    const handleAddSigner = () => {
        setSigners([...signers, { user_id: '', user_name: '', role: '', x: 50, y: 50, page: 1, width: 40, hide_role: false, sign_type: 'signature' }]);
    };

    const handleRemoveSigner = (index) => {
        setSigners(signers.filter((_, i) => i !== index));
    };

    const updateSigner = (index, field, value) => {
        const newSigners = [...signers];
        newSigners[index][field] = value;
        setSigners(newSigners);
    };

    const handleSubmit = async () => {
        if (!docName || !selectedFile || signers.length === 0 || !targetFolder || !section) {
            alert('Mohon lengkapi semua data: Nama Dokumen, File, Pilih Bagian, dan Minimal 1 Penanda Tangan.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('form_name', docName);
            formData.append('section', section || 'Umum');
            formData.append('file', selectedFile);
            formData.append('target_folder_id', targetFolder);
            formData.append('signers', JSON.stringify(signers));

            await axios.post('/api/gosign/submit-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onSuccess();
        } catch (error) {
            console.error('Error submitting:', error);
            alert(error.response?.data?.error || 'Gagal mengajukan permohonan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(8px)', padding: '1rem'
        }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    background: 'white', width: '100%', maxWidth: '800px', maxHeight: '95vh',
                    borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
            >
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Ajukan GoSign Dokumen</h2>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Upload PDF/Word dan tentukan penanda tangan</p>
                    </div>
                    <button onClick={onClose} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={24} /></button>
                </div>

                <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ minWidth: 0 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Nama Dokumen</label>
                            <input 
                                type="text" value={docName} onChange={e => setDocName(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                                placeholder="Contoh: Kontrak Kerjasama"
                            />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Pilih File (PDF/DOCX)</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <label style={{ 
                                    flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0,
                                    padding: '0.625rem 1rem', borderRadius: '12px', border: '1.5px dashed #cbd5e1', 
                                    background: selectedFile ? '#f0f9ff' : '#f8fafc', color: selectedFile ? 'var(--primary)' : '#64748b',
                                    cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.875rem', overflow: 'hidden'
                                }}>
                                    <UploadIcon size={18} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: selectedFile ? 700 : 500, flex: 1 }}>
                                        {selectedFile ? selectedFile.name : 'Klik untuk Unggah Dokumen'}
                                    </span>
                                    <input 
                                        type="file" accept=".pdf,.docx" onChange={e => setSelectedFile(e.target.files[0])}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                                {selectedFile?.type === 'application/pdf' && (
                                    <button 
                                        onClick={() => setShowVisual(true)}
                                        title="Atur lokasi tanda tangan secara visual"
                                        style={{ 
                                            padding: '0.75rem', borderRadius: '12px', background: '#f0f9ff', color: 'var(--primary)', 
                                            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0,
                                            boxShadow: '0 2px 8px rgba(30, 89, 197, 0.1)' 
                                        }}
                                    >
                                        <PenTool size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div style={{ minWidth: 0 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Bagian / Unit</label>
                                <SearchableSelect 
                                    options={departments.map(d => ({ value: d.name, label: d.name }))}
                                    value={section}
                                    onChange={val => {
                                        setSection(val);
                                        setTargetFolder('auto'); 
                                    }}
                                    placeholder="Pilih Bagian..."
                                />
                                <p style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '0.5rem' }}>
                                    <Clock size={10} /> Dokumen akan otomatis masuk ke folder <b>GoSign</b> di bagian ini.
                                </p>
                            </div>
                        </div>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                        <div>
                            <label style={{ fontWeight: 800, fontSize: '1rem', display: 'block' }}>Daftar Penanda Tangan</label>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tentukan siapa saja yang harus tanda tangan di dokumen ini</span>
                        </div>
                        <button 
                            onClick={handleAddSigner}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.4rem', 
                                padding: '0.625rem 1.25rem', background: 'rgba(30, 89, 197, 0.08)', color: 'var(--primary)',
                                borderRadius: '12px', border: 'none', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(30, 89, 197, 0.15)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(30, 89, 197, 0.08)'}
                        >
                            <Plus size={16} /> Tambah Orang
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {signers.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '20px', color: '#94a3b8' }}>
                                <User size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p style={{ fontWeight: 600 }}>Belum ada penanda tangan ditambahkan</p>
                            </div>
                        ) : signers.map((s, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={idx} 
                                style={{ padding: '1.5rem', border: '1px solid #f1f5f9', borderRadius: '20px', background: '#f8fafc', position: 'relative' }}
                            >
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto', gap: '1.25rem', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.813rem', fontWeight: 700, color: '#1e293b' }}>Penanda Tangan #{idx + 1}</label>
                                        <SearchableSelect 
                                            options={users.filter(u => u.name.toLowerCase() !== 'administrator').map(u => ({ value: u.id, label: u.name }))}
                                            value={s.user_id}
                                             onChange={(val) => {
                                                const u = users.find(user => user.id === val);
                                                 updateSigner(idx, 'user_id', val);
                                                 updateSigner(idx, 'user_name', u?.name || '');
                                                 updateSigner(idx, 'role', u?.position || ''); // Automatis isi jabatan
                                                 updateSigner(idx, 'signature_img', u?.signature || ''); // Simpan info tanda tangan untuk preview visual
                                                 updateSigner(idx, 'paraf_img', u?.paraf || ''); // Simpan info paraf
                                             }}
                                            placeholder="Pilih Karyawan..."
                                        />
                                        <div style={{ marginTop: '0.5rem', display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '0.25rem', alignSelf: 'flex-start' }}>
                                            <button
                                                onClick={() => updateSigner(idx, 'sign_type', 'signature')}
                                                style={{
                                                    padding: '0.375rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, border: 'none', borderRadius: '6px',
                                                    cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.5px',
                                                    background: (!s.sign_type || s.sign_type === 'signature') ? 'white' : 'transparent',
                                                    color: (!s.sign_type || s.sign_type === 'signature') ? 'var(--primary)' : '#64748b',
                                                    boxShadow: (!s.sign_type || s.sign_type === 'signature') ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                                }}
                                            >
                                                Tanda Tangan
                                            </button>
                                            <button
                                                onClick={() => updateSigner(idx, 'sign_type', 'paraf')}
                                                style={{
                                                    padding: '0.375rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, border: 'none', borderRadius: '6px',
                                                    cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.5px',
                                                    background: s.sign_type === 'paraf' ? 'white' : 'transparent',
                                                    color: s.sign_type === 'paraf' ? 'var(--primary)' : '#64748b',
                                                    boxShadow: s.sign_type === 'paraf' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                                }}
                                            >
                                                Paraf
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.813rem', fontWeight: 700, color: '#1e293b' }}>Jabatan / Peran</label>
                                        <input 
                                            type="text" value={s.role} onChange={e => updateSigner(idx, 'role', e.target.value)}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}
                                            placeholder="Contoh: General Manager"
                                        />
                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '0.25rem' }}>
                                            <input 
                                                type="checkbox" 
                                                id={`hide-role-${idx}`}
                                                checked={s.hide_role} 
                                                onChange={e => updateSigner(idx, 'hide_role', e.target.checked)} 
                                                style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--primary)' }}
                                            />
                                            <label htmlFor={`hide-role-${idx}`} style={{ fontSize: '0.75rem', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}>Sembunyikan Teks Nama & Jabatan di PDF</label>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '1.75rem' }}>
                                        <button 
                                            onClick={() => handleRemoveSigner(idx)} 
                                            style={{ color: '#ef4444', padding: '0.75rem', background: '#fef2f2', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                                            onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Halaman</label>
                                        <input type="number" value={s.page} onChange={e => updateSigner(idx, 'page', parseInt(e.target.value))} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Posisi X (mm)</label>
                                        <input type="number" value={s.x} onChange={e => updateSigner(idx, 'x', parseFloat(e.target.value))} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Posisi Y (mm)</label>
                                        <input type="number" value={s.y} onChange={e => updateSigner(idx, 'y', parseFloat(e.target.value))} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Lebar (mm)</label>
                                        <input type="number" value={s.width} onChange={e => updateSigner(idx, 'width', parseFloat(e.target.value))} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.625rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                                    * Tips: Posisi dihitung dari pojok kiri atas halaman. Standar A4 adalah 210 x 297 mm.
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1rem', justifyContent: 'flex-end', background: '#f8fafc' }}>
                    <button onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={loading}
                        style={{ 
                            padding: '0.75rem 2rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, 
                            display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(30, 89, 197, 0.2)'
                        }}
                    >
                        {loading && <Loader2 size={18} className="animate-spin" />}
                        {loading ? 'Sabar ya, lagi diproses...' : 'Ajukan Sekarang'}
                    </button>
                </div>

                {/* VISUAL OVERLAY MODAL */}
                <AnimatePresence>
                    {showVisual && (
                        <VisualSignerOverlay 
                            file={selectedFile}
                            signers={signers}
                            onUpdateSigners={setSigners}
                            onClose={() => setShowVisual(false)}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const VisualSignerOverlay = ({ file, signers, onUpdateSigners, onClose }) => {
    const [numPages, setNumPages] = useState(null);
    const [selectedIdx, setSelectedIdx] = useState(signers.length > 0 ? 0 : -1);
    const containerRef = React.useRef(null);

    // Standard A4 Ratio: 210 / 297 = 0.707
    // Using 0.707 logic or calculating actual scale from rendered PDF

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const handleBoxDrag = (idx, e, data) => {
        // Find the page being hovered or just use the current page property
        // For simplicity, we assume they drag within the visible viewport context.
        // Usually, users want to drag between pages but that's complex.
        // Let's implement placement per page.
        
        const newSigners = [...signers];
        // data.x and data.y are in pixels relative to the parent?
        // Actually react-draggable or framer-motion drag provides delta.
        // We'll calculate percent or mm relative to original 210x297.
        
        // We need the rendered page width/height.
    };

    const updateSignerPos = (idx, x_mm, y_mm, page) => {
        const newSigners = [...signers];
        newSigners[idx] = { ...newSigners[idx], x: x_mm, y: y_mm, page: page };
        onUpdateSigners(newSigners);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: '#1e293b', 
            zIndex: 1500, display: 'flex', flexDirection: 'column'
        }}>
            {/* Header Overlay */}
            <div style={{ padding: '1rem 2rem', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Visual Signature Placement</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Geser kotak nama ke lokasi tanda tangan yang diinginkan</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={onClose}
                        style={{ padding: '0.625rem 1.5rem', borderRadius: '10px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                    >
                        Selesai Atur
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Signers Panel */}
                <div style={{ width: '280px', background: '#1e293b', borderRight: '1px solid #334155', padding: '1.5rem', overflowY: 'auto' }}>
                    <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Daftar Penanda Tangan</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {signers.map((s, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setSelectedIdx(idx)}
                                style={{ 
                                    padding: '1rem', borderRadius: '12px', border: selectedIdx === idx ? '2px solid var(--primary)' : '1px solid #334155',
                                    background: selectedIdx === idx ? 'rgba(30, 89, 197, 0.1)' : '#0f172a',
                                    color: 'white', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{s.user_name || `Orang #${idx + 1}`}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Halaman {s.page} • ({s.x.toFixed(0)}, {s.y.toFixed(0)}) mm</div>
                                    </div>
                                    {(s.sign_type === 'paraf' ? s.paraf_img : s.signature_img) && (
                                        <div style={{ width: '40px', height: '40px', background: 'white', border: '1px solid #334155', borderRadius: '4px', overflow: 'hidden' }}>
                                            <img src={`/public/uploads/${s.sign_type === 'paraf' ? 'parafs' : 'signatures'}/${s.sign_type === 'paraf' ? s.paraf_img : s.signature_img}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </div>
                                    )}
                                </div>
                                {selectedIdx === idx && (
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Lebar TTD: {s.width} mm</label>
                                        <input 
                                            type="range" min="10" max="100" value={s.width} 
                                            onChange={e => {
                                                const newSigners = [...signers];
                                                newSigners[idx] = { ...newSigners[idx], width: parseFloat(e.target.value) };
                                                onUpdateSigners(newSigners);
                                            }}
                                            style={{ width: '100%', cursor: 'pointer' }} 
                                        />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* PDF Viewer */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#334155' }}>
                    <Document 
                        file={file} 
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<div style={{ color: 'white' }}>Memuat Dokumen...</div>}
                    >
                        {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map(pageNum => (
                            <div key={pageNum} style={{ position: 'relative', marginBottom: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                <Page 
                                    pageNumber={pageNum} 
                                    width={650} // Fixed width for easier math
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                                {/* Signature Overlays for this page */}
                                {signers.map((s, idx) => s.page === pageNum && (
                                    <motion.div
                                        key={idx}
                                        drag
                                        dragMomentum={false}
                                        dragElastic={0}
                                        initial={{ 
                                            x: s.x * (650 / 210), 
                                            y: s.y * (650 / 210) 
                                        }}
                                        style={{
                                            position: 'absolute',
                                            width: `${s.width * (650/210)}px`,
                                            height: `${(s.width * 0.4) * (650/210)}px`, 
                                            background: selectedIdx === idx ? 'rgba(30, 89, 197, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                            border: `2px ${selectedIdx === idx ? 'solid var(--primary)' : 'dashed rgba(255,255,255,0.5)'}`,
                                            borderRadius: '8px',
                                            cursor: 'grab',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: selectedIdx === idx ? 10 : 1,
                                            userSelect: 'none',
                                            top: 0, left: 0,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                            backdropFilter: 'blur(4px)'
                                        }}
                                        onDrag={(e, info) => {
                                            // info.point is global, but latest from motion is relative to initial
                                            // The latest x/y from the motion logic is what we need
                                        }}
                                        onUpdate={(latest) => {
                                            const x_mm = latest.x / (650 / 210);
                                            const y_mm = latest.y / (650 / 210);
                                            if (Math.abs(s.x - x_mm) > 0.5 || Math.abs(s.y - y_mm) > 0.5) {
                                                updateSignerPos(idx, x_mm, y_mm, pageNum);
                                            }
                                        }}
                                        onTap={() => setSelectedIdx(idx)}
                                    >
                                        {(s.sign_type === 'paraf' ? s.paraf_img : s.signature_img) ? (
                                            <img 
                                                src={`/public/uploads/${s.sign_type === 'paraf' ? 'parafs' : 'signatures'}/${s.sign_type === 'paraf' ? s.paraf_img : s.signature_img}`} 
                                                alt="" 
                                                style={{ width: '80%', height: '80%', objectFit: 'contain', pointerEvents: 'none', filter: selectedIdx === idx ? 'none' : 'grayscale(100%) opacity(0.5)' }} 
                                            />
                                        ) : (
                                            <div style={{ fontSize: '10px', fontWeight: 800, color: 'white', opacity: 0.5, textAlign: 'center', lineHeight: 1.1 }}>
                                                [{s.sign_type === 'paraf' ? 'Paraf Kosong' : 'TTD Kosong'}]
                                            </div>
                                        )}

                                        {/* Text placement precisely matches pdf_helper.go (rendered slightly below the box) */}
                                        {!s.hide_role && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', textAlign: 'center', pointerEvents: 'none', paddingTop: '2px' }}>
                                                <div style={{ fontSize: '8px', fontWeight: 800, color: 'white', textShadow: '0px 1px 3px rgba(0,0,0,0.8)' }}>
                                                    {s.user_name || 'Penanda Tangan'}
                                                </div>
                                                <div style={{ fontSize: '6px', color: 'white', opacity: 0.9, textShadow: '0px 1px 3px rgba(0,0,0,0.8)', marginTop: '1px' }}>
                                                    {s.role}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                                
                                <div style={{ 
                                    position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '0.5rem'
                                }}>
                                    {selectedIdx !== -1 && signers[selectedIdx]?.page !== pageNum && (
                                        <button 
                                            onClick={() => updateSignerPos(selectedIdx, 50, 50, pageNum)}
                                            style={{
                                                padding: '0.4rem 0.8rem', borderRadius: '8px', background: 'var(--primary)',
                                                color: 'white', border: 'none', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            Pindahkan {signers[selectedIdx].user_name} ke sini
                                        </button>
                                    )}
                                    <div style={{ 
                                        padding: '0.4rem 0.8rem', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)',
                                        color: 'white', fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(4px)'
                                    }}>
                                        Halaman {pageNum}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Document>
                </div>
            </div>
        </div>
    );
};

export default GoSign;
