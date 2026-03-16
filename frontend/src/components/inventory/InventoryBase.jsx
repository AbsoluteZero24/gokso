import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Plus,
    Loader2,
    Filter,
    ChevronDown,
    Archive,
    Download,
    Upload,
    Search
} from 'lucide-react';

// Shared Components
import ConfirmModal from '../shared/ConfirmModal';
import SearchableSelect from '../shared/SearchableSelect';

// Inventory Sub-components
import AssetStats from './AssetStats';
import AssetTable from './AssetTable';
import AssetModal from './AssetModal';
import BulkAssetModal from './BulkAssetModal';

const InventoryBase = ({ title, description, status }) => {
    // --- STATE ---
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);
    const [stats, setStats] = useState({ total: 0, laptop: 0, computer: 0, others: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [importLoading, setImportLoading] = useState(false);
    const [filterYear, setFilterYear] = useState('2026');
    const [filterCategory, setFilterCategory] = useState('Semua Kategori');
    const [showYearDropdown, setShowYearDropdown] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    
    // UI Refs
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

    // Form Data State
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

    // --- DATA FETCHING ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const catParam = filterCategory === 'Semua Kategori' ? '' : `&category=${filterCategory}`;
            const statusParam = status ? `&status=${status}` : '';
            const response = await axios.get(`/api/assets-kso?year=${filterYear}${catParam}${statusParam}`);
            const fetchedAssets = response.data.assets || [];
            setAssets(fetchedAssets);

            const total = fetchedAssets.length;
            const laptop = fetchedAssets.filter(a => a.Category?.toLowerCase() === 'laptop').length;
            const computer = fetchedAssets.filter(a => a.Category?.toLowerCase() === 'komputer').length;
            setStats({ total, laptop, computer, others: total - laptop - computer });
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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowYearDropdown(false);
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) setShowCategoryDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- HANDLERS ---
    const handleDelete = (id) => setConfirmModal({ isOpen: true, id, isLoading: false });

    const handleConfirmDelete = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
            await axios.delete(`/api/assets-kso/delete/${confirmModal.id}`);
            setConfirmModal({ isOpen: false, id: null, isLoading: false });
            fetchData();
        } catch (error) {
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
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

        // Parse Specs if Laptop/Computer
        if (asset.Category === 'Laptop' || asset.Category === 'Komputer') {
            const spec = asset.Specification || '';
            const parts = spec.split(',').map(s => s.trim());
            const newCompSpecs = { os: '', processor: '', ramSize: '', ramUnit: 'GB', ramType: '', storageSize: '', storageUnit: 'GB', storageType: '' };

            if (parts.length >= 1) newCompSpecs.processor = parts[0];
            if (parts.length >= 4) newCompSpecs.os = parts[3];

            if (parts.length >= 2) {
                const ramPart = parts[1].replace(/^RAM\s+/i, '');
                const ramMatch = ramPart.match(/^(\d+)\s+(GB|TB)\s+(.*)$/i);
                if (ramMatch) {
                    newCompSpecs.ramSize = ramMatch[1];
                    newCompSpecs.ramUnit = ramMatch[2].toUpperCase();
                    newCompSpecs.ramType = ramMatch[3];
                }
            }

            if (parts.length >= 3) {
                const storageMatch = parts[2].match(/^(\d+)\s+(GB|TB)\s+(.*)$/i);
                if (storageMatch) {
                    newCompSpecs.storageSize = storageMatch[1];
                    newCompSpecs.storageUnit = storageMatch[2].toUpperCase();
                    newCompSpecs.storageType = storageMatch[3];
                }
            }
            setCompSpecs(newCompSpecs);
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
        setCompSpecs({ os: '', processor: '', ramSize: '', ramUnit: 'GB', ramType: '', storageSize: '', storageUnit: 'GB', storageType: '' });
        setShowModal(true);
    };

    const handleStore = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            let finalSpecification = newAsset.specification;
            const params = new URLSearchParams();

            if (newAsset.category === 'Laptop' || newAsset.category === 'Komputer') {
                const ram = `${compSpecs.ramSize} ${compSpecs.ramUnit} ${compSpecs.ramType}`;
                const storage = `${compSpecs.storageSize} ${compSpecs.storageUnit} ${compSpecs.storageType}`;
                finalSpecification = `${compSpecs.processor}, RAM ${ram}, ${storage}, ${compSpecs.os}`;
                
                params.set('spec_os', compSpecs.os);
                params.set('spec_processor', compSpecs.processor);
                params.set('spec_ram_size', compSpecs.ramSize);
                params.set('spec_ram_unit', compSpecs.ramUnit);
                params.set('spec_ram_type', compSpecs.ramType);
                params.set('spec_storage_size', compSpecs.storageSize);
                params.set('spec_storage_unit', compSpecs.storageUnit);
                params.set('spec_storage_type', compSpecs.storageType);
            }

            Object.keys(newAsset).forEach(key => {
                if (key === 'specification') params.append(key, finalSpecification);
                else params.append(key, newAsset[key]);
            });

            if (isEdit) await axios.post(`/api/assets-kso/update/${editId}`, params);
            else await axios.post('/api/assets-kso/store', params);

            setShowModal(false);
            fetchData();
        } catch (error) {
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
            const params = new URLSearchParams();

            if (bulkAsset.category === 'Laptop' || bulkAsset.category === 'Komputer') {
                const ram = `${compSpecs.ramSize} ${compSpecs.ramUnit} ${compSpecs.ramType}`;
                const storage = `${compSpecs.storageSize} ${compSpecs.storageUnit} ${compSpecs.storageType}`;
                finalSpecification = `${compSpecs.processor}, RAM ${ram}, ${storage}, ${compSpecs.os}`;
                
                params.set('spec_os', compSpecs.os);
                params.set('spec_processor', compSpecs.processor);
                params.set('spec_ram_size', compSpecs.ramSize);
                params.set('spec_ram_unit', compSpecs.ramUnit);
                params.set('spec_ram_type', compSpecs.ramType);
                params.set('spec_storage_size', compSpecs.storageSize);
                params.set('spec_storage_unit', compSpecs.storageUnit);
                params.set('spec_storage_type', compSpecs.storageType);
            }

            Object.keys(bulkAsset).forEach(key => {
                if (key === 'specification') params.append(key, finalSpecification);
                else params.append(key, bulkAsset[key]);
            });

            await axios.post('/api/assets-kso/bulk-store', params);
            setShowBulkModal(false);
            fetchData();
        } catch (error) {
            alert('Gagal menyimpan aset bulk.');
        } finally {
            setModalLoading(false);
        }
    };

    const handleExport = () => window.open('/api/assets-kso/export', '_blank');

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post('/api/assets-kso/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            alert(response.data.message);
            fetchData();
        } catch (error) {
            alert('Gagal mengimpor data.');
        } finally {
            setImportLoading(false);
            e.target.value = '';
        }
    };

    // Filter Logic
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
            {/* Header */}
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

                    {/* Year Filter */}
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

                    {/* Category Filter */}
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
                    
                    <button onClick={handleExport} className="btn-secondary" title="Export ke Excel">
                        <Download size={18} /> Export
                    </button>

                    <button onClick={openAddModal} className="btn-primary">
                        <Plus size={20} /> Tambah Aset
                    </button>
                </div>
            </div>

            {/* Stats */}
            <AssetStats stats={stats} />

            {/* Table */}
            <AssetTable 
                loading={loading} 
                assets={filteredAssets} 
                onEdit={handleEdit} 
                onDelete={handleDelete} 
            />

            {/* Modals */}
            <AssetModal 
                show={showModal}
                onClose={() => setShowModal(false)}
                isEdit={isEdit}
                newAsset={newAsset}
                setNewAsset={setNewAsset}
                compSpecs={compSpecs}
                setCompSpecs={setCompSpecs}
                categories={categories}
                ramTypes={ramTypes}
                storageTypes={storageTypes}
                modalLoading={modalLoading}
                onSubmit={handleStore}
            />

            <BulkAssetModal 
                show={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                bulkAsset={bulkAsset}
                setBulkAsset={setBulkAsset}
                compSpecs={compSpecs}
                setCompSpecs={setCompSpecs}
                categories={categories}
                ramTypes={ramTypes}
                storageTypes={storageTypes}
                modalLoading={modalLoading}
                onSubmit={handleBulkStore}
            />

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
