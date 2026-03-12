import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, Maximize, Minimize, User as UserIcon, LogOut, X, Info, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Navbar = ({ onToggleSidebar }) => {
    const { user, logout } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const profileRef = useRef(null);
    const notificationRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const response = await axios.get('/api/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            // Poll for notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    // Mark all as read
    const markAllRead = async (e) => {
        e.stopPropagation();
        try {
            await axios.post('/api/notifications/mark-read');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const clearNotifications = async (e) => {
        e.stopPropagation();
        if (!window.confirm('Hapus semua notifikasi?')) return;
        try {
            await axios.post('/api/notifications/clear');
            setNotifications([]);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    const handleNotificationClick = async (notif) => {
        // Mark as read first
        if (!notif.is_read) {
            try {
                // We'd need a backend endpoint for marking single notif as read if we want to be precise
                // For now, let's just update local state or mark all if needed.
                // Assuming we might have a single read endpoint or just update local
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            } catch (error) {
                console.error('Error marking notification as read:', error);
            }
        }

        if (notif.link) {
            navigate(notif.link);
            setShowNotifications(false);
        }
    };

    const hasUnread = notifications.some(n => !n.is_read);


    // Fullscreen Toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Close menus on navigation
    useEffect(() => {
        setShowProfileMenu(false);
        setShowNotifications(false);
        setShowSearch(false);
    }, [location]);


    return (
        <nav className="navbar">
            <div className="navbar-left">
                <button type="button" onClick={(e) => { e.preventDefault(); onToggleSidebar(); }} style={{ padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s' }}>
                    <Menu size={20} color="#64748b" />
                </button>
            </div>

            <div className="navbar-right">
                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                    {showSearch ? (
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '20px', padding: '0.25rem 0.75rem', animation: 'fadeIn 0.2s ease' }}>
                            <Search size={16} color="var(--primary)" />
                            <input
                                type="text"
                                placeholder="Search..."
                                autoFocus
                                style={{ border: 'none', background: 'transparent', outline: 'none', padding: '0.25rem 0.5rem', width: '150px', fontSize: '0.875rem' }}
                            />
                            <button onClick={() => setShowSearch(false)} style={{ padding: '0.25rem' }}><X size={14} color="#ef4444" /></button>
                        </div>
                    ) : (
                        <button type="button" onClick={(e) => { e.preventDefault(); setShowSearch(true); }}><Search size={20} color="#64748b" /></button>
                    )}
                </div>

                {/* Notifications */}
                <div style={{ position: 'relative' }} ref={notificationRef}>
                    <button type="button" onClick={(e) => { e.preventDefault(); setShowNotifications(!showNotifications); }} style={{ position: 'relative' }}>
                        <Bell size={20} color="#64748b" />
                        {hasUnread && (
                            <span style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div style={{
                            position: 'absolute',
                            top: '140%',
                            right: -10,
                            background: 'white',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            width: '320px',
                            zIndex: 100,
                            animation: 'slideUp 0.2s ease-out',
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, fontSize: '1rem' }}>Notifications</span>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <span
                                        onClick={markAllRead}
                                        style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' }}
                                        className="hover-opacity"
                                    >
                                        Mark all read
                                    </span>
                                    <span
                                        onClick={clearNotifications}
                                        style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' }}
                                        className="hover-opacity"
                                    >
                                        Clear
                                    </span>
                                </div>
                            </div>
                            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                {notifications.length > 0 ? (
                                    notifications.map(notif => (
                                        <div 
                                            key={notif.id} 
                                            onClick={() => handleNotificationClick(notif)}
                                            style={{
                                                padding: '1.25rem 1rem',
                                                borderBottom: '1px solid #f1f5f9',
                                                display: 'flex',
                                                gap: '1rem',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s',
                                                background: notif.is_read ? 'white' : 'rgba(30, 89, 197, 0.03)',
                                                position: 'relative'
                                            }} 
                                            className="profile-menu-item"
                                        >
                                            <div style={{ 
                                                width: '40px', 
                                                height: '40px', 
                                                borderRadius: '12px', 
                                                background: notif.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(30, 89, 197, 0.1)', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                flexShrink: 0 
                                            }}>
                                                <Info size={20} color={notif.type === 'success' ? '#10b981' : 'var(--primary)'} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, margin: 0, color: notif.is_read ? '#475569' : '#1e293b' }}>{notif.title}</p>
                                                    {!notif.is_read && <div style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%' }}></div>}
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{notif.message}</p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                                    <p style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600 }}>
                                                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {notif.link && (
                                                        <span style={{ fontSize: '0.625rem', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                            Buka <ArrowUpRight size={10} />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                                        <Bell size={32} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                                        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No new notifications</p>
                                    </div>
                                )}
                            </div>
                            <Link
                                to="/notifications"
                                style={{ padding: '1rem', textAlign: 'center', background: '#f8fafc', display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-light)', borderTop: '1px solid var(--border)', textDecoration: 'none' }}
                                className="profile-menu-item"
                            >
                                View all notifications
                            </Link>
                        </div>
                    )}
                </div>

                {/* Fullscreen Toggle */}
                <button type="button" onClick={(e) => { e.preventDefault(); toggleFullscreen(); }}>
                    {isFullscreen ? <Minimize size={20} color="#64748b" /> : <Maximize size={20} color="#64748b" />}
                </button>

                {/* Profile Dropdown */}
                <div className="user-profile"
                    ref={profileRef}
                    style={{ position: 'relative', cursor: 'pointer' }}
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                    <img
                        src={user?.avatar ? `/public/uploads/avatars/${user.avatar}` : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                        alt="User"
                        className="user-avatar"
                        style={{ border: '2px solid transparent', transition: 'border-color 0.2s' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.name || user?.username || 'Useradmin'}</span>
                    </div>

                    {showProfileMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '120%',
                            right: 0,
                            background: 'white',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            width: '200px',
                            padding: '0.5rem',
                            zIndex: 100,
                            animation: 'slideUp 0.2s ease-out'
                        }}>
                            <style>{`
                                @keyframes slideUp {
                                    from { opacity: 0; transform: translateY(10px); }
                                    to { opacity: 1; transform: translateY(0); }
                                }
                                @keyframes fadeIn {
                                    from { opacity: 0; transform: scale(0.95); }
                                    to { opacity: 1; transform: scale(1); }
                                }
                            `}</style>
                            <Link
                                to="/profile"
                                className="profile-menu-item"
                                onClick={(e) => e.stopPropagation()}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.875rem', color: 'var(--text-main)', textDecoration: 'none' }}
                            >
                                <UserIcon size={16} />
                                <span style={{ fontWeight: 600 }}>My Profile</span>
                            </Link>
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    logout();
                                }}
                                className="logout-item"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '10px',
                                    fontSize: '0.875rem',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    marginTop: '0.25rem'
                                }}
                            >
                                <LogOut size={16} />
                                <span style={{ fontWeight: 600 }}>Logout</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
