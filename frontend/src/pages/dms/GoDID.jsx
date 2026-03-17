import React, { useState, useEffect } from 'react';
import { 
    Search, 
    FileText, 
    ArrowRight, 
    Download,
    Eye,
    Info,
    ChevronRight,
    ClipboardList,
    Filter,
    Edit,
    X,
    Check,
    Loader2,
    Plus,
    Trash2,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CustomDatePicker from '../../components/shared/CustomDatePicker';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const GoDID = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [formDoc, setFormDoc] = useState({ id: 0, doc_no: '', name: '', revision: 0, date: '', category: 'FORMULIR' });
    const [saving, setSaving] = useState(false);

    const [collections, setCollections] = useState([]);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/godms/edid', {
                params: {
                    category: activeCategory,
                    search: searchTerm
                }
            });
            setCollections(response.data);
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Gagal mengambil daftar dokumen');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchDocuments();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [activeCategory, searchTerm]);

    const categories = ['Semua', 'MANUAL MUTU', 'PROSEDUR', 'FORMULIR', 'DOKUMEN INTERNAL'];

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    const handleAddNew = () => {
        setModalMode('add');
        setFormDoc({ 
            id: 0, 
            doc_no: '', 
            name: '', 
            revision: 0, 
            date: new Date().toISOString().split('T')[0], 
            category: activeCategory === 'Semua' ? 'FORMULIR' : activeCategory 
        });
        setShowModal(true);
    };

    const handleEdit = (doc) => {
        setModalMode('edit');
        setFormDoc({ ...doc });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) return;
        
        try {
            await axios.delete(`/api/godms/edid/delete/${id}`);
            toast.success('Dokumen berhasil dihapus');
            fetchDocuments();
        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error('Gagal menghapus dokumen');
        }
    };

    const handleSave = async () => {
        if (!formDoc.doc_no || !formDoc.name) {
            toast.error('Nomor dan Nama dokumen harus diisi');
            return;
        }

        setSaving(true);
        try {
            if (modalMode === 'add') {
                await axios.post('/api/godms/edid/store', formDoc);
                toast.success('Dokumen berhasil ditambahkan');
            } else {
                await axios.post(`/api/godms/edid/update/${formDoc.id}`, formDoc);
                toast.success('Dokumen berhasil diperbarui');
            }
            setShowModal(false);
            fetchDocuments();
        } catch (error) {
            console.error('Error saving document:', error);
            const msg = error.response?.data?.error || 'Gagal menyimpan dokumen';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };


    const filteredItems = collections.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             item.doc_no.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'Semua' || item.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    // Grouping for table display
    const groupedItems = [...filteredItems]
        .sort((a, b) => a.doc_no.localeCompare(b.doc_no, undefined, { numeric: true, sensitivity: 'base' }))
        .reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});

    return (
        <div className="page-content" style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.025em' }}>
                        <div style={{ padding: '0.625rem', background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)', borderRadius: '16px', color: 'white', boxShadow: '0 8px 16px -4px rgba(30, 89, 197, 0.25)' }}>
                            <ClipboardList size={28} />
                        </div>
                        Pusat Dokumen Digital (eDID)
                    </h1>
                    <p style={{ color: '#64748b', fontWeight: 500, fontSize: '1.063rem' }}>Dokumentasi internal, SOP, dan formulir rutin KSO secara tersentralisasi.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="search-container" style={{ width: '350px', background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <Search size={20} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="Cari nomor atau nama dokumen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', marginLeft: '0.75rem', fontWeight: 500, fontSize: '0.938rem' }}
                        />
                    </div>
                    <button
                        onClick={handleAddNew}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '14px',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 800,
                            cursor: 'pointer',
                            fontSize: '0.938rem',
                            boxShadow: '0 10px 15px -3px rgba(30, 89, 197, 0.2)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Plus size={20} />
                        Tambah Dokumen
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '2.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '12px',
                            background: activeCategory === cat ? '#1e293b' : 'white',
                            color: activeCategory === cat ? 'white' : '#64748b',
                            border: '1.5px solid',
                            borderColor: activeCategory === cat ? '#1e293b' : '#e2e8f0',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            boxShadow: activeCategory === cat ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="chart-container" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '24px', background: 'white', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center', width: '70px', color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>No.</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', width: '160px', color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>No. Dokumen</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Nama Dokumen</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center', width: '110px', color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>No. Revisi</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center', width: '190px', color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Tanggal Terbit</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', width: '140px', color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '7rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--primary)' }}>
                                        <Loader2 className="animate-spin" size={40} />
                                        <div style={{ fontWeight: 600 }}>Memuat data dokumen...</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            <AnimatePresence mode='popLayout'>
                            {Object.entries(groupedItems).map(([category, items]) => (
                                <React.Fragment key={category}>
                                    <tr style={{ background: '#fefce8' }}>
                                        <td colSpan="6" style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid #fef08a' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontWeight: 800, color: '#854d0e', fontSize: '0.875rem', letterSpacing: '0.025em' }}>
                                                <div style={{ width: '8px', height: '8px', background: '#eab308', borderRadius: '50%' }} />
                                                {category}
                                            </div>
                                        </td>
                                    </tr>
                                    {items.map((item, idx) => (
                                        <motion.tr 
                                            key={`${item.doc_no}-${idx}`}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            layout
                                            className="table-row-hover"
                                            style={{ borderBottom: '1px solid #f1f5f9' }}
                                        >
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                            <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: 700 }}>
                                                <span style={{ padding: '0.375rem 0.625rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.813rem' }}>
                                                    {item.doc_no}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.938rem', color: '#334155', fontWeight: 600 }}>
                                                {item.name}
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                                <span style={{ fontSize: '0.813rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '0.25rem 0.75rem', borderRadius: '50px', border: '1px solid #d1fae5' }}>
                                                    {item.revision}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
                                                {formatDisplayDate(item.date)}
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button 
                                                        onClick={() => handleEdit(item)}
                                                        title="Edit Dokumen" 
                                                        style={{ padding: '0.5rem', borderRadius: '10px', border: '1.5px solid #f1f5f9', background: 'white', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }} 
                                                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(30, 89, 197, 0.05)'; }} 
                                                        onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = 'white'; }}
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const routes = {
                                                                'FM.SI.0101': '/godms/edid/fmsi0101',
                                                                'FM.SI.0102': '/inventori/aset-laptop?category=Laptop',
                                                                'FM.SI.0103': '/inventori/aset-laptop?category=Printer',
                                                                'FM.SI.0104': '/inventori/aset-laptop?category=Server',
                                                                'FM.SI.0201': '/goform',
                                                                'FM.SI.08': '/goform',
                                                                'FM.SI.13': '/goform',
                                                                'PM.SI.01': '/godms/edoc',
                                                                'PM.SI.02': '/godms/edoc',
                                                            };
                                                            const target = routes[item.doc_no] || '/godms/edoc';
                                                            navigate(target);
                                                        }}
                                                        title="Buka Halaman" 
                                                        style={{ padding: '0.5rem', borderRadius: '10px', border: '1.5px solid #f1f5f9', background: 'white', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }} 
                                                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(30, 89, 197, 0.05)'; }} 
                                                        onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = 'white'; }}
                                                    >
                                                        <ExternalLink size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(item.id)}
                                                        title="Hapus Dokumen" 
                                                        style={{ padding: '0.5rem', borderRadius: '10px', border: '1.5px solid #f1f5f9', background: 'white', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }} 
                                                        onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; }} 
                                                        onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = 'white'; }}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </AnimatePresence>
                        )}
                        {!isLoading && Object.keys(groupedItems).length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: '7rem', textAlign: 'center' }}>
                                    <div style={{ color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                                        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '50%', color: '#cbd5e1' }}>
                                            <Search size={48} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#475569', marginBottom: '0.25rem' }}>Tidak Ditemukan</h3>
                                            <p style={{ fontWeight: 500, color: '#94a3b8' }}>Tidak ada dokumen yang sesuai dengan kata kunci "{searchTerm}".</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
                <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '2rem', borderRadius: '24px', color: 'white', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.2)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1 }}>
                        <ClipboardList size={120} />
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, opacity: 0.7, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>TOTAL DOKUMEN</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{collections.length} <span style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.6 }}>Files</span></div>
                </div>
                <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', color: '#1e293b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>REVISI TERTINGGI</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#059669' }}>{Math.max(...collections.map(i => i.revision))} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8' }}>Update</span></div>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !saving && setShowModal(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            style={{
                                position: 'relative',
                                background: 'white',
                                width: '100%',
                                maxWidth: '500px',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                            }}
                        >
                            <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{modalMode === 'add' ? 'Tambah Dokumen Baru' : 'Edit Dokumen'}</h3>
                                    <p style={{ margin: 0, fontSize: '0.813rem', color: '#64748b', fontWeight: 500 }}>{modalMode === 'add' ? 'Lengkapi detail dokumen di bawah ini' : formDoc.doc_no}</p>
                                </div>
                                <button onClick={() => !saving && setShowModal(false)} style={{ color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none' }}><X size={24} /></button>
                            </div>

                            <div style={{ padding: '2rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Kategori</label>
                                            <select 
                                                value={formDoc.category}
                                                onChange={(e) => setFormDoc({ ...formDoc, category: e.target.value })}
                                                style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.938rem', fontWeight: 500, appearance: 'none', background: 'white' }}
                                            >
                                                {categories.filter(c => c !== 'Semua').map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>No. Dokumen</label>
                                            <input 
                                                type="text" 
                                                placeholder="Contoh: FM.SI.01"
                                                value={formDoc.doc_no}
                                                onChange={(e) => setFormDoc({ ...formDoc, doc_no: e.target.value })}
                                                style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.938rem', fontWeight: 500 }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Nama Dokumen</label>
                                        <input 
                                            type="text" 
                                            placeholder="Masukkan nama lengkap dokumen..."
                                            value={formDoc.name}
                                            onChange={(e) => setFormDoc({ ...formDoc, name: e.target.value })}
                                            style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.938rem', fontWeight: 500 }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>No. Revisi</label>
                                            <input 
                                                type="number" 
                                                value={formDoc.revision}
                                                onChange={(e) => setFormDoc({ ...formDoc, revision: parseInt(e.target.value) || 0 })}
                                                style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.938rem', fontWeight: 500 }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <CustomDatePicker
                                                label="Tanggal Terbit"
                                                selected={formDoc.date}
                                                onChange={(val) => setFormDoc({ ...formDoc, date: val })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                                    <button 
                                        disabled={saving}
                                        onClick={() => setShowModal(false)} 
                                        style={{ flex: 1, padding: '0.875rem', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        style={{ flex: 2, padding: '0.875rem', borderRadius: '14px', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', boxShadow: '0 4px 12px rgba(30, 89, 197, 0.2)' }}
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                        {modalMode === 'add' ? 'Tambahkan Dokumen' : 'Simpan Perubahan'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GoDID;
