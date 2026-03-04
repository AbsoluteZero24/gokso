import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FileText,
    Search,
    Loader2,
    ArrowRight,
    Wrench,
    UserCheck,
    Truck,
    ClipboardCheck,
    Laptop
} from 'lucide-react';
import { Link } from 'react-router-dom';

const GoForm = () => {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('Semua Form');

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
            setForms(response.data.forms);
        } catch (error) {
            console.error('Error fetching goforms:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {filteredForms.map(form => {
                        const IconComponent = iconMap[form.icon] || FileText;
                        return (
                            <div key={form.id} className="chart-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'default' }}>
                                <div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.25rem 0.75rem', borderRadius: '50px', background: '#f1f5f9', color: '#475569', display: 'inline-block', marginBottom: '1rem' }}>
                                        {form.category}
                                    </span>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${form.color}15`, color: form.color, marginBottom: '1.25rem' }}>
                                        <IconComponent size={24} />
                                    </div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>{form.name}</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', lineHeight: 1.5, marginBottom: '1.5rem' }}>{form.description}</p>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <FileText size={14} /> PDF Format
                                    </div>
                                    <Link
                                        to={`/goform/fill/${form.id}`}
                                        className="btn-fill"
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                            color: 'var(--text-main)',
                                            fontSize: '0.813rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        Isi Formulir <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GoForm;
