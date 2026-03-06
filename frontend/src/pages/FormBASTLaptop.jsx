import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SearchableSelect from '../components/SearchableSelect';
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
    CircleCheck
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const FormBASTLaptop = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [initData, setInitData] = useState({ employees: [], assets: [] });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [category, setCategory] = useState('Pengambilan');

    // Signature Refs
    const sigRefP1 = useRef(null);
    const sigRefP2 = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        handover_date: new Date().toISOString().split('T')[0],
        p1_employee_id: '',
        p2_employee_id: '',
        old_asset_id: '',
        new_asset_id: '',
        asset_condition: 'Ready',
        selected_assets: [{ id: '', sn: '', label: '' }],
        notes: ''
    });

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
    }, [id]);

    const employeeOptions = initData.employees.map(e => ({
        value: e.ID,
        label: `${e.Name} - ${e.Department || 'N/A'}`
    }));

    const standardAssetOptions = initData.assets
        .filter(a => {
            if (category === 'Pengembalian') return !!a.UserID;
            if (category === 'Pengambilan') return !a.UserID;
            return true;
        })
        .map(a => ({
            value: a.ID,
            label: `${a.InventoryNumber} - ${a.AssetName} ${a.DeviceName ? `(${a.DeviceName})` : ''} ${a.User ? `- Assign: ${a.User.Name}` : ''}`,
            data: a
        }));

    const oldAssetOptions = initData.assets
        .filter(a => !!a.UserID)
        .map(a => ({
            value: a.ID,
            label: `${a.InventoryNumber} - ${a.AssetName} (User: ${a.User?.Name})`,
            data: a
        }));

    const newAssetOptions = initData.assets
        .filter(a => !a.UserID)
        .map(a => ({
            value: a.ID,
            label: `${a.InventoryNumber} - ${a.AssetName}`,
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (sigRefP1.current.isEmpty() || sigRefP2.current.isEmpty()) {
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
            webFormData.append('document_category', category);
            webFormData.append('handover_date', formData.handover_date);
            webFormData.append('p1_employee_id', formData.p1_employee_id);
            webFormData.append('p2_employee_id', formData.p2_employee_id);
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

            webFormData.append('sig_p1_data', sigRefP1.current.toDataURL());
            webFormData.append('sig_p2_data', sigRefP2.current.toDataURL());

            await axios.post(`/api/goform/submit/${currentFormId}`, webFormData);

            setAlertConfig({
                isOpen: true,
                title: 'Berhasil',
                message: 'Berita Acara Serah Terima (BAST) berhasil dibuat dan disimpan ke eDoc.',
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
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem 1rem' }}>
                                        <Calendar size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                                        <input
                                            type="date"
                                            value={formData.handover_date}
                                            onChange={(e) => setFormData({ ...formData, handover_date: e.target.value })}
                                            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontWeight: 600 }}
                                            required
                                        />
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
                                            options={employeeOptions}
                                            value={formData.p1_employee_id}
                                            onChange={(val) => setFormData({ ...formData, p1_employee_id: val })}
                                            placeholder="Cari Karyawan..."
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
                                            options={employeeOptions}
                                            value={formData.p2_employee_id}
                                            onChange={(val) => setFormData({ ...formData, p2_employee_id: val })}
                                            placeholder="Cari Karyawan..."
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

                            {/* Signatures */}
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

                            {/* Submit */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '2rem', borderTop: '1px solid #f1f5f9' }}>
                                <Link to="/goform" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 700, textDecoration: 'none', color: 'var(--text-main)' }}>Batal</Link>
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
