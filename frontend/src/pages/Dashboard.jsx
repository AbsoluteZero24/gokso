import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, CircleArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const fadeIn = `
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
`;

const StatCard = ({ color, value, label, footer }) => (
    <div className={`stat-card ${color}`}>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        <div className="stat-footer">
            {footer} <CircleArrowRight size={20} />
        </div>
    </div>
);

const Dashboard = () => {
    const { user: authUser } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('/api/dashboard');
                setData(response.data);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    const { totalAssets, readyAssets, brokenAssets, totalEmployees, categoryStats, statusStats } = data || {
        totalAssets: 0, readyAssets: 0, brokenAssets: 0, totalEmployees: 0, categoryStats: [], statusStats: []
    };

    const barData = categoryStats.map(item => ({ name: item.category, count: item.count }));

    const statusColors = {
        'Ready': '#10b981',
        'Rusak': '#ef4444',
        'Maintenance': '#f59e0b',
    };

    const pieData = statusStats.map(item => ({
        name: item.status,
        value: item.count,
        color: statusColors[item.status] || '#64748b'
    }));

    return (
        <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
            <style>{fadeIn}</style>
            <div className="dashboard-header" style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Welcome Back, {authUser?.username || 'User'}</h1>
                <p style={{ color: 'var(--text-light)', fontSize: '1.125rem' }}>Sistem Manajemen Aset & Inventori GoKSO</p>
            </div>

            <div className="stats-grid">
                <StatCard color="blue" value={totalAssets} label="Total Aset" footer="Detail Inventory" />
                <StatCard color="green" value={readyAssets} label="Aset Kondisi Baik" footer="Lihat Stok" />
                <StatCard color="red" value={brokenAssets} label="Aset Perlu Perbaikan" footer="Review Rusak" />
                <StatCard color="yellow" value={totalEmployees} label="Total Karyawan" footer="Daftar Karyawan" />
            </div>

            <div className="charts-grid">
                <div className="chart-container">
                    <div className="chart-header">
                        <BarChart3 className="chart-icon" size={20} />
                        <span>Distribusi Kategori Aset</span>
                    </div>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" fill="#1e59c5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-container">
                    <div className="chart-header">
                        <PieChartIcon className="chart-icon" size={20} />
                        <span>Status Kondisi Aset</span>
                    </div>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                        {pieData.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }}></div>
                                <span>{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
