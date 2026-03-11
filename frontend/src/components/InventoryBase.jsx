import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Database,
    Search,
    Plus,
    Trash2,
    Edit,
    Loader2,
    Tag,
    Filter,
    Monitor,
    Laptop as LaptopIcon,
    Shield,
    Clock,
    ChevronRight,
    X,
    Check,
    Package,
    Hash,
    Info,
    MapPin,
    ChevronDown,
    Archive,
    Download,
    Upload
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import SearchableSelect from './SearchableSelect';

const InventoryBase = ({ title, description, status }) => {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);
    const [stats, setStats] = useState({ total: 0, laptop: 0, computer: 0, others: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [importLoading, setImportLoading] = useState(false);
    const [filterYear, setFilterYear] = useState('2026');
    const [filterCategory, setFilterCategory] = useState('Semua Kategori');
    const [showYearDropdown, setShowYearDropdown] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const categoryDropdownRef = useRef(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [categories, setCategories] = useState([]);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        id: null,
        isLoading: false
    });
    const [newAsset, setNewAsset] = useState({
        inventory_number: '',
        asset_name: '',
        category: '',
        brand: '',
        type_model: '',
        serial_number: '',
        device_name: '',
        specification: '',
        color: '',
        location: '',
        purchase_date: '',
        status: status || 'Ready'
    });

    const [bulkAsset, setBulkAsset] = useState({
        inventory_number_start: '',
        device_name_start: '',
        quantity: 1,
        asset_name: '',
        category: '',
        brand: '',
        type_model: '',
        specification: '',
        color: '',
        location: '',
        purchase_date: new Date().toISOString().split('T')[0],
        status: status || 'Ready'
    });

    // Computer Specific Specs
    const [ramTypes, setRamTypes] = useState([]);
    const [storageTypes, setStorageTypes] = useState([]);
    const [compSpecs, setCompSpecs] = useState({
        os: '',
        processor: '',
        ramSize: '',
        ramUnit: 'GB',
        ramType: '',
        storageSize: '',
        storageUnit: 'GB',
        storageType: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const catParam = filterCategory === 'Semua Kategori' ? '' : `&category=${filterCategory}`;
            const statusParam = status ? `&status=${status}` : '';
            const response = await axios.get(`/api/assets-kso?year=${filterYear}${catParam}${statusParam}`);
            const fetchedAssets = response.data.assets || [];
            setAssets(fetchedAssets);

            // Calculate stats
            const total = fetchedAssets.length;
            const laptop = fetchedAssets.filter(a => a.Category?.toLowerCase() === 'laptop').length;
            const computer = fetchedAssets.filter(a => a.Category?.toLowerCase() === 'komputer').length;
            setStats({
                total,
                laptop,
                computer,
                others: total - laptop - computer
            });
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/master-data/asset-category');
            setCategories(response.data.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchSpecs = async () => {
        try {
            const response = await axios.get('/api/master-data/asset-specs');
            setRamTypes(response.data.ramTypes || []);
            setStorageTypes(response.data.storageTypes || []);
        } catch (error) {
            console.error('Error fetching specs:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchCategories();
        fetchSpecs();
    }, [filterYear, filterCategory, status]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowYearDropdown(false);
            }
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
                setShowCategoryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            id,
            isLoading: false
        });
    };

    const handleExport = () => {
        window.open('/api/assets-kso/export', '_blank');
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/api/assets-kso/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(response.data.message);
            fetchData();
        } catch (error) {
            console.error('Import error:', error);
            alert('Gagal mengimpor data: ' + (error.response?.data?.error || error.message));
        } finally {
            setImportLoading(false);
            e.target.value = '';
        }
    };

    const handleConfirmDelete = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
            await axios.delete(`/api/assets-kso/delete/${confirmModal.id}`);
            setConfirmModal({ isOpen: false, id: null, isLoading: false });
            fetchData();
        } catch (error) {
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
            console.error('Error deleting asset:', error);
            alert('Gagal menghapus aset.');
        }
    };

    const handleEdit = (asset) => {
        setIsEdit(true);
        setEditId(asset.ID);

        setNewAsset({
            inventory_number: asset.InventoryNumber || '',
            asset_name: asset.AssetName || '',
            category: asset.Category || '',
            brand: asset.Brand || '',
            type_model: asset.TypeModel || '',
            serial_number: asset.SerialNumber || '',
            device_name: asset.DeviceName || '',
            specification: asset.Specification || '',
            color: asset.Color || '',
            location: asset.Location || '',
            purchase_date: asset.PurchaseDate ? asset.PurchaseDate.split('T')[0] : '',
            status: asset.Status || 'Ready'
        });

        // Reset comp specs
        setCompSpecs({
            os: '',
            processor: '',
            ramSize: '',
            ramUnit: 'GB',
            ramType: '',
            storageSize: '',
            storageUnit: 'GB',
            storageType: ''
        });

        if (asset.Category === 'Laptop' || asset.Category === 'Komputer') {
            const spec = asset.Specification || '';
            const parts = spec.split(',').map(s => s.trim());

            if (parts.length >= 1) setCompSpecs(prev => ({ ...prev, processor: parts[0] }));
            if (parts.length >= 4) setCompSpecs(prev => ({ ...prev, os: parts[3] }));

            if (parts.length >= 2) {
                const ramPart = parts[1].replace(/^RAM\s+/i, '');
                const ramMatch = ramPart.match(/^(\d+)\s+(GB|TB)\s+(.*)$/i);
                if (ramMatch) {
                    setCompSpecs(prev => ({
                        ...prev,
                        ramSize: ramMatch[1],
                        ramUnit: ramMatch[2].toUpperCase(),
                        ramType: ramMatch[3]
                    }));
                }
            }

            if (parts.length >= 3) {
                const storageMatch = parts[2].match(/^(\d+)\s+(GB|TB)\s+(.*)$/i);
                if (storageMatch) {
                    setCompSpecs(prev => ({
                        ...prev,
                        storageSize: storageMatch[1],
                        storageUnit: storageMatch[2].toUpperCase(),
                        storageType: storageMatch[3]
                    }));
                }
            }
        }

        setShowModal(true);
    };

    const openAddModal = () => {
        setIsEdit(false);
        setEditId(null);
        setNewAsset({
            inventory_number: '',
            asset_name: '',
            category: '',
            brand: '',
            type_model: '',
            serial_number: '',
            device_name: '',
            specification: '',
            color: '',
            location: '',
            purchase_date: new Date().toISOString().split('T')[0],
            status: status || 'Ready'
        });
        setCompSpecs({
            os: '',
            processor: '',
            ramSize: '',
            ramUnit: 'GB',
            ramType: '',
            storageSize: '',
            storageUnit: 'GB',
            storageType: ''
        });
        setShowModal(true);
    };

    const handleStore = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            let finalSpecification = newAsset.specification;
            if (newAsset.category === 'Laptop' || newAsset.category === 'Komputer') {
                const ram = `${compSpecs.ramSize} ${compSpecs.ramUnit} ${compSpecs.ramType}`;
                const storage = `${compSpecs.storageSize} ${compSpecs.storageUnit} ${compSpecs.storageType}`;
                finalSpecification = `${compSpecs.processor}, RAM ${ram}, ${storage}, ${compSpecs.os}`;
            }

            const params = new URLSearchParams();
            Object.keys(newAsset).forEach(key => {
                if (key === 'specification') {
                    params.append(key, finalSpecification);
                } else {
                    params.append(key, newAsset[key]);
                }
            });

            // Add computer specific parts for backend if needed
            if (newAsset.category === 'Laptop' || newAsset.category === 'Komputer') {
                params.set('spec_os', compSpecs.os);
                params.set('spec_processor', compSpecs.processor);
                params.set('spec_ram_size', compSpecs.ramSize);
                params.set('spec_ram_unit', compSpecs.ramUnit);
                params.set('spec_ram_type', compSpecs.ramType);
                params.set('spec_storage_size', compSpecs.storageSize);
                params.set('spec_storage_unit', compSpecs.storageUnit);
                params.set('spec_storage_type', compSpecs.storageType);
            }

            if (isEdit) {
                await axios.post(`/api/assets-kso/update/${editId}`, params);
            } else {
                await axios.post('/api/assets-kso/store', params);
            }

            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error storing asset:', error);
            alert('Gagal menyimpan aset.');
        } finally {
            setModalLoading(false);
        }
    };

    const handleBulkStore = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            let finalSpecification = bulkAsset.specification;
            if (bulkAsset.category === 'Laptop' || bulkAsset.category === 'Komputer') {
                const ram = `${compSpecs.ramSize} ${compSpecs.ramUnit} ${compSpecs.ramType}`;
                const storage = `${compSpecs.storageSize} ${compSpecs.storageUnit} ${compSpecs.storageType}`;
                finalSpecification = `${compSpecs.processor}, RAM ${ram}, ${storage}, ${compSpecs.os}`;
            }

            const params = new URLSearchParams();
            Object.keys(bulkAsset).forEach(key => {
                if (key === 'specification') {
                    params.append(key, finalSpecification);
                } else {
                    params.append(key, bulkAsset[key]);
                }
            });

            if (bulkAsset.category === 'Laptop' || bulkAsset.category === 'Komputer') {
                params.set('spec_os', compSpecs.os);
                params.set('spec_processor', compSpecs.processor);
                params.set('spec_ram_size', compSpecs.ramSize);
                params.set('spec_ram_unit', compSpecs.ramUnit);
                params.set('spec_ram_type', compSpecs.ramType);
                params.set('spec_storage_size', compSpecs.storageSize);
                params.set('spec_storage_unit', compSpecs.storageUnit);
                params.set('spec_storage_type', compSpecs.storageType);
            }

            await axios.post('/api/assets-kso/bulk-store', params);
            setShowBulkModal(false);
            fetchData();
        } catch (error) {
            console.error('Error storing bulk assets:', error);
            alert('Gagal menyimpan aset bulk.');
        } finally {
            setModalLoading(false);
        }
    };

    const filteredAssets = assets.filter(asset => {
        const query = searchTerm.toLowerCase();
        return (
            (asset.AssetName?.toLowerCase().includes(query)) ||
            (asset.InventoryNumber?.toLowerCase().includes(query)) ||
            (asset.Brand?.toLowerCase().includes(query)) ||
            (asset.TypeModel?.toLowerCase().includes(query)) ||
            (asset.Location?.toLowerCase().includes(query)) ||
            (asset.SerialNumber?.toLowerCase().includes(query))
        );
    });

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em' }}>{title}</h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '0.25rem' }}>{description}</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="search-container">
                        <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Cari No. Inventaris, Nama Aset..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="custom-select-container" ref={dropdownRef}>
                        <button type="button" onClick={() => setShowYearDropdown(!showYearDropdown)} className="custom-select-trigger">
                            <Filter size={16} color={showYearDropdown ? 'var(--primary)' : 'var(--text-light)'} />
                            {filterYear}
                            <ChevronDown size={14} style={{ transform: showYearDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                        {showYearDropdown && (
                            <div className="custom-select-dropdown">
                                {['2026', '2025', '2024'].map((year) => (
                                    <button key={year} onClick={() => { setFilterYear(year); setShowYearDropdown(false); }} className={`custom-select-item ${filterYear === year ? 'active' : ''}`}>{year}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="custom-select-container" ref={categoryDropdownRef}>
                        <button type="button" onClick={() => setShowCategoryDropdown(!showCategoryDropdown)} className="custom-select-trigger">
                            <Filter size={16} color={showCategoryDropdown ? 'var(--primary)' : 'var(--text-light)'} />
                            {filterCategory}
                            <ChevronDown size={14} style={{ transform: showCategoryDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                        {showCategoryDropdown && (
                            <div className="custom-select-dropdown">
                                <button onClick={() => { setFilterCategory('Semua Kategori'); setShowCategoryDropdown(false); }} className={`custom-select-item ${filterCategory === 'Semua Kategori' ? 'active' : ''}`}>Semua Kategori</button>
                                {categories.map((cat) => (
                                    <button key={cat.ID} onClick={() => { setFilterCategory(cat.Name); setShowCategoryDropdown(false); }} className={`custom-select-item ${filterCategory === cat.Name ? 'active' : ''}`}>{cat.Name}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowBulkModal(true)}
                        style={{ border: 'none', background: 'rgba(30, 89, 197, 0.05)', color: 'var(--primary)', padding: '0.75rem 1rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                        <Archive size={20} /> Sisipan Masal
                    </button>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={handleExport}
                            style={{ background: 'white', color: '#64748b', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Export ke Excel"
                        >
                            <Download size={20} />
                        </button>
                        <label
                            style={{ background: 'white', color: '#64748b', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: '12px', cursor: importLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Import via Excel/CSV"
                        >
                            {importLoading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                            <input type="file" hidden accept=".csv, .xlsx" onChange={handleImport} disabled={importLoading} />
                        </label>
                    </div>
                    <button onClick={openAddModal} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
                        <Plus size={20} /> Tambah Aset
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {[
                    { label: 'Total Aset', value: stats.total, icon: Database, color: '#3b82f6' },
                    { label: 'Laptops', value: stats.laptop, icon: LaptopIcon, color: '#8b5cf6' },
                    { label: 'Komputer', value: stats.computer, icon: Monitor, color: '#06b6d4' },
                    { label: 'Lainnya', value: stats.others, icon: Shield, color: '#10b981' }
                ].map((item, idx) => (
                    <div key={idx} className="chart-container" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ background: `${item.color}15`, color: item.color, padding: '1rem', borderRadius: '16px' }}><item.icon size={24} /></div>
                        <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.25rem' }}>{item.label}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{item.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Assets Table */}
            <div className="chart-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Aset Info</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Kategori</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Brand</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Type/Model</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Specification</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Location</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Tgl Pembelian</th>
                            <th style={{ padding: '1rem 1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Status</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="9" style={{ padding: '5rem', textAlign: 'center' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} /></td></tr>
                        ) : filteredAssets.length === 0 ? (
                            <tr><td colSpan="9" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>Tidak ada data aset ditemukan.</td></tr>
                        ) : filteredAssets.map((asset) => (
                            <tr key={asset.ID} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.938rem' }}>{asset.InventoryNumber}</div>
                                    <div style={{ fontSize: '0.813rem', color: '#64748b' }}>{asset.AssetName}</div>
                                </td>
                                <td style={{ padding: '1.25rem 1rem' }}>{asset.Category}</td>
                                <td style={{ padding: '1.25rem 1rem' }}>{asset.Brand || '-'}</td>
                                <td style={{ padding: '1.25rem 1rem' }}>{asset.TypeModel || '-'}</td>
                                <td style={{ padding: '1.25rem 1rem' }}><div style={{ fontSize: '0.813rem', color: '#64748b', maxWidth: '200px' }} title={asset.Specification}>{asset.Specification || '-'}</div></td>
                                <td style={{ padding: '1.25rem 1rem' }}>{asset.Location || '-'}</td>
                                <td style={{ padding: '1.25rem 1rem' }}>{asset.PurchaseDate && asset.PurchaseDate !== '0001-01-01T00:00:00Z' ? new Date(asset.PurchaseDate).toLocaleDateString('id-ID') : '-'}</td>
                                <td style={{ padding: '1.25rem 1rem' }}>
                                    <span style={{ padding: '0.375rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, background: asset.Status === 'Ready' ? '#f0fdf4' : (asset.Status === 'Rusak' ? '#fef2f2' : '#fefce8'), color: asset.Status === 'Ready' ? '#166534' : (asset.Status === 'Rusak' ? '#991b1b' : '#854d0e') }}>{asset.Status}</span>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                    <button onClick={() => handleEdit(asset)} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: 'var(--primary)', cursor: 'pointer', marginRight: '0.5rem' }}><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(asset.ID)} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modals - Simplified for content brevity */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '2rem' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>{isEdit ? 'Edit Aset' : 'Tambah Aset'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '2.5rem', overflowY: 'auto' }}>
                            <form onSubmit={handleStore}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>No. Inventaris</label>
                                        <input type="text" required placeholder="Contoh: KSO/2026/001" value={newAsset.inventory_number} onChange={(e) => setNewAsset({ ...newAsset, inventory_number: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Nama Aset</label>
                                        <input type="text" required placeholder="Nama aset lengkap..." value={newAsset.asset_name} onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.25rem' }}>
                                    <SearchableSelect
                                        label="Kategori"
                                        required
                                        value={newAsset.category}
                                        onChange={(val) => setNewAsset({ ...newAsset, category: val })}
                                        options={categories.map(c => ({ value: c.Name, label: c.Name }))}
                                        placeholder="Pilih Kategori"
                                    />
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Merk / Brand</label>
                                        <input type="text" placeholder="Asus, Dell, HP..." value={newAsset.brand} onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                                    </div>
                                </div>
                                
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Spesifikasi Teknis</label>
                                    <textarea rows="4" placeholder="Detail spesifikasi aset..." value={newAsset.specification} onChange={(e) => setNewAsset({ ...newAsset, specification: e.target.value })} style={{ width: '100%', padding: '1rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem', resize: 'vertical' }}></textarea>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                                    <SearchableSelect
                                        label="Status"
                                        value={newAsset.status}
                                        onChange={(val) => setNewAsset({ ...newAsset, status: val })}
                                        options={[
                                            { value: 'Ready', label: 'Ready' },
                                            { value: 'Rusak', label: 'Rusak' },
                                            { value: 'Obsolete', label: 'Obsolete' },
                                            { value: 'Hilang', label: 'Hilang' }
                                        ]}
                                    />
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.625rem', color: '#64748b', textTransform: 'uppercase' }}>Lokasi Penempatan</label>
                                        <input type="text" placeholder="Ruang IT, Gudang, etc..." value={newAsset.location} onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })} style={{ width: '100%', padding: '0.875rem 1.125rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }} />
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>Batal</button>
                                    <button type="submit" disabled={modalLoading} style={{ padding: '0.75rem 2.5rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(30, 89, 197, 0.2)' }}>
                                        {modalLoading ? <Loader2 className="animate-spin" size={20} /> : 'Simpan Aset'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmDelete}
                loading={confirmModal.isLoading}
                title="Hapus Aset"
                message="Apakah Anda yakin ingin menghapus aset ini dari sistem? Tindakan ini tidak dapat dibatalkan."
            />
        </div>
    );
};

export default InventoryBase;
