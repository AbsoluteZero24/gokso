import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SearchableSelect from '../../components/shared/SearchableSelect';
import { 
    Search, 
    ArrowLeft, 
    Printer, 
    Download,
    Loader2,
    Database,
    HardDrive,
    Cpu,
    Activity,
    ChevronDown,
    Plus,
    X,
    Upload,
    Trash2,
    CheckSquare,
    Square,
    FileSignature,
    UserCheck,
    PenTool,
    Eye,
    Edit,
    Calendar,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const FMSI0101 = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [servers, setServers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState('2026');
    const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showSignModal, setShowSignModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [users, setUsers] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [signForm, setSignForm] = useState({
        prepared_by_id: '',
        approved_by_id: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [viewDate, setViewDate] = useState(new Date());
    const [activeDropdown, setActiveDropdown] = useState(null); // 'preparer', 'approver', or 'date'
    const [userSearch, setUserSearch] = useState('');
    const [newServer, setNewServer] = useState({
        name: '',
        ip_address: '',
        os: '',
        cpu_value: '',
        ram_value: '',
        ram_unit: 'GB',
        storage_value: '',
        storage_unit: 'TB',
        function: '',
        period: '2026'
    });

    const periods = ['2026', '2025', '2024', '2023'];

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/godms/server-inventory?period=${selectedPeriod}`);
            setServers(response.data.servers || []);
        } catch (error) {
            console.error('Error fetching server inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredServers = servers.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.function.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/users');
            // Backend returns { users: [] }
            // Filter out administrator and ensure it's an array
            const filteredUsers = (response.data.users || []).filter(
                u => u.name.toLowerCase() !== 'administrator'
            );
            setUsers(filteredUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        }
    };

    useEffect(() => {
        fetchData();
        fetchUsers();
    }, [selectedPeriod]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeDropdown && !event.target.closest('.modern-select-container') && !event.target.closest('.modern-datepicker-container')) {
                setActiveDropdown(null);
                setUserSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

    const handleAddServer = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            await axios.post('/api/godms/server-inventory/store', {
                ...newServer,
                cpu: `${newServer.cpu_value} Core`,
                ram: `${newServer.ram_value} ${newServer.ram_unit}`,
                storage: `${newServer.storage_value} ${newServer.storage_unit}`,
                period: selectedPeriod
            });
            toast.success('Server berhasil ditambahkan');
            setShowAddModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal menambahkan server');
        } finally {
            setModalLoading(false);
        }
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            const response = await axios.post(`/api/godms/server-inventory/import?period=${selectedPeriod}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(response.data.message || 'Import berhasil');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal mengimport data');
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRequestSignature = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            await axios.post('/api/godms/server-inventory/export', {
                period: selectedPeriod,
                prepared_by_id: signForm.prepared_by_id,
                approved_by_id: signForm.approved_by_id,
                date: signForm.date
            });
            toast.success('Pengajuan GoSign berhasil dikirim');
            setShowSignModal(false);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal mengajukan GoSign');
        } finally {
            setModalLoading(false);
        }
    };

    const handlePreviewPDF = () => {
        window.open(`/api/godms/server-inventory/preview?period=${selectedPeriod}`, '_blank');
    };

    const handleEdit = (server) => {
        // Parse values: match number first, then optional letters as unit
        const cpuMatch = server.cpu ? server.cpu.match(/^([\d.]+)\s*([a-zA-Z]*)/) : null;
        const ramMatch = server.ram ? server.ram.match(/^([\d.]+)\s*([a-zA-Z]*)/) : null;
        const storageMatch = server.storage ? server.storage.match(/^([\d.]+)\s*([a-zA-Z]*)/) : null;

        setNewServer({
            name: server.name,
            ip_address: server.ip_address,
            os: server.os,
            cpu_value: cpuMatch ? cpuMatch[1] : (server.cpu || ''),
            ram_value: ramMatch ? ramMatch[1] : (server.ram || ''),
            ram_unit: (ramMatch && ramMatch[2]) ? ramMatch[2].toUpperCase() : 'GB',
            storage_value: storageMatch ? storageMatch[1] : (server.storage || ''),
            storage_unit: (storageMatch && storageMatch[2]) ? storageMatch[2].toUpperCase() : 'TB',
            function: server.function,
            period: server.period
        });
        setEditId(server.id);
        setIsEditing(true);
        setShowAddModal(true);
    };

    const handleUpdateServer = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            await axios.put(`/api/godms/server-inventory/update/${editId}`, {
                ...newServer,
                cpu: `${newServer.cpu_value} Core`,
                ram: `${newServer.ram_value} ${newServer.ram_unit}`,
                storage: `${newServer.storage_value} ${newServer.storage_unit}`,
                period: selectedPeriod
            });
            toast.success('Data server berhasil diperbarui');
            setShowAddModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal memperbarui server');
        } finally {
            setModalLoading(false);
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setEditId(null);
        setNewServer({
            name: '',
            ip_address: '',
            os: '',
            cpu_value: '',
            ram_value: '',
            ram_unit: 'GB',
            storage_value: '',
            storage_unit: 'TB',
            function: '',
            period: selectedPeriod
        });
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} data server?`)) return;
        
        try {
            await axios.post('/api/godms/server-inventory/bulk-delete', { ids: selectedIds });
            toast.success('Data server berhasil dihapus');
            setSelectedIds([]);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal menghapus data');
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredServers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredServers.map(s => s.id));
        }
    };

    const toggleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(item => item !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus data server ini?')) return;
        
        try {
            await axios.delete(`/api/godms/server-inventory/delete/${id}`);
            toast.success('Data server berhasil dihapus');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal menghapus data');
        }
    };


    return (
        <div className="page-content" style={{ padding: '0 2rem 2rem 2rem' }}>
            {/* Header Section */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '1.5rem',
                marginBottom: '2.5rem',
                paddingTop: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                        onClick={() => navigate('/godms/edid')}
                        style={{ 
                            padding: '0.5rem', 
                            borderRadius: '12px', 
                            background: 'white', 
                            border: '1.5px solid #f1f5f9', 
                            color: '#64748b', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                            <span style={{ 
                                background: 'rgba(30, 89, 197, 0.1)', 
                                color: 'var(--primary)', 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '8px', 
                                fontSize: '0.75rem', 
                                fontWeight: 800,
                                letterSpacing: '0.025em'
                            }}>FM.SI.0101</span>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Daftar Server KSO SCSI</h1>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button 
                                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: '#64748b', 
                                    fontSize: '0.875rem', 
                                    fontWeight: 600, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.375rem',
                                    cursor: 'pointer',
                                    padding: '0.25rem 0'
                                }}
                            >
                                Periode: {selectedPeriod}
                                <ChevronDown size={14} style={{ transform: showPeriodDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                            {showPeriodDropdown && (
                                <div style={{ 
                                    position: 'absolute', 
                                    top: '100%', 
                                    left: 0, 
                                    background: 'white', 
                                    border: '1.5px solid #f1f5f9', 
                                    borderRadius: '12px', 
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
                                    zIndex: 10,
                                    minWidth: '120px',
                                    marginTop: '0.5rem',
                                    overflow: 'hidden'
                                }}>
                                    {periods.map(p => (
                                        <button 
                                            key={p}
                                            onClick={() => {
                                                setSelectedPeriod(p);
                                                setShowPeriodDropdown(false);
                                            }}
                                            style={{ 
                                                display: 'block', 
                                                width: '100%', 
                                                padding: '0.75rem 1rem', 
                                                textAlign: 'left', 
                                                background: selectedPeriod === p ? 'rgba(30, 89, 197, 0.05)' : 'white',
                                                border: 'none',
                                                color: selectedPeriod === p ? 'var(--primary)' : '#64748b',
                                                fontWeight: selectedPeriod === p ? 700 : 500,
                                                fontSize: '0.813rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => { if (selectedPeriod !== p) e.currentTarget.style.background = '#f8fafc'; }}
                                            onMouseOut={(e) => { if (selectedPeriod !== p) e.currentTarget.style.background = 'white'; }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        background: 'white', 
                        border: '1.5px solid #f1f5f9', 
                        borderRadius: '14px', 
                        padding: '0.25rem 1rem', 
                        width: '400px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        <Search size={18} color="#94a3b8" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari nama server, IP, atau fungsi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', padding: '0.75rem 0', fontWeight: 500, color: '#1e293b' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {selectedIds.length > 0 && (
                            <button 
                                onClick={handleBulkDelete}
                                style={{ 
                                    padding: '0.75rem 1.25rem', 
                                    borderRadius: '12px', 
                                    background: 'rgba(239, 68, 68, 0.1)', 
                                    border: '1.5px solid #fee2e2', 
                                    color: '#ef4444', 
                                    fontWeight: 700, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem', 
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                            >
                                <Trash2 size={18} /> Hapus ({selectedIds.length})
                            </button>
                        )}
                        <button 
                            onClick={handlePreviewPDF}
                            style={{ 
                                padding: '0.75rem 1.25rem', 
                                borderRadius: '12px', 
                                background: 'white', 
                                border: '1.5px solid #f1f5f9', 
                                color: '#64748b', 
                                fontWeight: 700, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = 'white'; }}
                        >
                            <Eye size={18} /> Preview PDF
                        </button>
                        <button 
                            onClick={() => setShowSignModal(true)}
                            style={{ 
                                padding: '0.75rem 1.25rem', 
                                borderRadius: '12px', 
                                background: 'white', 
                                border: '1.5px solid #f1f5f9', 
                                color: 'var(--primary)', 
                                fontWeight: 700, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(30, 89, 197, 0.05)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = 'white'; }}
                        >
                            <FileSignature size={18} /> Ajukan GoSign
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            accept=".xlsx, .xls"
                            onChange={handleImportExcel}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            style={{ 
                                padding: '0.75rem 1.25rem', 
                                borderRadius: '12px', 
                                background: 'white', 
                                border: '1.5px solid #f1f5f9', 
                                color: '#64748b', 
                                fontWeight: 700, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                        >
                            <Upload size={18} /> Import Excel
                        </button>
                        <button 
                            onClick={() => setShowAddModal(true)}
                            style={{ 
                                padding: '0.75rem 1.75rem', 
                                borderRadius: '12px', 
                                background: '#10b981', 
                                border: 'none', 
                                color: 'white', 
                                fontWeight: 700, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#059669'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#10b981'; }}
                        >
                            <Plus size={18} /> Tambah Server
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div style={{ 
                background: 'white', 
                borderRadius: '24px', 
                border: '1.5px solid #f1f5f9',
                overflow: 'hidden',
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #f1f5f9' }}>
                                <th rowSpan="2" style={{ padding: '1.25rem 1rem', borderRight: '1.5px solid #f1f5f9', width: '40px', textAlign: 'center' }}>
                                    <button 
                                        onClick={toggleSelectAll}
                                        style={{ background: 'none', border: 'none', color: selectedIds.length === filteredServers.length && filteredServers.length > 0 ? 'var(--primary)' : '#94a3b8', cursor: 'pointer', display: 'flex', margin: '0 auto' }}
                                    >
                                        {selectedIds.length === filteredServers.length && filteredServers.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                                    </button>
                                </th>
                                <th rowSpan="2" style={{ padding: '1.25rem 1.5rem', borderRight: '1.5px solid #f1f5f9', width: '60px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>NO</th>
                                <th rowSpan="2" style={{ padding: '1.25rem 1.5rem', borderRight: '1.5px solid #f1f5f9', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>NAMA SERVER</th>
                                <th rowSpan="2" style={{ padding: '1.25rem 1.5rem', borderRight: '1.5px solid #f1f5f9', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>IP ADDRESS</th>
                                <th rowSpan="2" style={{ padding: '1.25rem 1.5rem', borderRight: '1.5px solid #f1f5f9', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>OPERATING SYSTEM</th>
                                <th colSpan="3" style={{ padding: '0.75rem 1.5rem', borderBottom: '1.5px solid #f1f5f9', borderRight: '1.5px solid #f1f5f9', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>SISTEM</th>
                                <th rowSpan="2" style={{ padding: '1.25rem 1.5rem', borderBottom: '1.5px solid #f1f5f9', borderRight: '1.5px solid #f1f5f9', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>FUNGSI</th>
                                <th rowSpan="2" style={{ padding: '1.25rem 1.5rem', borderBottom: '1.5px solid #f1f5f9', width: '80px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>AKSI</th>
                            </tr>
                            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #f1f5f9' }}>
                                <th style={{ padding: '0.75rem 1.5rem', borderRight: '1.5px solid #f1f5f9', textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>CPU</th>
                                <th style={{ padding: '0.75rem 1.5rem', borderRight: '1.5px solid #f1f5f9', textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>RAM</th>
                                <th style={{ padding: '0.75rem 1.5rem', borderRight: '1.5px solid #f1f5f9', textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>STORAGE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '5rem', textAlign: 'center' }}>
                                        <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                    </td>
                                </tr>
                            ) : filteredServers.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '5rem', textAlign: 'center', color: '#94a3b8' }}>
                                        Tidak ada data server ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                filteredServers.map((s, idx) => (
                                    <motion.tr 
                                        key={s.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        style={{ borderBottom: '1px solid #f1f5f9' }}
                                        className="table-row-hover"
                                    >
                                        <td style={{ padding: '1rem', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                                            <button 
                                                onClick={() => toggleSelectOne(s.id)}
                                                style={{ background: 'none', border: 'none', color: selectedIds.includes(s.id) ? 'var(--primary)' : '#cbd5e1', cursor: 'pointer', display: 'flex', margin: '0 auto' }}
                                            >
                                                {selectedIds.includes(s.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '0.875rem' }}>{idx + 1}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(30, 89, 197, 0.05)', color: 'var(--primary)' }}>
                                                    <Database size={16} />
                                                </div>
                                                <span style={{ fontWeight: 700, color: '#1e293b' }}>{s.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span style={{ 
                                                background: '#f1f5f9', 
                                                padding: '0.35rem 0.75rem', 
                                                borderRadius: '8px', 
                                                fontSize: '0.813rem', 
                                                fontFamily: 'monospace',
                                                fontWeight: 600,
                                                color: '#475569'
                                            }}>{s.ip_address}</span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>{s.os}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                                                <Cpu size={14} color="#94a3b8" />
                                                <span style={{ fontSize: '0.813rem', fontWeight: 700, color: '#1e293b' }}>
                                                    {s.cpu ? (/[a-zA-Z]/.test(s.cpu) ? s.cpu : `${s.cpu} Core`) : '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                                                <Activity size={14} color="#94a3b8" />
                                                <span style={{ fontSize: '0.813rem', fontWeight: 700, color: '#1e293b' }}>
                                                    {s.ram ? (/[a-zA-Z]/.test(s.ram) ? s.ram : `${s.ram} GB`) : '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                                                <HardDrive size={14} color="#94a3b8" />
                                                <span style={{ fontSize: '0.813rem', fontWeight: 700, color: '#1e293b' }}>
                                                    {s.storage ? (/[a-zA-Z]/.test(s.storage) ? s.storage : `${s.storage} TB`) : '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5, borderRight: '1px solid #f1f5f9' }}>
                                            {s.function}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button 
                                                    onClick={() => handleEdit(s)}
                                                    style={{ 
                                                        padding: '0.5rem', 
                                                        borderRadius: '10px', 
                                                        background: 'rgba(30, 89, 197, 0.1)', 
                                                        color: 'var(--primary)', 
                                                        border: 'none', 
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(30, 89, 197, 0.1)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(s.id)}
                                                    style={{ 
                                                        padding: '0.5rem', 
                                                        borderRadius: '10px', 
                                                        background: 'rgba(239, 68, 68, 0.1)', 
                                                        color: '#ef4444', 
                                                        border: 'none', 
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Server Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div style={{ 
                        position: 'fixed', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        background: 'rgba(15, 23, 42, 0.6)', 
                        backdropFilter: 'blur(4px)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        zIndex: 1000,
                        padding: '2rem'
                    }}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{ 
                                background: 'white', 
                                borderRadius: '24px', 
                                width: '100%', 
                                maxWidth: '700px', 
                                padding: '2.5rem',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                position: 'relative',
                                maxHeight: '90vh',
                                overflowY: 'auto'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                        {isEditing ? 'Edit Data Server' : 'Tambah Server Baru'}
                                    </h2>
                                    <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                                        {isEditing ? 'Perbarui detail spesifikasi server di bawah.' : 'Lengkapi detail spesifikasi server di bawah.'}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setIsEditing(false);
                                        setEditId(null);
                                        setNewServer({
                                            name: '',
                                            ip_address: '',
                                            os: '',
                                            cpu: '',
                                            ram: '',
                                            storage: '',
                                            function: '',
                                            period: selectedPeriod
                                        });
                                    }}
                                    style={{ padding: '0.5rem', borderRadius: '12px', background: '#f8fafc', border: 'none', color: '#64748b', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={isEditing ? handleUpdateServer : handleAddServer} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Nama Server</label>
                                    <input 
                                        required
                                        value={newServer.name}
                                        onChange={(e) => setNewServer({...newServer, name: e.target.value})}
                                        placeholder="Contoh: SRV-PROD-01"
                                        style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #f1f5f9', outline: 'none', fontWeight: 500 }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>IP Address</label>
                                    <input 
                                        required
                                        value={newServer.ip_address}
                                        onChange={(e) => setNewServer({...newServer, ip_address: e.target.value})}
                                        placeholder="Contoh: 192.168.1.100"
                                        style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #f1f5f9', outline: 'none', fontWeight: 500 }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Operating System</label>
                                    <input 
                                        required
                                        value={newServer.os}
                                        onChange={(e) => setNewServer({...newServer, os: e.target.value})}
                                        placeholder="Contoh: Windows Server 2022"
                                        style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #f1f5f9', outline: 'none', fontWeight: 500 }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>CPU</label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            required
                                            type="number"
                                            value={newServer.cpu_value}
                                            onChange={(e) => setNewServer({...newServer, cpu_value: e.target.value})}
                                            placeholder="Contoh: 16"
                                            style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #f1f5f9', outline: 'none', fontWeight: 500, width: '100%', paddingRight: '4rem' }}
                                        />
                                        <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#94a3b8', fontSize: '0.875rem' }}>Core</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>RAM</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input 
                                            required
                                            type="number"
                                            value={newServer.ram_value}
                                            onChange={(e) => setNewServer({...newServer, ram_value: e.target.value})}
                                            placeholder="Contoh: 64"
                                            style={{ flex: 1, padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #f1f5f9', outline: 'none', fontWeight: 500 }}
                                        />
                                        <select 
                                            value={newServer.ram_unit}
                                            onChange={(e) => setNewServer({...newServer, ram_unit: e.target.value})}
                                            style={{ width: '80px', padding: '0.875rem 0.5rem', borderRadius: '12px', border: '1.5px solid #f1f5f9', background: 'white', fontWeight: 700, color: '#475569' }}
                                        >
                                            <option value="GB">GB</option>
                                            <option value="MB">MB</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Storage</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input 
                                            required
                                            type="number"
                                            step="0.01"
                                            value={newServer.storage_value}
                                            onChange={(e) => setNewServer({...newServer, storage_value: e.target.value})}
                                            placeholder="Contoh: 2"
                                            style={{ flex: 1, padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #f1f5f9', outline: 'none', fontWeight: 500 }}
                                        />
                                        <select 
                                            value={newServer.storage_unit}
                                            onChange={(e) => setNewServer({...newServer, storage_unit: e.target.value})}
                                            style={{ width: '80px', padding: '0.875rem 0.5rem', borderRadius: '12px', border: '1.5px solid #f1f5f9', background: 'white', fontWeight: 700, color: '#475569' }}
                                        >
                                            <option value="TB">TB</option>
                                            <option value="GB">GB</option>
                                            <option value="MB">MB</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fungsi</label>
                                    <textarea 
                                        required
                                        value={newServer.function}
                                        onChange={(e) => setNewServer({...newServer, function: e.target.value})}
                                        placeholder="Jelaskan fungsi utama server ini..."
                                        rows="3"
                                        style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #f1f5f9', outline: 'none', fontWeight: 500, resize: 'none' }}
                                    />
                                </div>

                                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button 
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        style={{ flex: 1, padding: '1rem', borderRadius: '14px', background: '#f1f5f9', border: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={modalLoading}
                                        style={{ 
                                            flex: 1, 
                                            padding: '1rem', 
                                            borderRadius: '14px', 
                                            background: 'var(--primary)', 
                                            border: 'none', 
                                            color: 'white', 
                                            fontWeight: 700, 
                                            cursor: modalLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {modalLoading ? <Loader2 size={18} className="animate-spin" /> : (isEditing ? 'Perbarui Server' : 'Simpan Server')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Request Signature Modal */}
            <AnimatePresence>
                {showSignModal && (
                    <div style={{ 
                        position: 'fixed', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        background: 'rgba(15, 23, 42, 0.6)', 
                        backdropFilter: 'blur(4px)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        zIndex: 1000,
                        padding: '2rem'
                    }}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{ 
                                background: 'white', 
                                borderRadius: '24px', 
                                width: '100%', 
                                maxWidth: '500px', 
                                padding: '2.5rem',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Ajukan GoSign</h2>
                                    <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>Pilih personil untuk menandatangani dokumen.</p>
                                </div>
                                <button 
                                    onClick={() => setShowSignModal(false)}
                                    style={{ padding: '0.5rem', borderRadius: '12px', background: '#f8fafc', border: 'none', color: '#64748b', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleRequestSignature} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                        <div style={{ padding: '0.35rem', borderRadius: '6px', background: 'rgba(30, 89, 197, 0.1)', color: 'var(--primary)' }}>
                                            <Calendar size={14} />
                                        </div>
                                        Tanggal Dokumen
                                    </label>
                                    
                                    <div style={{ position: 'relative' }} className="modern-datepicker-container">
                                        <div 
                                            onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
                                            style={{ 
                                                width: '100%',
                                                padding: '1.125rem 1.25rem', 
                                                borderRadius: '16px', 
                                                border: `2px solid ${activeDropdown === 'date' ? 'var(--primary)' : '#f1f5f9'}`, 
                                                background: 'white',
                                                color: '#1e293b',
                                                cursor: 'pointer',
                                                fontSize: '0.938rem',
                                                fontWeight: 600,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                transition: 'all 0.2s',
                                                boxShadow: activeDropdown === 'date' ? '0 0 0 4px rgba(30, 89, 197, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)'
                                            }}
                                        >
                                            <span>
                                                {(() => {
                                                    const d = new Date(signForm.date);
                                                    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                                                    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
                                                })()}
                                            </span>
                                            <Calendar size={18} style={{ color: activeDropdown === 'date' ? 'var(--primary)' : '#94a3b8' }} />
                                        </div>

                                        <AnimatePresence>
                                            {activeDropdown === 'date' && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    style={{ 
                                                        position: 'absolute', 
                                                        top: 'calc(100% + 8px)', 
                                                        left: 0, 
                                                        right: 0, 
                                                        background: 'white', 
                                                        borderRadius: '20px', 
                                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', 
                                                        zIndex: 2000, 
                                                        overflow: 'hidden',
                                                        border: '1px solid #f1f5f9',
                                                        padding: '1.25rem'
                                                    }}
                                                >
                                                    {(() => {
                                                        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                                                        const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

                                                        const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
                                                        const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
                                                        
                                                        const prevMonthDays = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();
                                                        
                                                        const calendarDays = [];
                                                        // Fill prev month days
                                                        for (let i = firstDay - 1; i >= 0; i--) {
                                                            calendarDays.push({ day: prevMonthDays - i, current: false, date: new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, prevMonthDays - i) });
                                                        }
                                                        // current month
                                                        for (let i = 1; i <= daysInMonth; i++) {
                                                            calendarDays.push({ day: i, current: true, date: new Date(viewDate.getFullYear(), viewDate.getMonth(), i) });
                                                        }
                                                        // next month
                                                        const remaining = 42 - calendarDays.length;
                                                        for (let i = 1; i <= remaining; i++) {
                                                            calendarDays.push({ day: i, current: false, date: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, i) });
                                                        }

                                                        return (
                                                            <>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); }}
                                                                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #f1f5f9', background: 'white', cursor: 'pointer', color: '#64748b' }}
                                                                    >
                                                                        <ChevronLeft size={16} />
                                                                    </button>
                                                                    <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.875rem' }}>{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); }}
                                                                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #f1f5f9', background: 'white', cursor: 'pointer', color: '#64748b' }}
                                                                    >
                                                                        <ChevronRight size={16} />
                                                                    </button>
                                                                </div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                                                                    {days.map(d => (
                                                                        <span key={d} style={{ fontSize: '0.625rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', padding: '0.5rem 0' }}>{d}</span>
                                                                    ))}
                                                                    {calendarDays.map((d, i) => {
                                                                        const isSelected = new Date(signForm.date).toDateString() === d.date.toDateString();
                                                                        const isToday = new Date().toDateString() === d.date.toDateString();
                                                                        
                                                                        return (
                                                                            <button
                                                                                key={i}
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSignForm({ ...signForm, date: d.date.toISOString().split('T')[0] });
                                                                                    setActiveDropdown(null);
                                                                                }}
                                                                                style={{
                                                                                    padding: '0.5rem 0',
                                                                                    borderRadius: '10px',
                                                                                    border: 'none',
                                                                                    background: isSelected ? 'var(--primary)' : 'transparent',
                                                                                    color: isSelected ? 'white' : (d.current ? '#1e293b' : '#cbd5e1'),
                                                                                    fontWeight: isSelected || isToday ? 800 : 600,
                                                                                    fontSize: '0.813rem',
                                                                                    cursor: 'pointer',
                                                                                    transition: 'all 0.2s',
                                                                                    position: 'relative'
                                                                                }}
                                                                                onMouseOver={(e) => !isSelected && (e.currentTarget.style.background = '#f8fafc')}
                                                                                onMouseOut={(e) => !isSelected && (e.currentTarget.style.background = 'transparent')}
                                                                            >
                                                                                {d.day}
                                                                                {isToday && !isSelected && (
                                                                                    <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)' }} />
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <SearchableSelect
                                        label="Disusun oleh"
                                        placeholder="Pilih Penyusun..."
                                        options={users.map(u => ({ value: u.id, label: `${u.name} - ${u.position}` }))}
                                        value={signForm.prepared_by_id}
                                        onChange={(val) => setSignForm({ ...signForm, prepared_by_id: val })}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <SearchableSelect
                                        label="Disetujui oleh"
                                        placeholder="Pilih Penyetuju..."
                                        options={users.map(u => ({ value: u.id, label: `${u.name} - ${u.position}` }))}
                                        value={signForm.approved_by_id}
                                        onChange={(val) => setSignForm({ ...signForm, approved_by_id: val })}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button 
                                        type="button"
                                        onClick={() => setShowSignModal(false)}
                                        style={{ 
                                            flex: 1, 
                                            padding: '1.125rem', 
                                            borderRadius: '16px', 
                                            background: '#f1f5f9', 
                                            border: 'none', 
                                            color: '#64748b', 
                                            fontWeight: 700, 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                        onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={modalLoading}
                                        style={{ 
                                            flex: 2, 
                                            padding: '1.125rem', 
                                            borderRadius: '16px', 
                                            background: 'var(--primary)', 
                                            border: 'none', 
                                            color: 'white', 
                                            fontWeight: 700, 
                                            cursor: modalLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.75rem',
                                            boxShadow: '0 10px 15px -3px rgba(30, 89, 197, 0.25)',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => { if(!modalLoading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        {modalLoading ? <Loader2 size={20} className="animate-spin" /> : (
                                            <>
                                                <FileSignature size={20} />
                                                Ajukan GoSign
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FMSI0101;
