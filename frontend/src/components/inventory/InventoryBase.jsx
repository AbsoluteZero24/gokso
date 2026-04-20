import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    // --- STATE MANAGEMENT ---
    const [loading, setLoading] = useState(true); // Status loading saat fetch data
    const [assets, setAssets] = useState([]); // Daftar aset dari backend
    const [stats, setStats] = useState({ total: 0, laptop: 0, computer: 0, others: 0 }); // Statistik ringkasan aset
    const [searchTerm, setSearchTerm] = useState(''); // Kata kunci pencarian cepat
    const [importLoading, setImportLoading] = useState(false); // Status loading saat import excel
    const [searchParams] = useSearchParams();
    const urlCategory = searchParams.get('category'); // Kategori dari URL jika ada
    
    // Filter State
    const [filterYear, setFilterYear] = useState('Semua Tahun'); // Tahun filter data
    const [filterCategory, setFilterCategory] = useState(urlCategory || 'Semua Kategori'); // Kategori filter data
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

    /**
     * Mengambil daftar aset dari backend dengan filter tahun, kategori, dan status.
     * Menggunakan lowercase keys sesuai standar data terbaru.
     */
    const fetchData = async () => {
        setLoading(true);
        try {
            const catParam = filterCategory === 'Semua Kategori' ? '' : `&category=${filterCategory}`;
            const statusParam = status ? `&status=${status}` : '';
            const yearParam = filterYear === 'Semua Tahun' ? '' : `year=${filterYear}`;
            const queryParams = [yearParam, catParam, statusParam].filter(p => p).join('&');
            
            const response = await axios.get(`/api/assets-kso?${queryParams}`);
            const fetchedAssets = response.data.assets || [];
            setAssets(fetchedAssets);

            // Menghitung statistik berdasarkan kategori
            const total = fetchedAssets.length;
            const laptop = fetchedAssets.filter(a => a && (a.category || a.Category || '').toString().toLowerCase() === 'laptop').length;
            const computer = fetchedAssets.filter(a => a && (a.category || a.Category || '').toString().toLowerCase() === 'komputer').length;
            setStats({ total, laptop, computer, others: total - laptop - computer });
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Mengambil data master kategori aset untuk dropdown filter.
     */
    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/master-data/asset-category');
            setCategories(response.data.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    /**
     * Mengambil data master spesifikasi RAM dan Storage.
     */
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
        if (urlCategory) {
            setFilterCategory(urlCategory);
        }
    }, [urlCategory]);

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

    // Mempersiapkan data untuk mode EDIT aset
    const handleEdit = (asset) => {
        setIsEdit(true);
        setEditId(asset.id || asset.ID);
        setNewAsset({
            inventory_number: asset.inventory_number || asset.InventoryNumber || '',
            asset_name: asset.asset_name || asset.AssetName || '',
            category: asset.category || asset.Category || '',
            brand: asset.brand || asset.Brand || '',
            type_model: asset.type_model || asset.TypeModel || '',
            serial_number: asset.serial_number || asset.SerialNumber || '',
            device_name: asset.device_name || asset.DeviceName || '',
            specification: asset.specification || asset.Specification || '',
            color: asset.color || asset.Color || '',
            location: asset.location || asset.Location || '',
            purchase_date: (asset.purchase_date || asset.PurchaseDate || '').split('T')[0],
            status: asset.status || asset.Status || 'Ready'
        });

        // Melakukan parsing string spesifikasi jika kategori Laptop atau Komputer
        const cat = (asset.category || asset.Category || '');
        if (cat === 'Laptop' || cat === 'Komputer') {
            const spec = asset.specification || asset.Specification || '';
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

    // Logika pencarian aset di sisi client (berdasarkan tampilan saat ini)
    const filteredAssets = assets.filter(asset => {
        if (!asset) return false;
        const query = (searchTerm || '').toString().toLowerCase();
        const assetName = (asset.asset_name || asset.AssetName || '').toString().toLowerCase();
        const invNum = (asset.inventory_number || asset.InventoryNumber || '').toString().toLowerCase();
        const brand = (asset.brand || asset.Brand || '').toString().toLowerCase();
        const model = (asset.type_model || asset.TypeModel || '').toString().toLowerCase();
        const loc = (asset.location || asset.Location || '').toString().toLowerCase();
        const sn = (asset.serial_number || asset.SerialNumber || '').toString().toLowerCase();

        return (
            assetName.includes(query) ||
            invNum.includes(query) ||
            brand.includes(query) ||
            model.includes(query) ||
            loc.includes(query) ||
            sn.includes(query)
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
                                {['Semua Tahun', '2026', '2025', '2024', '2023'].map((year) => (
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
                                {categories.map((cat) => {
                                    const catName = cat.name || cat.Name;
                                    const catId = cat.id || cat.ID;
                                    return (
                                        <button key={catId} onClick={() => { setFilterCategory(catName); setShowCategoryDropdown(false); }} className={`custom-select-item ${filterCategory === catName ? 'active' : ''}`}>{catName}</button>
                                    );
                                })}
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
