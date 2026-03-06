import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    User,
    Mail,
    Shield,
    ShieldCheck,
    Camera,
    Lock,
    Save,
    Loader2,
    CheckCircle2,
    PenTool
} from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSave = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }, 1500);
    };

    return (
        <div className="page-content">
            <div className="dashboard-header" style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>My Profile</h1>
                <p style={{ color: 'var(--text-light)' }}>Kelola informasi pribadi dan keamanan akun Anda.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Left Side: Avatar & Basic Info */}
                <div className="chart-container" style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto 1.5rem' }}>
                        <img
                            src={user?.avatar ? `/public/uploads/avatars/${user.avatar}` : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                            alt="Avatar"
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--white)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <button style={{
                            position: 'absolute',
                            bottom: '5px',
                            right: '5px',
                            background: 'var(--primary)',
                            color: 'white',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(30, 89, 197, 0.4)',
                            border: '2px solid white'
                        }}>
                            <Camera size={18} />
                        </button>
                    </div>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{user?.name || user?.username || 'Admin User'}</h2>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', marginBottom: '1.5rem', textTransform: 'capitalize' }}>{user?.role || 'Administrator'}</p>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                            <Mail size={16} color="var(--text-light)" />
                            <span>{user?.username}@scisi.com</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                            <Shield size={16} color="var(--text-light)" />
                            <span style={{ textTransform: 'capitalize' }}>Role: {user?.role || 'Admin'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 600 }}>
                            <ShieldCheck size={16} />
                            <span>Account Verified</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Detailed Info & Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* General Information */}
                    <div className="chart-container" style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <User size={20} color="var(--primary)" /> Informasi Umum
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Full Name</label>
                                <input
                                    type="text"
                                    defaultValue={user?.name || user?.username}
                                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Username</label>
                                <input
                                    type="text"
                                    defaultValue={user?.username}
                                    readOnly
                                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: '#f1f5f9', fontWeight: 600, color: '#94a3b8', cursor: 'not-allowed' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tanda Tangan Digital</label>
                            <div style={{ width: '100%', height: '120px', background: '#f8fafc', border: '2px dashed var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-light)' }}>
                                <PenTool size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Klik untuk ganti tanda tangan</span>
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="chart-container" style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Lock size={20} color="var(--error)" /> Keamanan Akun
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Current Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>New Password</label>
                                <input
                                    type="password"
                                    placeholder="Min. 8 characters"
                                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                        {successMessage && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600, animation: 'fadeIn 0.3s ease' }}>
                                <CheckCircle2 size={18} /> {successMessage}
                            </div>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{
                                padding: '0.875rem 2rem',
                                background: 'var(--primary)',
                                color: 'white',
                                borderRadius: '12px',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                boxShadow: '0 4px 12px rgba(30, 89, 197, 0.3)',
                                transition: 'all 0.2s',
                                opacity: loading ? 0.7 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
