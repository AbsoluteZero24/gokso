import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import {
    Folder,
    File,
    Plus,
    MoreVertical,
    Download,
    Trash2,
    Edit2,
    ChevronRight,
    Home,
    Search,
    Loader2,
    HardDrive,
    Grid,
    List as ListIcon,
    FileText,
    ChevronDown,
    FolderPlus,
    Upload,
    X,
    Check,
    Shield,
    Building2,
    Users,
    Database,
    Eye,
    FileSpreadsheet,
    FileVideo,
    FileAudio,
    FileArchive,
    FileImage,
    FileCode
} from 'lucide-react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/shared/ConfirmModal';

const GoDMS = () => {
    const { folderId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth(); // Menggunakan custom hook auth
    
    // --- LOGIKA AKSES DAN FILTER ---
    const userDept = currentUser?.department;
    const dmsScope = currentUser?.dms_filter_scope || 'Department'; // Lingkup akses DMS
    const allowedSectionsStr = currentUser?.allowed_sections || '';
    const allowedSections = allowedSectionsStr ? allowedSectionsStr.split(',') : [];
    
    // Cek apakah user memiliki akses penuh
    const isFullAccess = dmsScope === 'All' || currentUser?.role === 'Super Admin';
    
    // Menentukan seksi (departemen) yang sedang aktif dilihat
    const section = searchParams.get('section') || (isFullAccess ? 'Sistem Informasi' : (userDept || 'Sistem Informasi'));

    // --- STATE MANAGEMENT ---
    const [data, setData] = useState({ folders: [], files: [], breadcrumbs: [], totalStorage: '0 KB' }); // Data utama DMS
    const [loading, setLoading] = useState(true); // Status loading data
    const [viewMode, setViewMode] = useState('grid'); // Mode tampilan: grid atau list
    const [searchTerm, setSearchTerm] = useState(''); // Kata kunci pencarian file/folder

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

    const [showSectionDropdown, setShowSectionDropdown] = useState(false); // Dropdown pilih departemen/seksi
    const [showNewMenu, setShowNewMenu] = useState(false); // Menu tambah folder/upload
    const [showFolderModal, setShowFolderModal] = useState(false); // Modal input folder baru
    const [previewFile, setPreviewFile] = useState(null); // File yang sedang di-preview
    const [spreadsheetData, setSpreadsheetData] = useState(null); // Data excel hasil parse
    const [docxContent, setDocxContent] = useState(''); // Konten word hasil parse
    const [previewLoading, setPreviewLoading] = useState(false); // Loading saat parse file preview
    const [newFolderName, setNewFolderName] = useState(''); // Variabel input folder baru
    const [modalLoading, setModalLoading] = useState(false); // Loading saat simpan data modal
    const [isDragging, setIsDragging] = useState(false); // Status drag-and-drop file
    const [selectedItems, setSelectedItems] = useState({ folderIds: [], fileIds: [] }); // Item yang sedang dipilih (checkbox)
    const [showMoveModal, setShowMoveModal] = useState(false); // Modal pindah folder/file
    const [allFolders, setAllFolders] = useState([]); // Daftar semua folder untuk target pindah
    const [selectedTargetFolder, setSelectedTargetFolder] = useState(null); // Folder tujuan pemindahan
    const [moveLoading, setMoveLoading] = useState(false); // Loading saat memindahkan item
    const [expandedMoveFolders, setExpandedMoveFolders] = useState({}); // Folder tree status ekspansi
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { }
    }); // Konfigurasi notifikasi alert
    const [confirmAction, setConfirmAction] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isLoading: false,
        type: 'danger'
    }); // Konfigurasi modal konfirmasi hapus/pindah
    
    // Konfigurasi modal rename
    const [renameModal, setRenameModal] = useState({
        isOpen: false,
        id: '',
        type: '', // 'folder' atau 'file'
        currentName: '',
        newName: '',
        extension: ''
    });
    const [renameLoading, setRenameLoading] = useState(false);

    const sectionRef = useRef(null);
    const newMenuRef = useRef(null);
    const fileInputRef = useRef(null);

    /**
     * Menentukan gaya visual dan icon berdasarkan ekstensi file.
     */
    const getFileStyle = (extension) => {
        const ext = (extension || '').toLowerCase();
        switch (ext) {
            case 'pdf':
                return { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', icon: <FileText /> }; // Merah
            case 'xlsx':
            case 'xls':
            case 'csv':
                return { color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)', icon: <FileSpreadsheet /> }; // Hijau
            case 'docx':
            case 'doc':
                return { color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: <FileText /> }; // Biru
            case 'pptx':
            case 'ppt':
                return { color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)', icon: <FileText /> }; // Oranye
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
                return { color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.1)', icon: <FileArchive /> }; // Ungu
            case 'mp4':
            case 'mov':
            case 'avi':
                return { color: '#facc15', bgColor: 'rgba(250, 204, 21, 0.1)', icon: <FileVideo /> }; // Kuning
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
                return { color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.1)', icon: <File /> }; // Abu-abu
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const url = folderId ? `/api/godms/edoc/${folderId}` : `/api/godms/edoc?section=${section}`;
            const response = await axios.get(url);
            setData({
                folders: response.data.folders || [],
                files: response.data.files || [],
                breadcrumbs: response.data.breadcrumbs || [],
                totalStorage: response.data.totalStorage || '0 KB'
            });
        } catch (error) {
            console.error('Error fetching DMS data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setSelectedItems({ folderIds: [], fileIds: [] });
    }, [folderId, section]);

    /**
     * Parsing file Excel ke dalam format JSON untuk ditampilkan di modal preview.
     */
    const loadSpreadsheet = async (file) => {
        setPreviewLoading(true);
        try {
            const filePath = file.file_path || file.FilePath;
            const response = await axios.get(filePath, { responseType: 'arraybuffer' });
            const data = new Uint8Array(response.data);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            setSpreadsheetData(jsonData);
        } catch (error) {
            console.error('Error loading spreadsheet:', error);
            setSpreadsheetData([]);
        } finally {
            setPreviewLoading(false);
        }
    };

    /**
     * Parsing file Word (.docx) ke HTML untuk modal preview.
     */
    const loadDocx = async (file) => {
        setPreviewLoading(true);
        try {
            const filePath = file.file_path || file.FilePath;
            const response = await axios.get(filePath, { responseType: 'arraybuffer' });
            const result = await mammoth.convertToHtml({ arrayBuffer: response.data });
            setDocxContent(result.value);
        } catch (error) {
            console.error('Error loading docx:', error);
            setDocxContent('<p style="color:red; text-align:center; padding: 2rem;">Gagal memuat pratinjau dokumen.</p>');
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        if (previewFile) {
            const ext = (previewFile.extension || previewFile.Extension || '').toLowerCase();
            if (['xlsx', 'xls', 'csv'].includes(ext)) {
                loadSpreadsheet(previewFile);
            } else if (['docx', 'doc'].includes(ext)) {
                loadDocx(previewFile);
            }
        } else {
            setSpreadsheetData(null);
            setDocxContent('');
        }
    }, [previewFile]);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sectionRef.current && !sectionRef.current.contains(event.target)) {
                setShowSectionDropdown(false);
            }
            if (newMenuRef.current && !newMenuRef.current.contains(event.target)) {
                setShowNewMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        setModalLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('name', newFolderName);
            params.append('section', section);
            if (folderId) params.append('parent_id', folderId);

            await axios.post('/api/godms/folder/store', params);
            setNewFolderName('');
            setShowFolderModal(false);
            fetchData();

            setAlertConfig({
                isOpen: true,
                title: 'Berhasil',
                message: 'Folder baru berhasil dibuat.',
                type: 'success',
                onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
            });
        } catch (error) {
            console.error('Error creating folder:', error);
            setAlertConfig({
                isOpen: true,
                title: 'Gagal',
                message: error.response?.data?.error || 'Gagal membuat folder. Silakan coba lagi.',
                type: 'danger',
                onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setModalLoading(false);
        }
    };

    const handleRenameSubmit = async (e) => {
        e.preventDefault();
        if (!renameModal.newName.trim() || renameModal.newName === renameModal.currentName) return;
        setRenameLoading(true);

        try {
            const params = new URLSearchParams();
            params.append('id', renameModal.id);
            
            let finalName = renameModal.newName;
            if (renameModal.type === 'file' && renameModal.extension) {
                // Check if user manually typed extension, if not, append it
                const extStr = '.' + renameModal.extension;
                if (!finalName.toLowerCase().endsWith(extStr.toLowerCase())) {
                    finalName += extStr;
                }
            }
            params.append('name', finalName);

            const url = renameModal.type === 'folder' 
                ? '/api/godms/folder/rename' 
                : '/api/godms/file/rename';
                
            await axios.post(url, params);
            
            setRenameModal({ isOpen: false, id: '', type: '', currentName: '', newName: '', extension: '' });
            fetchData();
            
            setAlertConfig({
                isOpen: true,
                title: 'Berhasil',
                message: `Nama ${renameModal.type} berhasil diubah.`,
                type: 'success',
                onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
            });
        } catch (error) {
            console.error('Error renaming item:', error);
            setAlertConfig({
                isOpen: true,
                title: 'Gagal',
                message: 'Gagal mengubah nama item. Silakan coba lagi.',
                type: 'danger',
                onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setRenameLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('section', section);
        if (folderId) formData.append('folder_id', folderId);

        setLoading(true);
        try {
            await axios.post('/api/godms/file/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchData();
            setAlertConfig({
                isOpen: true,
                title: 'Berhasil',
                message: `File "${file.name}" berhasil diunggah.`,
                type: 'success',
                onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            setAlertConfig({
                isOpen: true,
                title: 'Gagal',
                message: 'Gagal mengunggah file. Pastikan ukuran file tidak melebihi batas.',
                type: 'danger',
                onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setLoading(false);
        }
    };

    // Menangani seleksi file/folder secara tunggal
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

    // Mengatur "Pilih Semua" untuk folder dan file di halaman saat ini
    const selectAll = () => {
        const folderIds = filteredFolders.map(f => f.id || f.ID);
        const fileIds = filteredFiles.map(f => f.id || f.ID);
        if (selectedItems.folderIds.length === folderIds.length && selectedItems.fileIds.length === fileIds.length) {
            setSelectedItems({ folderIds: [], fileIds: [] });
        } else {
            setSelectedItems({ folderIds, fileIds });
        }
    };

    const handleBulkTrash = () => {
        if (selectedItems.folderIds.length === 0 && selectedItems.fileIds.length === 0) return;

        setConfirmAction({
            isOpen: true,
            title: 'Hapus Item Terpilih',
            message: `Apakah Anda yakin ingin menghapus ${selectedItems.folderIds.length + selectedItems.fileIds.length} item terpilih?`,
            type: 'danger',
            isLoading: false,
            onConfirm: async () => {
                setConfirmAction(prev => ({ ...prev, isLoading: true }));
                try {
                    const params = new URLSearchParams();
                    selectedItems.folderIds.forEach(id => params.append('folder_ids[]', id));
                    selectedItems.fileIds.forEach(id => params.append('file_ids[]', id));
                    await axios.post('/api/godms/bulk/trash', params);
                    setSelectedItems({ folderIds: [], fileIds: [] });
                    setConfirmAction(prev => ({ ...prev, isOpen: false }));
                    fetchData();
                    setAlertConfig({
                        isOpen: true,
                        title: 'Berhasil',
                        message: 'Item terpilih berhasil dipindahkan ke tempat sampah.',
                        type: 'success',
                        onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
                    });
                } catch (error) {
                    console.error('Error bulk trash:', error);
                    setConfirmAction(prev => ({ ...prev, isLoading: false }));
                    setAlertConfig({
                        isOpen: true,
                        title: 'Gagal',
                        message: 'Gagal menghapus item terpilih.',
                        type: 'danger',
                        onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
                    });
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

    const handleDeleteFile = (id, name) => {
        setConfirmAction({
            isOpen: true,
            title: 'Hapus File',
            message: `Apakah Anda yakin ingin menghapus file "${name}"?`,
            type: 'danger',
            isLoading: false,
            onConfirm: async () => {
                setConfirmAction(prev => ({ ...prev, isLoading: true }));
                try {
                    const params = new URLSearchParams();
                    params.append('id', id);
                    await axios.post('/api/godms/file/trash', params);
                    setConfirmAction(prev => ({ ...prev, isOpen: false }));
                    fetchData();
                } catch (error) {
                    console.error('Error deleting file:', error);
                    setConfirmAction(prev => ({ ...prev, isLoading: false }));
                    setAlertConfig({
                        isOpen: true,
                        title: 'Gagal',
                        message: 'Gagal menghapus file.',
                        type: 'danger',
                        onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
                    });
                }
            }
        });
    };

    const handleDeleteFolder = (id, name) => {
        setConfirmAction({
            isOpen: true,
            title: 'Hapus Folder',
            message: `Apakah Anda yakin ingin menghapus folder "${name}" dan seluruh isinya?`,
            type: 'danger',
            isLoading: false,
            onConfirm: async () => {
                setConfirmAction(prev => ({ ...prev, isLoading: true }));
                try {
                    const params = new URLSearchParams();
                    params.append('id', id);
                    await axios.post('/api/godms/folder/trash', params);
                    setConfirmAction(prev => ({ ...prev, isOpen: false }));
                    fetchData();
                } catch (error) {
                    console.error('Error deleting folder:', error);
                    setConfirmAction(prev => ({ ...prev, isLoading: false }));
                    setAlertConfig({
                        isOpen: true,
                        title: 'Gagal',
                        message: 'Gagal menghapus folder.',
                        type: 'danger',
                        onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
                    });
                }
            }
        });
    };

    const handleDownload = (id) => {
        window.open(`/api/godms/file/download/${id}`, '_blank');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadMultipleFiles(files);
        }
    };

    const uploadMultipleFiles = async (files) => {
        setLoading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('file', files[i]);
                formData.append('section', section);
                if (folderId) formData.append('folder_id', folderId);
                await axios.post('/api/godms/file/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            fetchData();
        } catch (error) {
            console.error('Error uploading drop files:', error);
            setAlertConfig({
                isOpen: true,
                title: 'Gagal',
                message: 'Beberapa file gagal diunggah.',
                type: 'danger',
                onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setLoading(false);
        }
    };

    // Filter tampilan berdasarkan pencarian nama
    const filteredFolders = data.folders.filter(f => (f.name || f.Name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredFiles = data.files.filter(f => (f.name || f.Name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    /**
     * Memformat ukuran file dari bytes ke format yang mudah dibaca (KB, MB, GB).
     */
    const formatSize = (bytes) => {
        if (bytes === 0 || bytes === '0') return '0 Bytes';
        const num = Number(bytes);
        if (isNaN(num)) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(num) / Math.log(k));
        return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDateWithTime = (dateString) => {
        if (!dateString || dateString === '-' || dateString === '0001-01-01T00:00:00Z') return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { hour12: false });
    };

    return (
        <div
            className={`page-content ${isDragging ? 'dragging-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ position: 'relative' }}
        >
            {isDragging && (
                <div style={{
                    position: 'fixed',
                    inset: '1.5rem',
                    borderRadius: '24px',
                    border: '3px dashed var(--primary)',
                    background: 'rgba(30, 89, 197, 0.05)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '50%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', marginBottom: '1rem', display: 'inline-flex' }}>
                            <Upload size={48} color="var(--primary)" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>Drop files to upload</h2>
                        <p style={{ fontWeight: 600, color: '#64748b' }}>Upload to {section}</p>
                    </div>
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>Digital Management System</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-light)' }}>
                        <HardDrive size={16} />
                        <span>Storage Used: {data.totalStorage}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div className="custom-select-container" ref={sectionRef}>
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setShowSectionDropdown(!showSectionDropdown); }}
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
                                {allSections.find(s => s.label === section)?.icon || <HardDrive size={16} />}
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
                                            navigate(`/godms/edoc?section=${s.label}`);
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

                    <div style={{ position: 'relative' }} ref={newMenuRef}>
                        <button
                            onClick={() => setShowNewMenu(!showNewMenu)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.625rem 1.5rem',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50px',
                                fontWeight: 700,
                                boxShadow: '0 4px 12px rgba(30, 89, 197, 0.2)'
                            }}
                        >
                            <Plus size={20} />
                            New
                        </button>

                        {showNewMenu && (
                            <div className="custom-select-dropdown" style={{ right: 0, minWidth: '180px', borderRadius: '14px', padding: '0.5rem' }}>
                                <button
                                    className="custom-select-item"
                                    onClick={() => {
                                        setShowFolderModal(true);
                                        setShowNewMenu(false);
                                    }}
                                >
                                    <FolderPlus size={18} /> New Folder
                                </button>
                                <button
                                    className="custom-select-item"
                                    onClick={() => {
                                        fileInputRef.current.click();
                                        setShowNewMenu(false);
                                    }}
                                >
                                    <Upload size={18} /> Upload File
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                />
            </div>

            {/* Navigasi Breadcrumbs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
                <Link to={`/godms/edoc?section=${section}`} style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                    <Home size={18} />
                </Link>
                <ChevronRight size={16} color="var(--border)" />
                {data.breadcrumbs.map((crumb, idx) => {
                    const crumbId = crumb.id || crumb.ID;
                    const crumbName = crumb.name || crumb.Name;
                    return (
                        <React.Fragment key={crumbId}>
                            <Link to={`/godms/edoc/${crumbId}`} style={{
                                color: idx === data.breadcrumbs.length - 1 ? 'var(--text-main)' : 'var(--primary)',
                                fontWeight: idx === data.breadcrumbs.length - 1 ? 700 : 500,
                                whiteSpace: 'nowrap'
                            }}>
                                {crumbName}
                            </Link>
                            {idx < data.breadcrumbs.length - 1 && <ChevronRight size={16} color="var(--border)" />}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Search and View Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div className="search-container">
                    <Search size={18} color="var(--primary)" style={{ marginRight: '0.75rem' }} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Cari folder atau file..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        onClick={selectAll}
                        style={{
                            padding: '0.625rem 1.25rem',
                            background: selectedItems.folderIds.length > 0 || selectedItems.fileIds.length > 0 ? 'var(--primary)' : 'white',
                            color: selectedItems.folderIds.length > 0 || selectedItems.fileIds.length > 0 ? 'white' : 'var(--primary)',
                            border: '1px solid var(--primary)',
                            borderRadius: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        {selectedItems.folderIds.length + selectedItems.fileIds.length > 0 ? `Selected (${selectedItems.folderIds.length + selectedItems.fileIds.length})` : 'Select All'}
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
                    {/* Folders Section */}
                    {filteredFolders.length > 0 && (
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Folders</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                {filteredFolders.map(folder => {
                                    const folderId = folder.id || folder.ID;
                                    const folderName = folder.name || folder.Name || 'Unnamed Folder';
                                    const isSelected = selectedItems.folderIds.includes(folderId);

                                    return (
                                        <div
                                            key={folderId}
                                            onClick={() => navigate(`/godms/edoc/${folderId}?section=${section}`)}
                                            className={`chart-container ${isSelected ? 'item-selected' : ''}`}
                                            style={{
                                                padding: '1.25rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelection(folderId, 'folder');
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '0.75rem',
                                                    right: '0.75rem',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '6px',
                                                    border: '2px solid',
                                                    borderColor: isSelected ? 'var(--primary)' : '#cbd5e1',
                                                    background: isSelected ? 'var(--primary)' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    zIndex: 10
                                                }}
                                            >
                                                {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                                            </div>
                                            <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '14px', display: 'flex' }}>
                                                <Folder size={28} color="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                                            </div>
                                            <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                                                <div 
                                                    style={{ 
                                                        fontWeight: 700, 
                                                        color: '#1e293b',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        lineHeight: '1.2',
                                                        fontSize: '0.875rem'
                                                    }} 
                                                    title={folderName}
                                                >
                                                    {folderName}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Folder</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.25rem', opacity: 0, transition: 'opacity 0.2s' }} className="folder-delete-btn">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setRenameModal({
                                                            isOpen: true,
                                                            id: folderId,
                                                            type: 'folder',
                                                            currentName: folderName,
                                                            newName: folderName
                                                        });
                                                    }}
                                                    style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteFolder(folderId, folderName);
                                                    }}
                                                    style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: 'none', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Files Section */}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Files</h3>
                        {viewMode === 'grid' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {filteredFiles.map(file => {
                                    const fileId = file.id || file.ID;
                                    const fileName = file.name || file.Name || 'Unnamed File';
                                    const fileExt = file.extension || file.Extension || '';
                                    const filePath = file.file_path || file.FilePath;
                                    const fileSize = file.size || file.Size || 0;
                                    const fileUpdated = file.updated_at || file.UpdatedAt || file.created_at || file.CreatedAt;
                                    const isSelected = selectedItems.fileIds.includes(fileId);
                                    
                                    return (
                                        <div
                                            key={fileId}
                                            className={`chart-container ${isSelected ? 'item-selected' : ''}`}
                                            style={{
                                                padding: '1rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.75rem',
                                                position: 'relative',
                                                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)'
                                            }}
                                        >
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelection(fileId, 'file');
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '0.75rem',
                                                    right: '0.75rem',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '6px',
                                                    border: '2px solid',
                                                    borderColor: isSelected ? 'var(--primary)' : '#cbd5e1',
                                                    background: isSelected ? 'var(--primary)' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    zIndex: 10,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                                            </div>
                                            <div
                                                onClick={() => setPreviewFile(file)}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    height: '140px',
                                                    background: getFileStyle(fileExt).bgColor,
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    overflow: 'hidden',
                                                    position: 'relative'
                                                }}
                                            >
                                                {(() => {
                                                    const fileStyle = getFileStyle(fileExt);
                                                    const isImage = ['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif'].includes(fileExt.toLowerCase());
                                                    if (isImage) {
                                                        return <img src={filePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                                                    }
                                                    return (
                                                        <div style={{ textAlign: 'center' }}>
                                                            {React.cloneElement(fileStyle.icon, { size: 48, color: fileStyle.color })}
                                                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: fileStyle.color, textTransform: 'uppercase' }}>{fileExt}</div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div style={{ flexGrow: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div 
                                                        style={{ 
                                                            fontWeight: 700, 
                                                            color: '#1e293b', 
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            lineHeight: '1.2',
                                                            fontSize: '0.875rem',
                                                            marginBottom: '0.25rem', 
                                                            flex: 1 
                                                        }} 
                                                        title={fileName}
                                                    >
                                                        {fileName}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                let nameWithoutExt = fileName;
                                                                if (fileExt && fileName.toLowerCase().endsWith(`.${fileExt.toLowerCase()}`)) {
                                                                    nameWithoutExt = fileName.slice(0, -(fileExt.length + 1));
                                                                }
                                                                setRenameModal({
                                                                    isOpen: true,
                                                                    id: fileId,
                                                                    type: 'file',
                                                                    currentName: nameWithoutExt,
                                                                    newName: nameWithoutExt,
                                                                    extension: fileExt
                                                                });
                                                            }}
                                                            style={{ padding: '0.25rem', borderRadius: '6px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
                                                            onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
                                                            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteFile(fileId, fileName);
                                                            }}
                                                            style={{ padding: '0.25rem', borderRadius: '6px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
                                                            onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                                                            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{formatSize(fileSize)}</span>
                                                    <span>{formatDateWithTime(fileUpdated)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredFiles.length === 0 && filteredFolders.length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', color: 'var(--text-light)' }}>
                                        <File size={64} color="var(--border)" style={{ margin: '0 auto 1.5rem' }} />
                                        <p>Tidak ada file atau folder di sini.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem 1.5rem', width: '40px' }}>
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
                                            <th style={{ padding: '1rem 1.5rem' }}>Name</th>
                                            <th style={{ padding: '1rem 1.5rem' }}>Size</th>
                                            <th style={{ padding: '1rem 1.5rem' }}>Modified</th>
                                            <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredFolders.map(folder => {
                                            const folderId = folder.id || folder.ID;
                                            const folderName = folder.name || folder.Name || 'Unnamed Folder';
                                            const folderUpdated = folder.updated_at || folder.UpdatedAt || folder.created_at || folder.CreatedAt;
                                            return (
                                                <tr key={folderId} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div
                                                            onClick={() => toggleSelection(folderId, 'folder')}
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '6px',
                                                                border: '2px solid',
                                                                borderColor: selectedItems.folderIds.includes(folderId) ? 'var(--primary)' : '#cbd5e1',
                                                                background: selectedItems.folderIds.includes(folderId) ? 'var(--primary)' : 'white',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {selectedItems.folderIds.includes(folderId) && <Check size={14} color="white" strokeWidth={3} />}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div onClick={() => navigate(`/godms/edoc/${folderId}?section=${section}`)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                                                            <Folder size={20} color="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                                                            <span style={{ fontWeight: 600 }}>{folderName}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-light)' }}>-</td>
                                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-light)' }}>{formatDateWithTime(folderUpdated)}</td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                            <button onClick={() => setRenameModal({isOpen: true, id: folderId, type: 'folder', currentName: folderName, newName: folderName})} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}>
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button onClick={() => navigate(`/godms/edoc/${folderId}?section=${section}`)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(30, 89, 197, 0.05)', color: 'var(--primary)', border: 'none', cursor: 'pointer' }}>
                                                                <ChevronRight size={18} />
                                                            </button>
                                                            <button onClick={() => handleDeleteFolder(folderId, folderName)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredFiles.map(file => {
                                            const fileId = file.id || file.ID;
                                            const fileName = file.name || file.Name || 'Unnamed File';
                                            const fileExt = file.extension || file.Extension || '';
                                            const fileSize = file.size || file.Size || 0;
                                            const fileUpdated = file.updated_at || file.UpdatedAt || file.created_at || file.CreatedAt;
                                            
                                            return (
                                                <tr key={fileId} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div
                                                            onClick={() => toggleSelection(fileId, 'file')}
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '6px',
                                                                border: '2px solid',
                                                                borderColor: selectedItems.fileIds.includes(fileId) ? 'var(--primary)' : '#cbd5e1',
                                                                background: selectedItems.fileIds.includes(fileId) ? 'var(--primary)' : 'white',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {selectedItems.fileIds.includes(fileId) && <Check size={14} color="white" strokeWidth={3} />}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div onClick={() => setPreviewFile(file)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                                                            {React.cloneElement(getFileStyle(fileExt).icon, { size: 20, color: getFileStyle(fileExt).color })}
                                                            <span style={{ fontWeight: 500 }}>{fileName}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-light)' }}>{formatSize(fileSize)}</td>
                                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-light)' }}>{formatDateWithTime(fileUpdated)}</td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                            <button 
                                                                onClick={() => {
                                                                    let nameWithoutExt = fileName;
                                                                    if (fileExt && fileName.toLowerCase().endsWith(`.${fileExt.toLowerCase()}`)) {
                                                                        nameWithoutExt = fileName.slice(0, -(fileExt.length + 1));
                                                                    }
                                                                    setRenameModal({isOpen: true, id: fileId, type: 'file', currentName: nameWithoutExt, newName: nameWithoutExt, extension: fileExt});
                                                                }} 
                                                                style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button onClick={() => setPreviewFile(file)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(30, 89, 197, 0.05)', color: 'var(--primary)', border: 'none', cursor: 'pointer' }}>
                                                                <Eye size={18} />
                                                            </button>
                                                            <button onClick={() => handleDownload(fileId)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(30, 89, 197, 0.05)', color: 'var(--primary)', border: 'none', cursor: 'pointer' }}>
                                                                <Download size={18} />
                                                            </button>
                                                            <button onClick={() => handleDeleteFile(fileId, fileName)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
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
                    zIndex: 100,
                    animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '1.5rem' }}>
                        {selectedItems.folderIds.length + selectedItems.fileIds.length} Selected
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={handleOpenMoveModal}
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '30px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        >
                            <ChevronRight size={18} /> Move
                        </button>
                        <button
                            onClick={handleBulkTrash}
                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '30px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
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

            {/* Folder Modal */}
            {showFolderModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create New Folder</h2>
                            <button onClick={() => setShowFolderModal(false)} style={{ color: '#94a3b8' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleCreateFolder}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Folder Name</label>
                                <input
                                    type="text"
                                    className="search-input"
                                    style={{ border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '12px' }}
                                    placeholder="Enter folder name..."
                                    autoFocus
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowFolderModal(false)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 700, color: '#64748b' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalLoading || !newFolderName}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    {modalLoading ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> Create</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {renameModal.isOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Rename {renameModal.type === 'folder' ? 'Folder' : 'File'}</h2>
                            <button onClick={() => setRenameModal(prev => ({ ...prev, isOpen: false }))} style={{ color: '#94a3b8', border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleRenameSubmit}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">New Name</label>
                                <input
                                    type="text"
                                    className="search-input"
                                    style={{ border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '12px', width: '100%', boxSizing: 'border-box' }}
                                    placeholder="Enter new name..."
                                    autoFocus
                                    value={renameModal.newName}
                                    onChange={(e) => setRenameModal(prev => ({ ...prev, newName: e.target.value }))}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setRenameModal(prev => ({ ...prev, isOpen: false }))}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 700, color: '#64748b', background: 'white', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={renameLoading || !renameModal.newName.trim() || renameModal.newName === renameModal.currentName}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer' }}
                                >
                                    {renameLoading ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> Rename</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Move Modal */}
            {showMoveModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Move to Folder</h2>
                            <button onClick={() => setShowMoveModal(false)} style={{ color: '#94a3b8' }}><X size={24} /></button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
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
                                    marginBottom: '0.5rem'
                                }}
                            >
                                <Home size={20} color={selectedTargetFolder === '' ? 'var(--primary)' : '#64748b'} />
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
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 700, color: '#64748b' }}
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

            {/* Preview Modal */}
            {previewFile && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', zIndex: 1100 }}>
                    <div style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                        <div>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>{previewFile.name || previewFile.Name}</h2>
                            <p style={{ fontSize: '0.8125rem', opacity: 0.7, margin: 0 }}>{formatSize(previewFile.size || previewFile.Size)} • Modified {formatDateWithTime(previewFile.updated_at || previewFile.UpdatedAt)}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => handleDownload(previewFile.id || previewFile.ID)}
                                style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                            >
                                <Download size={18} /> Download
                            </button>
                            <button onClick={() => setPreviewFile(null)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', overflow: 'hidden' }}>
                        {previewLoading ? (
                            <div style={{ textAlign: 'center', color: 'white' }}>
                                <Loader2 className="animate-spin" size={48} style={{ marginBottom: '1rem' }} />
                                <p>Loading preview...</p>
                            </div>
                        ) : ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes((previewFile.extension || previewFile.Extension || '').toLowerCase()) ? (
                            <img src={previewFile.file_path || previewFile.FilePath} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
                        ) : (previewFile.extension || previewFile.Extension || '').toLowerCase() === 'pdf' ? (
                            <iframe src={previewFile.file_path || previewFile.FilePath} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', background: 'white' }}></iframe>
                        ) : ['xlsx', 'xls', 'csv'].includes((previewFile.extension || previewFile.Extension || '').toLowerCase()) ? (
                            <div style={{ width: '100%', height: '100%', background: 'white', borderRadius: '12px', overflow: 'auto', padding: '1rem' }}>
                                {spreadsheetData && spreadsheetData.length > 0 ? (
                                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8125rem', color: '#313131' }}>
                                        <tbody>
                                            {spreadsheetData.map((row, rowIndex) => (
                                                <tr key={rowIndex} style={{ borderBottom: '1px solid #e2e8f0', background: rowIndex === 0 ? '#f8fafc' : 'transparent' }}>
                                                    {Array.isArray(row) && row.map((cell, cellIndex) => (
                                                        <td key={cellIndex} style={{ padding: '0.75rem', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap', fontWeight: rowIndex === 0 ? 700 : 400 }}>
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                                        <FileSpreadsheet size={48} opacity={0.5} style={{ marginBottom: '1rem' }} />
                                        <p>No data found in this file</p>
                                    </div>
                                )}
                            </div>
                        ) : ['docx', 'doc'].includes((previewFile.extension || previewFile.Extension || '').toLowerCase()) ? (
                            <div 
                                style={{ width: '100%', height: '100%', background: 'white', borderRadius: '12px', overflow: 'auto', padding: '3rem', color: '#334155', fontSize: '1rem', lineHeight: '1.6' }}
                                dangerouslySetInnerHTML={{ __html: docxContent }}
                                className="docx-preview-container"
                            />
                        ) : (previewFile.extension || previewFile.Extension || '').toLowerCase() === 'pptx' ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <iframe 
                                    src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(window.location.protocol + '//' + window.location.host + (previewFile.file_path || previewFile.FilePath))}`} 
                                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', background: 'white' }}
                                    title="Office Preview"
                                ></iframe>
                                <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.75rem', color: 'white', backdropFilter: 'blur(4px)' }}>
                                    Offline Preview? {window.location.hostname === 'localhost' ? 'Switch to production URL for PPTX preview.' : 'Loading from Microsoft Office Online...'}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: 'white' }}>
                                <div style={{ background: getFileStyle(previewFile.extension || previewFile.Extension).bgColor, padding: '3rem', borderRadius: '32px', marginBottom: '1.5rem', display: 'inline-block' }}>
                                    {React.cloneElement(getFileStyle(previewFile.extension || previewFile.Extension).icon, { size: 80, color: getFileStyle(previewFile.extension || previewFile.Extension).color })}
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Preview not available</h2>
                                <p style={{ opacity: 0.7, maxWidth: '300px', margin: '1rem auto' }}>This file type cannot be previewed in the browser. Please download the file to view its content.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={alertConfig.isOpen}
                onClose={alertConfig.onConfirm}
                onConfirm={alertConfig.onConfirm}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                confirmText="OK"
                cancelText=""
            />

            <ConfirmModal
                isOpen={confirmAction.isOpen}
                onClose={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmAction.onConfirm}
                loading={confirmAction.isLoading}
                title={confirmAction.title}
                message={confirmAction.message}
                type={confirmAction.type}
            />
        </div>
    );
};

export default GoDMS;
