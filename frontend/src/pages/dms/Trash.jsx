import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
    Folder,
    File,
    RotateCcw,
    Trash2,
    Home,
    Search,
    Loader2,
    HardDrive,
    Grid,
    List as ListIcon,
    FileText,
    ChevronDown,
    X,
    Shield,
    Building2,
    Users,
    Database,
    HardDrive as StorageIcon,
    Check,
    ChevronRight,
    FileSpreadsheet,
    FileVideo,
    FileAudio,
    FileArchive,
    FileImage,
    FileCode
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/shared/ConfirmModal';

const Trash = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Advanced Role Logic
    const userDept = user?.department;
    const dmsScope = user?.dms_filter_scope || 'Department'; 
    const allowedSectionsStr = user?.allowed_sections || '';
    const allowedSections = allowedSectionsStr ? allowedSectionsStr.split(',').map(s => s.trim()) : [];
    
    const isFullAccess = dmsScope === 'All' || user?.role === 'Super Admin';
    
    const section = searchParams.get('section') || (isFullAccess ? 'Sistem Informasi' : (userDept || 'Sistem Informasi'));

    const [data, setData] = useState({ folders: [], files: [] });
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSectionDropdown, setShowSectionDropdown] = useState(false);
    const [selectedItems, setSelectedItems] = useState({ folderIds: [], fileIds: [] });
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [allFolders, setAllFolders] = useState([]);
    const [selectedTargetFolder, setSelectedTargetFolder] = useState(null);
    const [moveLoading, setMoveLoading] = useState(false);
    const [expandedMoveFolders, setExpandedMoveFolders] = useState({});

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        isLoading: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const sectionRef = useRef(null);

    const getFileStyle = (extension) => {
        const ext = extension?.toLowerCase();
        switch (ext) {
            case 'pdf':
                return { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', icon: <FileText /> }; // Red
            case 'xlsx':
            case 'xls':
            case 'csv':
                return { color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)', icon: <FileSpreadsheet /> }; // Green
            case 'docx':
            case 'doc':
                return { color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: <FileText /> }; // Blue
            case 'pptx':
            case 'ppt':
                return { color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)', icon: <FileText /> }; // Orange
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif':
            case 'svg':
            case 'webp':
                return { color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.1)', icon: <FileImage /> }; // Pink
            case 'zip':
            case 'rar':
            case '7z':
                return { color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.1)', icon: <FileArchive /> }; // Purple
            case 'mp4':
            case 'mov':
            case 'avi':
                return { color: '#facc15', bgColor: 'rgba(250, 204, 21, 0.1)', icon: <FileVideo /> }; // Yellow
            case 'mp3':
            case 'wav':
            case 'ogg':
                return { color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.1)', icon: <FileAudio /> }; // Cyan
            case 'js':
            case 'html':
            case 'css':
            case 'go':
            case 'py':
                return { color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: <FileCode /> }; // Emerald
            default:
                return { color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.1)', icon: <File /> }; // Slate
        }
    };

    const toggleSelection = (id, type) => {
        setSelectedItems(prev => {
            const key = type === 'folder' ? 'folderIds' : 'fileIds';
            const exists = prev[key].includes(id);
            if (exists) {
                return { ...prev, [key]: prev[key].filter(i => i !== id) };
            } else {
                return { ...prev, [key]: [...prev[key], id] };
            }
        });
    };

    const selectAll = () => {
        const folderIds = filteredFolders.map(f => f.id || f.ID);
        const fileIds = filteredFiles.map(f => f.id || f.ID);
        if (selectedItems.folderIds.length === folderIds.length && selectedItems.fileIds.length === fileIds.length) {
            setSelectedItems({ folderIds: [], fileIds: [] });
        } else {
            setSelectedItems({ folderIds, fileIds });
        }
    };

    const handleBulkRestore = async () => {
        if (selectedItems.folderIds.length === 0 && selectedItems.fileIds.length === 0) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            selectedItems.folderIds.forEach(id => params.append('folder_ids[]', id));
            selectedItems.fileIds.forEach(id => params.append('file_ids[]', id));
            await axios.post('/api/godms/bulk/restore', params);
            setSelectedItems({ folderIds: [], fileIds: [] });
            fetchData();
        } catch (error) {
            console.error('Error bulk restore:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDeletePermanent = () => {
        if (selectedItems.folderIds.length === 0 && selectedItems.fileIds.length === 0) return;

        setConfirmModal({
            isOpen: true,
            isLoading: false,
            title: 'Hapus Permanen',
            message: `Hapus ${selectedItems.folderIds.length + selectedItems.fileIds.length} item terpilih secara permanen? Tindakan ini tidak bisa dibatalkan.`,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    const params = new URLSearchParams();
                    selectedItems.folderIds.forEach(id => params.append('folder_ids[]', id));
                    selectedItems.fileIds.forEach(id => params.append('file_ids[]', id));
                    await axios.post('/api/godms/bulk/delete', params);
                    setSelectedItems({ folderIds: [], fileIds: [] });
                    setConfirmModal({ isOpen: false, isLoading: false, title: '', message: '', onConfirm: () => { } });
                    fetchData();
                } catch (error) {
                    setConfirmModal(prev => ({ ...prev, isLoading: false }));
                    console.error('Error bulk delete:', error);
                }
            }
        });
    };

    const handleOpenMoveModal = async () => {
        setMoveLoading(true);
        setShowMoveModal(true);
        try {
            const response = await axios.get(`/api/godms/folders/list-all?section=${section}`);
            setAllFolders(response.data?.folders || []);
        } catch (error) {
            console.error('Error fetching all folders:', error);
        } finally {
            setMoveLoading(false);
        }
    };

    const handleBulkMove = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('target_id', selectedTargetFolder || '');
            selectedItems.folderIds.forEach(id => params.append('folder_ids[]', id));
            selectedItems.fileIds.forEach(id => params.append('file_ids[]', id));
            await axios.post('/api/godms/bulk/move', params);
            setShowMoveModal(false);
            setSelectedTargetFolder(null);
            setSelectedItems({ folderIds: [], fileIds: [] });
            fetchData();
        } catch (error) {
            console.error('Error bulk move:', error);
        } finally {
            setLoading(false);
        }
    };

    const allSections = [
        { label: 'Operasi Luar Negeri', icon: <FileText size={16} /> },
        { label: 'Keuangan & Administrasi', icon: <Database size={16} /> },
        { label: 'Sistem Kepatuhan', icon: <Shield size={16} /> },
        { label: 'Operasi Dalam Negeri', icon: <Building2 size={16} /> },
        { label: 'Penjualan & Stakeholder', icon: <Users size={16} /> },
        { label: 'Sistem Informasi', icon: <HardDrive size={16} /> }
    ];

    const availableSections = allSections.filter(s => {
        if (isFullAccess) return true;
        if (s.label === userDept) return true;
        return allowedSections.includes(s.label);
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/godms/trash?section=${section}`);
            setData({
                folders: response.data.folders || [],
                files: response.data.files || []
            });
        } catch (error) {
            console.error('Error fetching trash data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [section]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sectionRef.current && !sectionRef.current.contains(event.target)) {
                setShowSectionDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRestoreFile = async (id) => {
        try {
            const params = new URLSearchParams();
            params.append('id', id);
            await axios.post('/api/godms/file/restore', params);
            fetchData();
        } catch (error) {
            console.error('Error restoring file:', error);
        }
    };

    const handleRestoreFolder = async (id) => {
        try {
            const params = new URLSearchParams();
            params.append('id', id);
            await axios.post('/api/godms/folder/restore', params);
            fetchData();
        } catch (error) {
            console.error('Error restoring folder:', error);
        }
    };

    const handleDeleteFilePermanent = (id) => {
        setConfirmModal({
            isOpen: true,
            isLoading: false,
            title: 'Hapus File Permanen',
            message: 'Hapus file secara permanen? Tindakan ini tidak bisa dibatalkan.',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    const params = new URLSearchParams();
                    params.append('id', id);
                    await axios.post('/api/godms/file/delete', params);
                    setConfirmModal({ isOpen: false, isLoading: false, title: '', message: '', onConfirm: () => { } });
                    fetchData();
                } catch (error) {
                    setConfirmModal(prev => ({ ...prev, isLoading: false }));
                    console.error('Error deleting file permanently:', error);
                }
            }
        });
    };

    const handleDeleteFolderPermanent = (id) => {
        setConfirmModal({
            isOpen: true,
            isLoading: false,
            title: 'Hapus Folder Permanen',
            message: 'Hapus folder secara permanen? Semua isi di dalamnya akan ikut dihapus secara permanen.',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    const params = new URLSearchParams();
                    params.append('id', id);
                    await axios.post('/api/godms/folder/delete', params);
                    setConfirmModal({ isOpen: false, isLoading: false, title: '', message: '', onConfirm: () => { } });
                    fetchData();
                } catch (error) {
                    setConfirmModal(prev => ({ ...prev, isLoading: false }));
                    console.error('Error deleting folder permanently:', error);
                }
            }
        });
    };

    const filteredFolders = data.folders.filter(f => (f.name || f.Name || '').toLowerCase().includes((searchTerm || '').toLowerCase()));
    const filteredFiles = data.files.filter(f => (f.name || f.Name || '').toLowerCase().includes((searchTerm || '').toLowerCase()));

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>Trash Bin</h1>
                    <p style={{ color: '#64748b' }}>Items in trash will be automatically deleted after 30 days.</p>
                </div>

                <div className="custom-select-container" ref={sectionRef}>
                    <button
                        onClick={() => setShowSectionDropdown(!showSectionDropdown)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: 'white',
                            border: '1px solid var(--border)',
                            borderRadius: '50px',
                            padding: '0.625rem 1.25rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                            color: '#1e293b',
                            fontSize: '0.875rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    >
                        <span style={{ color: 'var(--primary)', display: 'flex' }}>
                            {allSections.find(s => s.label === section)?.icon || <StorageIcon size={16} />}
                        </span>
                        {section}
                        {availableSections.length > 1 && <ChevronDown size={16} style={{ transform: showSectionDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                    </button>

                    {availableSections.length > 1 && showSectionDropdown && (
                        <div className="custom-select-dropdown" style={{ right: 0, minWidth: '320px', borderRadius: '20px', padding: '0.75rem' }}>
                            {availableSections.map(s => (
                                <button
                                    key={s.label}
                                    onClick={() => {
                                        navigate(`/godms/trash?section=${s.label}`);
                                        setShowSectionDropdown(false);
                                    }}
                                    className={`custom-select-item ${section === s.label ? 'active' : ''}`}
                                    style={{ padding: '0.875rem 1rem' }}
                                >
                                    <span style={{ display: 'flex', opacity: 0.7 }}>{s.icon}</span>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Path / Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <Link to="/godms/edoc" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                    <Home size={18} />
                </Link>
                <span style={{ color: '#94a3b8' }}>/</span>
                <span style={{ fontWeight: 700 }}>Trash Bin</span>
            </div>

            {/* Search and View Toggle */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div className="search-container" style={{ flexGrow: 1 }}>
                    <Search size={18} color="var(--primary)" style={{ marginRight: '0.75rem' }} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search trash..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        onClick={selectAll}
                        style={{
                            padding: '0.625rem 1.25rem',
                            background: (selectedItems.folderIds.length > 0 || selectedItems.fileIds.length > 0) ? 'var(--primary)' : 'white',
                            color: (selectedItems.folderIds.length > 0 || selectedItems.fileIds.length > 0) ? 'white' : 'var(--primary)',
                            border: '1px solid var(--primary)',
                            borderRadius: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        {(selectedItems.folderIds.length + selectedItems.fileIds.length > 0) ? `Selected (${selectedItems.folderIds.length + selectedItems.fileIds.length})` : 'Select All'}
                    </button>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '10px' }}>
                        <button onClick={() => setViewMode('grid')} style={{ padding: '0.5rem', borderRadius: '8px', background: viewMode === 'grid' ? 'white' : 'transparent', border: 'none', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                            <Grid size={20} color={viewMode === 'grid' ? 'var(--primary)' : 'var(--text-light)'} />
                        </button>
                        <button onClick={() => setViewMode('list')} style={{ padding: '0.5rem', borderRadius: '8px', background: viewMode === 'list' ? 'white' : 'transparent', border: 'none', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                            <ListIcon size={20} color={viewMode === 'list' ? 'var(--primary)' : 'var(--text-light)'} />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
                    <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                </div>
            ) : (
                <>
                    {filteredFolders.length > 0 && (
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deleted Folders</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                {filteredFolders.map(folder => {
                                    const fId = folder.id || folder.ID;
                                    const fName = folder.name || folder.Name;
                                    const fDate = folder.trashed_at || folder.TrashedAt;
                                    return (
                                    <div
                                        key={fId}
                                        className={`chart-container ${selectedItems.folderIds.includes(fId) ? 'item-selected' : ''}`}
                                        style={{
                                            padding: '1.25rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            border: selectedItems.folderIds.includes(fId) ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            position: 'relative',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => toggleSelection(fId, 'folder')}
                                    >
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelection(fId, 'folder');
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '0.75rem',
                                                right: '0.75rem',
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '6px',
                                                border: '2px solid',
                                                borderColor: selectedItems.folderIds.includes(fId) ? 'var(--primary)' : '#cbd5e1',
                                                background: selectedItems.folderIds.includes(fId) ? 'var(--primary)' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 10
                                            }}
                                        >
                                            {selectedItems.folderIds.includes(fId) && <Check size={14} color="white" strokeWidth={3} />}
                                        </div>
                                        <div style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '14px' }}>
                                            <Folder size={28} color="#94a3b8" fill="#94a3b8" fillOpacity={0.4} />
                                        </div>
                                        <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                                            <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e293b' }}>{fName}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                                                Deleted {new Date(fDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem', opacity: (selectedItems.folderIds.length > 0 || selectedItems.fileIds.length > 0) ? 0.3 : 1 }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRestoreFolder(fId); }}
                                                style={{ background: 'transparent', border: 'none', color: '#10b981', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                                                title="Restore"
                                            >
                                                <RotateCcw size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteFolderPermanent(fId); }}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                                                title="Delete Permanently"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deleted Files</h3>
                        {filteredFiles.length === 0 && filteredFolders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '5rem', background: 'white', borderRadius: '24px', border: '1px dashed var(--border)' }}>
                                <Trash2 size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                <p style={{ color: '#64748b', fontWeight: 600 }}>Trash bin is empty for this section</p>
                            </div>
                        ) : (
                            viewMode === 'grid' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                    {filteredFiles.map(file => {
                                        const fId = file.id || file.ID;
                                        const fName = file.name || file.Name;
                                        const fExt = file.extension || file.Extension;
                                        const fDate = file.trashed_at || file.TrashedAt;
                                        return (
                                        <div
                                            key={fId}
                                            className={`chart-container ${selectedItems.fileIds.includes(fId) ? 'item-selected' : ''}`}
                                            style={{
                                                padding: '1rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.75rem',
                                                position: 'relative',
                                                border: selectedItems.fileIds.includes(fId) ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => toggleSelection(fId, 'file')}
                                        >
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelection(fId, 'file');
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '0.75rem',
                                                    right: '0.75rem',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '6px',
                                                    border: '2px solid',
                                                    borderColor: selectedItems.fileIds.includes(fId) ? 'var(--primary)' : '#cbd5e1',
                                                    background: selectedItems.fileIds.includes(fId) ? 'var(--primary)' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    zIndex: 10
                                                }}
                                            >
                                                {selectedItems.fileIds.includes(fId) && <Check size={14} color="white" strokeWidth={3} />}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '140px', background: getFileStyle(fExt).bgColor, borderRadius: '12px', opacity: 0.8 }}>
                                                {React.cloneElement(getFileStyle(fExt).icon, { size: 48, color: getFileStyle(fExt).color })}
                                            </div>
                                            <div style={{ flexGrow: 1 }}>
                                                <div style={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fName}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    Deleted {new Date(fDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', opacity: selectedItems.fileIds.length > 0 ? 0.3 : 1 }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRestoreFile(fId); }}
                                                    style={{ flexGrow: 1, padding: '0.5rem', borderRadius: '10px', border: '1px solid #d1fae5', background: '#ecfdf5', color: '#10b981', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 600, fontSize: '0.75rem', gap: '0.4rem' }}
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteFilePermanent(fId); }}
                                                    style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            ) : (
                                <div className="table-responsive" style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ padding: '1rem', width: '40px' }}>
                                                    <div
                                                        onClick={selectAll}
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            borderRadius: '6px',
                                                            border: '2px solid',
                                                            borderColor: (selectedItems.folderIds.length === filteredFolders.length && selectedItems.fileIds.length === filteredFiles.length && (filteredFolders.length + filteredFiles.length > 0)) ? 'var(--primary)' : '#cbd5e1',
                                                            background: (selectedItems.folderIds.length === filteredFolders.length && selectedItems.fileIds.length === filteredFiles.length && (filteredFolders.length + filteredFiles.length > 0)) ? 'var(--primary)' : 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {(selectedItems.folderIds.length === filteredFolders.length && selectedItems.fileIds.length === filteredFiles.length && (filteredFolders.length + filteredFiles.length > 0)) && <Check size={14} color="white" strokeWidth={3} />}
                                                    </div>
                                                </th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Name</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Deleted Date</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Size</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredFolders.map(folder => {
                                                const fId = folder.id || folder.ID;
                                                const fName = folder.name || folder.Name;
                                                const fDate = folder.trashed_at || folder.TrashedAt;
                                                return (
                                                <tr key={fId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div
                                                            onClick={() => toggleSelection(fId, 'folder')}
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '6px',
                                                                border: '2px solid',
                                                                borderColor: selectedItems.folderIds.includes(fId) ? 'var(--primary)' : '#cbd5e1',
                                                                background: selectedItems.folderIds.includes(fId) ? 'var(--primary)' : 'white',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {selectedItems.folderIds.includes(fId) && <Check size={14} color="white" strokeWidth={3} />}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <Folder size={20} color="#94a3b8" />
                                                            <span style={{ fontWeight: 600 }}>{fName}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#ef4444' }}>{new Date(fDate).toLocaleString()}</td>
                                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>-</td>
                                                </tr>
                                            )})}
                                            {filteredFiles.map(file => {
                                                const fId = file.id || file.ID;
                                                const fName = file.name || file.Name;
                                                const fExt = file.extension || file.Extension;
                                                const fDate = file.trashed_at || file.TrashedAt;
                                                const fSize = file.size || file.Size;
                                                return (
                                                <tr key={fId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div
                                                            onClick={() => toggleSelection(fId, 'file')}
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '6px',
                                                                border: '2px solid',
                                                                borderColor: selectedItems.fileIds.includes(fId) ? 'var(--primary)' : '#cbd5e1',
                                                                background: selectedItems.fileIds.includes(fId) ? 'var(--primary)' : 'white',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {selectedItems.fileIds.includes(fId) && <Check size={14} color="white" strokeWidth={3} />}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            {React.cloneElement(getFileStyle(fExt).icon, { size: 20, color: getFileStyle(fExt).color })}
                                                            <span style={{ fontWeight: 600 }}>{fName}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#ef4444' }}>{new Date(fDate).toLocaleString()}</td>
                                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>{formatSize(fSize)}</td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </div>
                </>
            )}
            {/* Bulk Action Bar */}
            {(selectedItems.folderIds.length > 0 || selectedItems.fileIds.length > 0) && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1e293b',
                    color: 'white',
                    padding: '0.875rem 1.5rem',
                    borderRadius: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                    zIndex: 100
                }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '1.5rem' }}>
                        {selectedItems.folderIds.length + selectedItems.fileIds.length} Selected
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={handleBulkRestore}
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '30px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <RotateCcw size={18} /> Restore
                        </button>
                        <button
                            onClick={handleOpenMoveModal}
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '30px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <ChevronRight size={18} /> Move
                        </button>
                        <button
                            onClick={handleBulkDeletePermanent}
                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '30px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Trash2 size={18} /> Delete
                        </button>
                    </div>
                    <button
                        onClick={() => setSelectedItems({ folderIds: [], fileIds: [] })}
                        style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', padding: '0.25rem', cursor: 'pointer' }}
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Move Modal */}
            {showMoveModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '450px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Move items to...</h2>
                            <button onClick={() => setShowMoveModal(false)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
                            <div
                                onClick={() => setSelectedTargetFolder('')}
                                style={{
                                    padding: '0.875rem 1rem',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    background: selectedTargetFolder === '' ? 'rgba(30, 89, 197, 0.05)' : 'transparent',
                                    border: selectedTargetFolder === '' ? '1px solid var(--primary)' : '1px solid transparent',
                                    marginBottom: '0.25rem'
                                }}
                            >
                                <Home size={20} color={selectedTargetFolder === '' ? 'var(--primary)' : '#94a3b8'} />
                                <span style={{ fontWeight: selectedTargetFolder === '' ? 700 : 500 }}>Root Directory</span>
                            </div>

                            {moveLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                                </div>
                            ) : (
                                (() => {
                                    const toggleMoveFolder = (id) => setExpandedMoveFolders(p => ({...p, [id]: !p[id]}));
                                    const renderFolderTree = (parentId, depth = 0) => {
                                        const children = allFolders.filter(f => {
                                            if (selectedItems.folderIds.includes(f.ID || f.id)) return false;
                                            const fParentId = f.parent_id || f.ParentID;
                                            if (!parentId) return !fParentId;
                                            return fParentId === parentId;
                                        });

                                        if (children.length === 0) return null;

                                        return children.map(f => {
                                            const fId = f.id || f.ID;
                                            const fName = f.name || f.Name;
                                            const isExpanded = expandedMoveFolders[fId];
                                            
                                            const hasChildren = allFolders.some(child => {
                                                if (selectedItems.folderIds.includes(child.ID || child.id)) return false;
                                                return (child.parent_id || child.ParentID) === fId;
                                            });

                                            return (
                                                <div key={fId} style={{ marginTop: '0.25rem' }}>
                                                    <div
                                                        onClick={() => setSelectedTargetFolder(fId)}
                                                        style={{
                                                            padding: '0.625rem 0.75rem',
                                                            paddingLeft: `${1 + depth * 1.5}rem`,
                                                            borderRadius: '12px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.75rem',
                                                            background: selectedTargetFolder === fId ? 'rgba(30, 89, 197, 0.05)' : 'transparent',
                                                            border: selectedTargetFolder === fId ? '1px solid var(--primary)' : '1px solid transparent',
                                                        }}
                                                    >
                                                        <div 
                                                            style={{ display: 'flex', alignItems: 'center', width: '20px', height: '20px', cursor: 'pointer', justifyContent: 'center' }}
                                                            onClick={(e) => {
                                                                if (hasChildren) {
                                                                    e.stopPropagation();
                                                                    toggleMoveFolder(fId);
                                                                }
                                                            }}
                                                        >
                                                            {hasChildren ? (
                                                                <ChevronDown size={16} color="#64748b" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                                                            ) : <div style={{width: '16px'}}></div>}
                                                        </div>
                                                        <Folder size={20} color={selectedTargetFolder === fId ? '#f59e0b' : '#94a3b8'} fill={selectedTargetFolder === fId ? '#f59e0b' : 'transparent'} fillOpacity={0.2} />
                                                        <span style={{ fontWeight: selectedTargetFolder === fId ? 700 : 500 }}>{fName}</span>
                                                    </div>
                                                    {isExpanded && hasChildren && (
                                                        <div>
                                                            {renderFolderTree(fId, depth + 1)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    };
                                    
                                    return renderFolderTree(null, 0);
                                })()
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setShowMoveModal(false)}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 700, color: '#64748b', cursor: 'pointer', background: 'white' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkMove}
                                disabled={selectedTargetFolder === null}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                            >
                                Move Items
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                loading={confirmModal.isLoading}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </div>
    );
};

export default Trash;
