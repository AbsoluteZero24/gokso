import React, { useState } from 'react';
import { Menu, Search, Bell, Maximize, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    return (
        <nav className="navbar">
            <div className="navbar-left">
                <button><Menu size={20} color="#64748b" /></button>
                <span style={{ fontWeight: 500 }}>Home</span>
            </div>

            <div className="navbar-right">
                <button><Search size={20} color="#64748b" /></button>
                <button><Bell size={20} color="#64748b" /></button>
                <button><Maximize size={20} color="#64748b" /></button>

                <div className="user-profile" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
                    <img
                        src={user?.avatar ? `/public/uploads/avatars/${user.avatar}` : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                        alt="User"
                        className="user-avatar"
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
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            width: '180px',
                            padding: '0.5rem',
                            zIndex: 100
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                                <UserIcon size={16} />
                                <span>My Profile</span>
                            </div>
                            <div
                                onClick={logout}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem', color: '#ef4444' }}
                            >
                                <LogOut size={16} />
                                <span>Logout</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
