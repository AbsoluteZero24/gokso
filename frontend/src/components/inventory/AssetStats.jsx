import React from 'react';
import { Database, Laptop as LaptopIcon, Monitor, Shield } from 'lucide-react';

const AssetStats = ({ stats }) => {
    const statItems = [
        { label: 'Total Aset', value: stats.total, icon: Database, color: '#3b82f6' },
        { label: 'Laptops', value: stats.laptop, icon: LaptopIcon, color: '#8b5cf6' },
        { label: 'Komputer', value: stats.computer, icon: Monitor, color: '#06b6d4' },
        { label: 'Lainnya', value: stats.others, icon: Shield, color: '#10b981' }
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {statItems.map((item, idx) => (
                <div key={idx} className="chart-container" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ background: `${item.color}15`, color: item.color, padding: '1rem', borderRadius: '16px' }}>
                        <item.icon size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.25rem' }}>{item.label}</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{item.value}</h3>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AssetStats;
