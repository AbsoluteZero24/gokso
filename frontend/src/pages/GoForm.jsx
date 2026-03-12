import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    FileText,
    Search,
    Loader2,
    ArrowRight,
    Wrench,
    UserCheck,
    Truck,
    ClipboardCheck,
    Laptop,
    Settings,
    X,
    Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

const GoForm = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'Super Admin';

    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('Semua Form');

    // Visibility Settings State
    const [showModal, setShowModal] = useState(false);
    const [availableDepts, setAvailableDepts] = useState([]);
    const [selectedDepts, setSelectedDepts] = useState([]);
    const [saving, setSaving] = useState(false);

    const iconMap = {
        Wrench,
        UserCheck,
        Truck,
        ClipboardCheck,
        Laptop
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/goform/list');
            setForms(response.data.forms || []);
        } catch (error) {
            console.error('Error fetching goforms:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepts = async () => {
        try {
            const response = await axios.get('/api/master-data/department');
            setAvailableDepts(response.data.departments || []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    useEffect(() => {
        fetchData();
        if (isSuperAdmin) fetchDepts();
    }, [isSuperAdmin]);

    const handleOpenSettings = (form) => {
        setSelectedForm(form);
        const currentDepts = form.section ? form.section.split(',').map(s => s.trim()) : [];
        setSelectedDepts(currentDepts);
        setShowModal(true);
    };

    const handleSaveVisibility = async () => {
        setSaving(true);
        try {
            const params = new URLSearchParams();
            params.append('form_id', selectedForm.form_id);
            params.append('sections', selectedDepts.join(', '));
            
            await axios.post('/api/goform/update-visibility', params);
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error updating visibility:', error);
            alert('Gagal mengupdate visibilitas form.');
        } finally {
            setSaving(false);
        }
    };

    const toggleDept = (deptName) => {
        if (selectedDepts.includes(deptName)) {
            setSelectedDepts(selectedDepts.filter(d => d !== deptName));
        } else {
            setSelectedDepts([...selectedDepts, deptName]);
        }
    };
    const categories = ['Semua Form', ...new Set(forms.map(f => f.category))];

    const filteredForms = forms.filter(form => {
        const matchesSearch = form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            form.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'Semua Form' || form.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="page-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.5rem' }}>GoForm</h1>
                    <p style={{ color: 'var(--text-light)' }}>Pilih formulir untuk diisi dan akan otomatis tersimpan dalam sistem eDoc.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.25rem 1rem', width: '300px' }}>
                    <Search size={18} color="var(--text-light)" style={{ marginRight: '0.75rem' }} />
                    <input
                        type="text"
                        placeholder="Cari formulir..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', padding: '0.6rem 0', fontWeight: 500 }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '50px',
                            background: activeCategory === cat ? 'var(--text-main)' : 'white',
                            color: activeCategory === cat ? 'white' : 'var(--text-light)',
                            border: '1px solid',
                            borderColor: activeCategory === cat ? 'var(--text-main)' : 'var(--border)',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
                    <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                    {filteredForms.map(form => {
                        const IconComponent = iconMap[form.icon] || FileText;
                        return (
                            <div key={form.form_id} className="chart-container" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'default', position: 'relative', border: '1px solid #eef2f6', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.05)'} onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}>
                                {isSuperAdmin && (
                                    <button
                                        onClick={() => handleOpenSettings(form)}
                                        style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', padding: '0.5rem', borderRadius: '10px', background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}
                                        title="Settings Visibility"
                                        onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = 'var(--primary)'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8'; }}
                                    >
                                        <Settings size={18} />
                                    </button>
                                )}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${form.color}15`, color: form.color, transition: 'transform 0.2s' }} className="form-icon-container">
                                            <IconComponent size={28} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.25rem 0.625rem', borderRadius: '6px', background: '#f1f5f9', color: '#475569', alignSelf: 'flex-start', letterSpacing: '0.05em' }}>
                                                {form.category}
                                            </span>
                                            {form.section && (
                                                <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 700 }}>
                                                    🔒 {form.section}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: '#1e293b' }}>{form.name}</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', lineHeight: 1.6, marginBottom: '2rem', height: '3.2rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{form.description}</p>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
                                        <FileText size={14} /> PDF Format
                                    </div>
                                    <Link
                                        to={`/goform/fill/${form.form_id}`}
                                        className="btn-fill"
                                        style={{
                                            padding: '0.625rem 1.25rem',
                                            background: 'white',
                                            border: '1.5px solid #e2e8f0',
                                            borderRadius: '12px',
                                            color: '#1e293b',
                                            fontSize: '0.875rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.625rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#1e293b'; }}
                                    >
                                        Isi Formulir <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Form Visibility</h3>
                                <p style={{ margin: 0, fontSize: '0.813rem', color: '#64748b', fontWeight: 500 }}>{selectedForm?.name}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <div style={{ padding: '2rem' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '1.25rem' }}>Select departments that can access this form:</p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                <button
                                    onClick={() => setSelectedDepts([])}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '1rem',
                                        borderRadius: '16px',
                                        border: '2px solid',
                                        borderColor: selectedDepts.length === 0 ? 'var(--primary)' : '#f1f5f9',
                                        background: selectedDepts.length === 0 ? 'rgba(30, 89, 197, 0.04)' : 'white',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid', borderColor: selectedDepts.length === 0 ? 'var(--primary)' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedDepts.length === 0 ? 'var(--primary)' : 'transparent' }}>
                                        {selectedDepts.length === 0 && <Check size={14} color="white" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, color: selectedDepts.length === 0 ? 'var(--primary)' : '#1e293b' }}>All Departments</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Form will be visible to everyone.</div>
                                    </div>
                                </button>

                                {availableDepts.map(dept => {
                                    const isSelected = selectedDepts.includes(dept.Name);
                                    return (
                                        <button
                                            key={dept.ID}
                                            onClick={() => toggleDept(dept.Name)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                padding: '1rem',
                                                borderRadius: '16px',
                                                border: '2px solid',
                                                borderColor: isSelected ? 'var(--primary)' : '#f1f5f9',
                                                background: isSelected ? 'rgba(30, 89, 197, 0.04)' : 'white',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid', borderColor: isSelected ? 'var(--primary)' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--primary)' : 'transparent' }}>
                                                {isSelected && <Check size={14} color="white" />}
                                            </div>
                                            <span style={{ fontWeight: 700, color: isSelected ? 'var(--primary)' : '#1e293b' }}>{dept.Name}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>Batal</button>
                                <button
                                    onClick={handleSaveVisibility}
                                    disabled={saving}
                                    style={{ flex: 2, padding: '1rem', borderRadius: '16px', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', boxShadow: '0 4px 12px rgba(30, 89, 197, 0.25)' }}
                                >
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                    Simpan Perubahan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoForm;
