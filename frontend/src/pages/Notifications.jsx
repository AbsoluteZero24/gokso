import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Bell,
    CheckCheck,
    Trash2,
    Info,
    AlertCircle,
    Clock,
    Search,
    ChevronRight,
    Filter,
    Loader2
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        isLoading: false
    });

    const fetchNotifications = async () => {
        try {
            const response = await axios.get('/api/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAllRead = async () => {
        try {
            await axios.post('/api/notifications/mark-read');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const clearAll = () => {
        setConfirmModal({ isOpen: true, isLoading: false });
    };

    const handleConfirmClear = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
            await axios.post('/api/notifications/clear');
            setNotifications([]);
            setConfirmModal({ isOpen: false, isLoading: false });
        } catch (error) {
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
            console.error('Error clearing notifications:', error);
        }
    };

    const getTypeStyles = (type) => {
        switch (type) {
            case 'warning': return { bg: 'rgba(245, 158, 11, 0.1)', icon: <AlertCircle size={20} color="#f59e0b" /> };
            case 'success': return { bg: 'rgba(16, 185, 129, 0.1)', icon: <CheckCheck size={20} color="#10b981" /> };
            default: return { bg: 'rgba(30, 89, 197, 0.1)', icon: <Info size={20} color="var(--primary)" /> };
        }
    };

    if (loading) {
        return (
            <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={40} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="dashboard-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Notifications</h1>
                    <p style={{ color: 'var(--text-light)' }}>Stay updated with your latest activities and system alerts.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={markAllRead}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                    >
                        <CheckCheck size={16} /> Mark all read
                    </button>
                    <button
                        onClick={clearAll}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}
                    >
                        <Trash2 size={16} /> Clear all
                    </button>
                </div>
            </div>

            <div className="chart-container" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Filter Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-light)' }}>
                        <span style={{ color: 'var(--primary)', borderBottom: '2px solid var(--primary)', paddingBottom: '1.25rem', marginBottom: '-1.25rem' }}>All ({notifications.length})</span>
                        <span>Unread ({notifications.filter(n => !n.is_read).length})</span>
                        <span>Archive</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                style={{ padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8125rem', width: '220px', outline: 'none' }}
                            />
                        </div>
                        <Filter size={18} color="#64748b" style={{ cursor: 'pointer' }} />
                    </div>
                </div>

                {/* List */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {notifications.length > 0 ? (
                        notifications.map((notif) => {
                            const styles = getTypeStyles(notif.type);
                            return (
                                <div
                                    key={notif.id}
                                    style={{
                                        padding: '1.5rem',
                                        borderBottom: '1px solid #f1f5f9',
                                        display: 'flex',
                                        gap: '1.25rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: notif.is_read ? 'white' : 'rgba(30, 89, 197, 0.02)',
                                        position: 'relative'
                                    }}
                                    className="profile-menu-item"
                                >
                                    {!notif.is_read && (
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--primary)' }}></div>
                                    )}
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '14px',
                                        background: styles.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {styles.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{notif.title}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                <Clock size={12} /> {new Date(notif.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{notif.message}</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', opacity: 0.3 }} className="chevron-right">
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                            <Bell size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                            <p style={{ fontWeight: 600 }}>No notifications found</p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmClear}
                loading={confirmModal.isLoading}
                title="Hapus Semua Notifikasi"
                message="Apakah Anda yakin ingin menghapus semua notifikasi? Tindakan ini tidak dapat dibatalkan."
            />
        </div>
    );
};

export default Notifications;
