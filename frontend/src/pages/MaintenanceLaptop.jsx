import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ClipboardList,
    Search,
    Loader2,
    ChevronRight,
    Calendar,
    Settings,
    ShieldCheck,
    Building2,
    Briefcase,
    History,
    Send,
    Pencil,
    CircleCheck,
    CircleX,
    CircleAlert,
    Smartphone
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MaintenanceLaptop = () => {
    const [data, setData] = useState({ groupedAssets: {}, branches: [], years: [], period: '' });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        year: new Date().getFullYear().toString(),
        semester: new Date().getMonth() < 6 ? 'S1' : 'S2',
        branch: '',
        department: '',
        sub_department: ''
    });

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [formData, setFormData] = useState({
        antivirus_updated: 'false',
        clear_temporary: 'false',
        overall_condition: 'Normal',
        inspection_date: new Date().toISOString().split('T')[0],
        remarks: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters).toString();
            const response = await axios.get(`/api/maintenance/laptop?${query}`);
            setData(response.data);
        } catch (error) {
            console.error('Error fetching maintenance data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters.year, filters.semester]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: value };
            if (name === 'branch') {
                newFilters.department = '';
                newFilters.sub_department = '';
            } else if (name === 'department') {
                newFilters.sub_department = '';
            }
            return newFilters;
        });
    };

    const applyFilters = () => {
        fetchData();
    };

    const openModal = (item) => {
        setSelectedAsset(item.Asset);
        setFormData({
            antivirus_updated: item.HasReport ? item.Report.AntivirusUpdated.toString() : 'false',
            clear_temporary: item.HasReport ? item.Report.ClearTemporary.toString() : 'false',
            overall_condition: item.HasReport ? item.Report.OverallCondition : 'Normal',
            inspection_date: item.HasReport ? item.Report.InspectionDate.split('T')[0] : new Date().toISOString().split('T')[0],
            remarks: item.HasReport ? item.Report.Remarks : ''
        });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const submission = new URLSearchParams();
            submission.append('asset_id', selectedAsset.ID);
            submission.append('period', data.period);
            submission.append('antivirus_updated', formData.antivirus_updated);
            submission.append('clear_temporary', formData.clear_temporary);
            submission.append('overall_condition', formData.overall_condition);
            submission.append('inspection_date', formData.inspection_date);
            submission.append('remarks', formData.remarks);

            await axios.post('/api/maintenance/laptop/store', submission);
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert('Gagal menyimpan data pemeliharaan');
        } finally {
            setSubmitting(false);
        }
    };

    const selectedBranchData = data.branches.find(b => b.Name === filters.branch);
    const departments = selectedBranchData ? selectedBranchData.Departments || [] : [];
    const selectedDeptData = departments.find(d => d.Name === filters.department);
    const subDepartments = selectedDeptData ? selectedDeptData.SubDepartments || [] : [];

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Maintenance Laptop</h1>
                    <p style={{ color: 'var(--text-light)' }}>Pencatatan rutin kondisi aset laptop & komputer</p>
                </div>
                <Link to="/maintenance/history" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', background: 'white', border: '1px solid var(--border)', padding: '0.625rem 1.25rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    <History size={18} /> Riwayat Laporan
                </Link>
            </div>

            {/* FILTER PANEL */}
            <div className="chart-container" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--text-light)' }}>Tahun</label>
                        <select name="year" value={filters.year} onChange={handleFilterChange} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            {data.years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--text-light)' }}>Semester</label>
                        <select name="semester" value={filters.semester} onChange={handleFilterChange} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <option value="S1">Semester 1</option>
                            <option value="S2">Semester 2</option>
                        </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}></div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--text-light)' }}>Cabang</label>
                        <select name="branch" value={filters.branch} onChange={handleFilterChange} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <option value="">-- Pilih Cabang --</option>
                            {data.branches.map(b => <option key={b.ID} value={b.Name}>{b.Name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--text-light)' }}>Bagian</label>
                        <select name="department" value={filters.department} onChange={handleFilterChange} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <option value="">-- Pilih Bagian --</option>
                            {departments.map(d => <option key={d.ID} value={d.Name}>{d.Name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--text-light)' }}>Sub Bagian</label>
                        <select name="sub_department" value={filters.sub_department} onChange={handleFilterChange} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <option value="">-- Pilih Sub --</option>
                            {subDepartments.map(s => <option key={s.ID} value={s.Name}>{s.Name}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={applyFilters}
                        style={{
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            padding: '0.625rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Search size={18} /> Terapkan Filter
                    </button>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>DAFTAR PEMELIHARAAN ASET</h2>
                <p style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>Periode: {filters.semester === 'S1' ? 'Semester 1' : 'Semester 2'} - {filters.year}</p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                </div>
            ) : Object.keys(data.groupedAssets).length === 0 ? (
                <div className="chart-container" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-light)' }}>
                    <CircleAlert size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p>Tidak ada aset yang ditemukan untuk filter ini.</p>
                </div>
            ) : (
                Object.entries(data.groupedAssets).map(([subDept, assets]) => (
                    <div key={subDept} style={{ marginBottom: '2.5rem' }}>
                        <div style={{ padding: '0.75rem 1.25rem', background: '#f8fafc', borderLeft: '4px solid var(--primary)', borderRadius: '4px', fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
                            Sub Bagian: {subDept}
                        </div>
                        <div className="chart-container" style={{ padding: '0', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.813rem' }}>No</th>
                                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.813rem' }}>User / Pemegang</th>
                                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.813rem' }}>Asset</th>
                                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.813rem', textAlign: 'center' }}>Antivirus</th>
                                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.813rem', textAlign: 'center' }}>Clear Temp</th>
                                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.813rem', textAlign: 'center' }}>Kondisi</th>
                                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.813rem' }}>Tanggal Cek</th>
                                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.813rem' }}>Keterangan</th>
                                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.813rem', textAlign: 'center' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assets.map((item, idx) => (
                                        <tr key={item.Asset.ID} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{idx + 1}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.HasReport ? item.Report.UserName : item.Asset.User?.Name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.HasReport ? item.Report.UserPosition : item.Asset.User?.Position}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginBottom: '0.2rem' }}>{item.Asset.InventoryNumber}</div>
                                                <div style={{ fontWeight: 600, fontSize: '0.813rem' }}>{item.Asset.DeviceName}</div>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                {item.HasReport ? (
                                                    item.Report.AntivirusUpdated ? <CircleCheck size={18} color="#10b981" /> : <CircleX size={18} color="#ef4444" />
                                                ) : '-'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                {item.HasReport ? (
                                                    item.Report.ClearTemporary ? <CircleCheck size={18} color="#10b981" /> : <CircleX size={18} color="#ef4444" />
                                                ) : '-'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                {item.HasReport ? (
                                                    <span style={{
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: '50px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        background: item.Report.OverallCondition === 'Normal' ? '#dcfce7' : '#fee2e2',
                                                        color: item.Report.OverallCondition === 'Normal' ? '#166534' : '#991b1b'
                                                    }}>
                                                        {item.Report.OverallCondition}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Belum Cek</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.813rem' }}>
                                                {item.HasReport ? new Date(item.Report.InspectionDate).toLocaleDateString('id-ID') : '-'}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.813rem', color: 'var(--text-light)' }}>
                                                {item.HasReport ? item.Report.Remarks : '-'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => openModal(item)}
                                                    style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', color: 'var(--primary)', cursor: 'pointer' }}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}

            {/* Entry Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
                    <div className="chart-container" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Isi Data Pemeliharaan</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}><CircleX /></button>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Aset</label>
                            <div style={{ fontWeight: 700 }}>{selectedAsset?.DeviceName} ({selectedAsset?.InventoryNumber})</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem' }}>Antivirus Terupdate?</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="radio" name="antivirus_updated" value="true" checked={formData.antivirus_updated === 'true'} onChange={(e) => setFormData({ ...formData, antivirus_updated: e.target.value })} /> Ya
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="radio" name="antivirus_updated" value="false" checked={formData.antivirus_updated === 'false'} onChange={(e) => setFormData({ ...formData, antivirus_updated: e.target.value })} /> Tidak
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem' }}>Clear Temporary?</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="radio" name="clear_temporary" value="true" checked={formData.clear_temporary === 'true'} onChange={(e) => setFormData({ ...formData, clear_temporary: e.target.value })} /> Ya
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="radio" name="clear_temporary" value="false" checked={formData.clear_temporary === 'false'} onChange={(e) => setFormData({ ...formData, clear_temporary: e.target.value })} /> Tidak
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Kondisi Keseluruhan</label>
                            <select value={formData.overall_condition} onChange={(e) => setFormData({ ...formData, overall_condition: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <option value="Normal">Normal</option>
                                <option value="Tidak Normal">Tidak Normal</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Tanggal Periksa</label>
                            <input type="date" value={formData.inspection_date} onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }} />
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Keterangan</label>
                            <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} rows="3" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }} placeholder="Opsional..."></textarea>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', fontWeight: 600 }}>Batal</button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {submitting && <Loader2 className="animate-spin" size={18} />}
                                Simpan Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceLaptop;
