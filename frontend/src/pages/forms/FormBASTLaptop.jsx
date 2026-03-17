import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SearchableSelect from '../../components/shared/SearchableSelect';
import SignaturePad from 'react-signature-canvas';
import {
    FileCheck,
    Calendar,
    Tag,
    ArrowLeftRight,
    User,
    Plus,
    Trash2,
    Send,
    Loader2,
    ChevronLeft,
    Smartphone,
    CircleCheck,
    ChevronRight
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../../components/shared/ConfirmModal';

const FormBASTLaptop = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [initData, setInitData] = useState({ employees: [], assets: [] });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [category, setCategory] = useState('Pengambilan');
    const [signMethod, setSignMethod] = useState('direct'); // 'direct' or 'request'

    // Signature Refs
    const sigRefP1 = useRef(null);
    const sigRefP2 = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        handover_date: new Date().toISOString().split('T')[0],
        p1_user_id: '',
        p2_user_id: '',
        old_asset_id: '',
        new_asset_id: '',
        asset_condition: 'Ready',
        selected_assets: [{ id: '', sn: '', label: '' }],
        notes: ''
    });

    const [viewDate, setViewDate] = useState(new Date());
    const [activeDropdown, setActiveDropdown] = useState(null); // 'date'

    const [alertConfig, setAlertConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { }
    });

    const currentFormId = id || 'form-bast-laptop';

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/goform/init/${currentFormId}`);
            setInitData({
                employees: response.data.employees || [],
                assets: response.data.assets || []
            });
        } catch (error) {
            console.error('Error fetching init data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const handleClickOutside = (e) => {
            if (!e.target.closest('.modern-datepicker-container')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [id]);

    const userOptions = initData.employees.map(e => ({
        value: e.id || e.ID,
        label: `${e.name || e.Name || 'Unknown'} - ${e.department || e.Department || 'N/A'}`
    }));

    const standardAssetOptions = initData.assets
        .filter(a => {
            if (category === 'Pengembalian') return !!a.UserID;
            if (category === 'Pengambilan') return !a.UserID && a.Status === 'Ready';
            return true;
        })
        .map(a => {
            const userName = a.User?.name || a.User?.Name || '';
            return {
                value: a.ID || a.id,
                label: `${a.InventoryNumber || a.inventory_number} - ${a.AssetName || a.asset_name} ${a.DeviceName ? `(${a.DeviceName})` : ''} ${userName ? `- Assign: ${userName}` : ''}`,
                data: a
            };
        });

    const oldAssetOptions = initData.assets
        .filter(a => !!a.UserID)
        .map(a => {
            const userName = a.User?.name || a.User?.Name || '';
            return {
                value: a.ID || a.id,
                label: `${a.InventoryNumber || a.inventory_number} - ${a.AssetName || a.asset_name} (User: ${userName})`,
                data: a
            };
        });

    const newAssetOptions = initData.assets
        .filter(a => !a.UserID && a.Status === 'Ready')
        .map(a => ({
            value: a.ID || a.id,
            label: `${a.InventoryNumber || a.inventory_number} - ${a.AssetName || a.asset_name}`,
            data: a
        }));

    const handleAssetChange = (index, selectedOption) => {
        const updatedAssets = [...formData.selected_assets];
        if (selectedOption) {
            const asset = selectedOption.data;
            updatedAssets[index] = {
                id: asset.ID,
                sn: asset.SerialNumber || '-',
                label: asset.DeviceName || asset.Category || '-'
            };
        } else {
            updatedAssets[index] = { id: '', sn: '', label: '' };
        }
        setFormData({ ...formData, selected_assets: updatedAssets });
    };

    const addAssetRow = () => {
        setFormData({
            ...formData,
            selected_assets: [...formData.selected_assets, { id: '', sn: '', label: '' }]
        });
    };

    const removeAssetRow = (index) => {
        const updatedAssets = formData.selected_assets.filter((_, i) => i !== index);
        setFormData({ ...formData, selected_assets: updatedAssets });
    };

    const clearSignature = (ref) => {
        if (ref.current) ref.current.clear();
    };

    // Date Picker Helpers
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const days = [];
        // Prev month days
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: daysInPrevMonth - i, currentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
        }
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
        }
        // Next month days
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
        }
        return days;
    };

    const handleSubmit = async (e, submitType = 'direct') => {
        if (e) e.preventDefault();

        if (submitType === 'direct' && (sigRefP1.current.isEmpty() || sigRefP2.current.isEmpty())) {
            setAlertConfig({
                isOpen: true,
                title: 'Tanda Tangan Kosong',
                message: 'Harap lengkapi tanda tangan PIHAK PERTAMA dan PIHAK KEDUA.',
                type: 'danger',
                onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
            });
            return;
        }

        setSubmitting(true);
        try {
            const webFormData = new URLSearchParams();
            webFormData.append('submit_type', submitType);
            webFormData.append('document_category', category);
            webFormData.append('handover_date', formData.handover_date);
            webFormData.append('p1_user_id', formData.p1_user_id);
            webFormData.append('p2_user_id', formData.p2_user_id);
            webFormData.append('notes', formData.notes);

            if (category === 'Tukar') {
                webFormData.append('old_asset_id', formData.old_asset_id);
                webFormData.append('new_asset_id', formData.new_asset_id);
                webFormData.append('asset_condition', formData.asset_condition);
            } else {
                formData.selected_assets.forEach(asset => {
                    if (asset.id) webFormData.append('selected_asset_ids[]', asset.id);
                });
            }

            if (submitType === 'direct') {
                webFormData.append('sig_p1_data', sigRefP1.current.toDataURL());
                webFormData.append('sig_p2_data', sigRefP2.current.toDataURL());
            }

            await axios.post(`/api/goform/submit/${currentFormId}`, webFormData);

            setAlertConfig({
                isOpen: true,
                title: 'Berhasil',
                message: submitType === 'request' 
                    ? 'Permohonan tanda tangan berhasil diajukan. Draft dapat dilihat di GoSign.' 
                    : 'Berita Acara Serah Terima (BAST) berhasil dibuat dan disimpan ke eDoc.',
                type: 'success',
                onConfirm: () => navigate('/goform')
            });
        } catch (error) {
            console.error('Error submitting form:', error);
            setAlertConfig({
                isOpen: true,
                title: 'Gagal',
                message: 'Gagal mengirim formulir. Silakan coba lagi.',
                type: 'danger',
                onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div className="page-content">
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <Link to="/goform" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--text-light)', marginBottom: '1.5rem', fontWeight: 600 }}>
                    <ChevronLeft size={20} /> Kembali ke Katalog
                </Link>

                <div className="chart-container" style={{ padding: '0', border: 'none', background: 'transparent' }}>
                    <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px', color: 'var(--primary)' }}>
                                <FileCheck size={28} />
                            </div>
                            <div>
                                <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                                    {currentFormId === 'form-bast-laptop' ? 'BA Serah Terima Laptop/Komputer' : 'BA Serah Terima Aset'}
                                </h1>
                                <p style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Lengkapi data di bawah ini untuk membuat dokumen BAST digital.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
                            {/* Category Radio */}
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '1rem' }}>Kategori Dokumen</label>
                                <div style={{ display: 'flex', gap: '2rem' }}>
                                    {['Pengambilan', 'Pengembalian', 'Tukar'].map(cat => (
                                        <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                                            <input
                                                type="radio"
                                                name="category"
                                                value={cat}
                                                checked={category === cat}
                                                onChange={(e) => setCategory(e.target.value)}
                                                style={{ width: '1.25rem', height: '1.25rem' }}
                                            />
                                            {cat === 'Tukar' ? 'Penukaran (Tukar)' : cat}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Basic Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '0.5rem' }}>Nomor Dokumen</label>
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.625rem 1rem' }}>
                                        <Tag size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                                        <input type="text" value="OTOMATIS" readOnly style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontWeight: 700, color: 'var(--text-light)' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '0.5rem' }}>Tanggal Serah Terima</label>
                                    <div style={{ position: 'relative' }} className="modern-datepicker-container">
                                        <div 
                                            onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                background: 'white', 
                                                border: `1.5px solid ${activeDropdown === 'date' ? 'var(--primary)' : 'var(--border)'}`, 
                                                borderRadius: '12px', 
                                                padding: '0.75rem 1rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: activeDropdown === 'date' ? '0 0 0 4px rgba(30, 89, 197, 0.1)' : 'none'
                                            }}
                                        >
                                            <Calendar size={18} color={activeDropdown === 'date' ? 'var(--primary)' : 'var(--text-light)'} style={{ marginRight: '0.75rem' }} />
                                            <span style={{ fontWeight: 600, fontSize: '0.938rem', color: formData.handover_date ? '#1e293b' : '#94a3b8' }}>
                                                {formData.handover_date ? formatDate(formData.handover_date) : 'Pilih Tanggal...'}
                                            </span>
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
                                                        background: 'white', 
                                                        borderRadius: '20px', 
                                                        boxShadow: '0 15px 35px rgba(0,0,0,0.12)', 
                                                        padding: '1.5rem', 
                                                        zIndex: 3000, 
                                                        width: '320px',
                                                        border: '1px solid #f1f5f9' 
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                        <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #f1f5f9', background: 'white', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
                                                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                                                            {viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                                        </span>
                                                        <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #f1f5f9', background: 'white', cursor: 'pointer' }}><ChevronRight size={16} /></button>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                                                        {['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'].map(d => <span key={d} style={{ fontSize: '0.625rem', fontWeight: 800, color: '#94a3b8' }}>{d}</span>)}
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                                        {getDaysInMonth(viewDate).map((d, i) => {
                                                            const isSelected = formData.handover_date === d.date.toISOString().split('T')[0];
                                                            const isToday = new Date().toISOString().split('T')[0] === d.date.toISOString().split('T')[0];
                                                            
                                                            return (
                                                                <div 
                                                                    key={i} 
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, handover_date: d.date.toISOString().split('T')[0] });
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                    style={{ 
                                                                        padding: '0.6rem 0', 
                                                                        borderRadius: '10px', 
                                                                        cursor: 'pointer', 
                                                                        fontSize: '0.875rem', 
                                                                        fontWeight: isSelected || isToday ? 700 : 500,
                                                                        background: isSelected ? 'var(--primary)' : (isToday ? 'rgba(30, 89, 197, 0.1)' : 'transparent'),
                                                                        color: isSelected ? 'white' : (d.currentMonth ? '#1e293b' : '#cbd5e1'),
                                                                        transition: 'all 0.2s',
                                                                        textAlign: 'center'
                                                                    }}
                                                                    onMouseOver={(e) => !isSelected && (e.currentTarget.style.background = '#f1f5f9')}
                                                                    onMouseOut={(e) => {
                                                                        if (!isSelected) {
                                                                            e.currentTarget.style.background = isToday ? 'rgba(30, 89, 197, 0.1)' : 'transparent';
                                                                        }
                                                                    }}
                                                                >
                                                                    {d.day}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Exchange Section */}
                            {category === 'Tukar' && (
                                <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2.5rem' }}>
                                    <h6 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1.25rem', textTransform: 'uppercase' }}>
                                        <ArrowLeftRight size={18} /> Detail Pertukaran Aset
                                    </h6>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem' }}>Aset Lama (Ditarik/Kembali)</label>
                                            <SearchableSelect
                                                options={oldAssetOptions}
                                                value={formData.old_asset_id}
                                                onChange={(val) => setFormData({ ...formData, old_asset_id: val })}
                                                placeholder="Pilih Aset Lama..."
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem' }}>Aset Baru (Diserahkan)</label>
                                            <SearchableSelect
                                                options={newAssetOptions}
                                                value={formData.new_asset_id}
                                                onChange={(val) => setFormData({ ...formData, new_asset_id: val })}
                                                placeholder="Pilih Aset Baru..."
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* The Two Parties */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '3rem', marginBottom: '2.5rem' }}>
                                <div>
                                    <h6 style={{ fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>PIHAK PERTAMA (PEMBERI)</h6>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nama Pemberi</label>
                                        <SearchableSelect
                                            options={userOptions}
                                            value={formData.p1_user_id}
                                            onChange={(val) => setFormData({ ...formData, p1_user_id: val })}
                                            placeholder="Cari User..."
                                            required
                                        />
                                    </div>
                                    {category === 'Tukar' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Status Kondisi Aset Lama</label>
                                            <SearchableSelect
                                                value={formData.asset_condition}
                                                onChange={(val) => setFormData({ ...formData, asset_condition: val })}
                                                options={[
                                                    { value: 'Ready', label: 'Ready / Bagus' },
                                                    { value: 'Rusak', label: 'Rusak' },
                                                    { value: 'Hilang', label: 'Hilang' }
                                                ]}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h6 style={{ fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>PIHAK KEDUA (PENERIMA)</h6>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nama Penerima</label>
                                        <SearchableSelect
                                            options={userOptions}
                                            value={formData.p2_user_id}
                                            onChange={(val) => setFormData({ ...formData, p2_user_id: val })}
                                            placeholder="Cari User..."
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Asset Details Table */}
                            {category !== 'Tukar' && (
                                <div style={{ marginBottom: '3rem' }}>
                                    <h6 style={{ fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>DETAIL ASET</h6>
                                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                            <thead style={{ background: '#f8fafc' }}>
                                                <tr>
                                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.813rem', fontWeight: 700, width: '45%' }}>Pilih / Cari Aset</th>
                                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.813rem', fontWeight: 700, width: '25%' }}>SerialNumber</th>
                                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.813rem', fontWeight: 700, width: '22%' }}>Label</th>
                                                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.813rem', fontWeight: 700, width: '50px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.selected_assets.map((asset, index) => (
                                                    <tr key={index} style={{ borderTop: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '0.75rem 1rem' }}>
                                                            <SearchableSelect
                                                                options={standardAssetOptions}
                                                                value={asset.id}
                                                                onChange={(val, opt) => handleAssetChange(index, opt)}
                                                                placeholder="Cari No Inventoris..."
                                                                required
                                                            />
                                                        </td>
                                                        <td style={{ padding: '0.75rem 1rem' }}>
                                                            <input type="text" value={asset.sn} readOnly style={{ width: '100%', border: 'none', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', fontSize: '0.813rem' }} />
                                                        </td>
                                                        <td style={{ padding: '0.75rem 1rem' }}>
                                                            <input type="text" value={asset.label} readOnly style={{ width: '100%', border: 'none', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', fontSize: '0.813rem' }} />
                                                        </td>
                                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeAssetRow(index)}
                                                                disabled={formData.selected_assets.length === 1}
                                                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', opacity: formData.selected_assets.length === 1 ? 0.3 : 1 }}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button type="button" onClick={addAssetRow} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px dashed var(--border)', padding: '0.625rem 1rem', borderRadius: '10px', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}>
                                        <Plus size={18} /> Tambah Baris Aset
                                    </button>
                                </div>
                            )}

                             {/* Signing Method Selection */}
                             <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 800, color: '#0369a1', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Metode Tanda Tangan</label>
                                <div style={{ maxWidth: '300px' }}>
                                    <SearchableSelect
                                        value={signMethod}
                                        onChange={(val) => setSignMethod(val)}
                                        options={[
                                            { value: 'direct', label: 'Tanda Tangan Digital (Langsung)' },
                                            { value: 'request', label: 'Ajukan Tanda Tangan (GoSign)' }
                                        ]}
                                    />
                                </div>
                                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#0c4a6e' }}>
                                    {signMethod === 'direct' 
                                        ? '* Anda dan penerima melakukan tanda tangan langsung di layar ini.' 
                                        : '* Kirim permintaan tanda tangan ke akun masing-masing pihak melalui GoSign.'}
                                </p>
                             </div>

                             {/* Signatures Area - Only if Direct */}
                             {signMethod === 'direct' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '1rem' }}>Tanda Tangan PIHAK PERTAMA</label>
                                        <div style={{ background: '#f8fafc', border: '2px dashed var(--border)', borderRadius: '12px', height: '180px', position: 'relative' }}>
                                            <SignaturePad
                                                ref={sigRefP1}
                                                canvasProps={{ width: 400, height: 180, className: 'signature-canvas' }}
                                            />
                                        </div>
                                        <button type="button" onClick={() => clearSignature(sigRefP1)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.5rem', cursor: 'pointer' }}>HAPUS TTD</button>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '1rem' }}>Tanda Tangan PIHAK KEDUA</label>
                                        <div style={{ background: '#f8fafc', border: '2px dashed var(--border)', borderRadius: '12px', height: '180px', position: 'relative' }}>
                                            <SignaturePad
                                                ref={sigRefP2}
                                                canvasProps={{ width: 400, height: 180, className: 'signature-canvas' }}
                                            />
                                        </div>
                                        <button type="button" onClick={() => clearSignature(sigRefP2)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.5rem', cursor: 'pointer' }}>HAPUS TTD</button>
                                    </div>
                                </div>
                             )}

                             {/* Submit Buttons */}
                             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '2rem', borderTop: '1px solid #f1f5f9' }}>
                                 <Link to="/goform" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 700, textDecoration: 'none', color: 'var(--text-main)' }}>Batal</Link>
                                 
                                 {signMethod === 'request' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!formData.p1_user_id || !formData.p2_user_id) {
                                                alert('Harap pilih PIHAK PERTAMA dan PIHAK KEDUA sebelum mengajukan!');
                                                return;
                                            }
                                            handleSubmit(null, 'request');
                                        }}
                                        disabled={submitting}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '12px',
                                            border: '1px solid #10b981',
                                            background: 'white',
                                            color: '#10b981',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: submitting ? 'not-allowed' : 'pointer',
                                            opacity: submitting ? 0.7 : 1
                                        }}
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={20} /> : <Smartphone size={20} />}
                                        Ajukan Tanda Tangan
                                    </button>
                                 )}

                                 {signMethod === 'direct' && (
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        style={{
                                            padding: '0.75rem 2rem',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--primary)',
                                            color: 'white',
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                        Submit & Simpan ke eDoc
                                    </button>
                                 )}
                             </div>
                        </form>
                    </div>
                </div>
            </div>
            <style>{`
        .signature-canvas {
          width: 100%;
          height: 100%;
        }
      `}</style>

            <ConfirmModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={alertConfig.onConfirm}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                confirmText="OK"
                cancelText=""
            />
        </div>
    );
};

export default FormBASTLaptop;
