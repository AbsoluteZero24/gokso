import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
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
    PenTool,
    RotateCcw,
    X,
    AlertCircle
} from 'lucide-react';

const Profile = () => {
    const { user, checkAuth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null); // { message, type: 'success' | 'error' }
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signatureMode, setSignatureMode] = useState(''); // 'signature' or 'paraf'
    
    const signaturePadRef = useRef(null);

    const handleSaveProfile = () => {
        setLoading(true);
        // This is just a simulation for now, as the current backend doesn't have a JSON endpoint for multi-field profil update (except password/avatar)
        setTimeout(() => {
            setLoading(false);
            showNotification('Profile updated successfully!', 'success');
            checkAuth();
        }, 1500);
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const openSignatureModal = (mode) => {
        setSignatureMode(mode);
        setShowSignatureModal(true);
    };

    const clearSignature = () => {
        if (signaturePadRef.current) {
            signaturePadRef.current.clear();
        }
    };

    const saveSignature = async () => {
        if (signaturePadRef.current.isEmpty()) {
            return alert('Harap berikan tanda tangan/paraf terlebih dahulu.');
        }

        setLoading(true);
        try {
            // Use getCanvas() as getTrimmedCanvas() might fail in some envs
            const dataUrl = signaturePadRef.current.getCanvas().toDataURL('image/png');
            
            // Convert to BLOB for upload
            const blob = await (await fetch(dataUrl)).blob();
            
            const formData = new FormData();
            formData.append('file', blob, `${signatureMode}.png`);
            formData.append('mode', signatureMode);

            const response = await axios.post('/api/profile/update-signature-paraf', formData);
            
            if (response.data.message) {
                showNotification(`${signatureMode === 'signature' ? 'Tanda tangan' : 'Paraf'} berhasil disimpan!`, 'success');
                setShowSignatureModal(false);
                await checkAuth(); // Refresh user data to show new signature
            }
        } catch (error) {
            console.error('Error saving signature:', error);
            const errorData = error.response?.data;
            const errorMsg = typeof errorData === 'string' ? errorData : errorData?.error;
            const finalMsg = errorMsg || error.message || 'Gagal menyimpan tanda tangan/paraf.';
            showNotification(finalMsg, 'error');
        } finally {
            setLoading(false);
        }
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
                            <span>{user?.email || user?.username || 'user'}</span>
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
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Login Identity (Email / NIK)</label>
                                <input
                                    type="text"
                                    value={user?.username || ''}
                                    readOnly
                                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: '#f1f5f9', fontWeight: 600, color: '#94a3b8', cursor: 'not-allowed' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tanda Tangan Digital</label>
                                <div 
                                    onClick={() => openSignatureModal('signature')}
                                    style={{ 
                                        width: '100%', 
                                        height: '140px', 
                                        background: '#f8fafc', 
                                        border: '2px dashed var(--border)', 
                                        borderRadius: '12px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        flexDirection: 'column', 
                                        color: 'var(--text-light)',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}
                                >
                                    {user?.signature ? (
                                        <div style={{ width: '100%', height: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
                                            <img 
                                                src={`/public/uploads/signatures/${user.signature}`} 
                                                alt="Signature" 
                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                                            />
                                            <div style={{ 
                                                position: 'absolute', 
                                                bottom: '0', 
                                                width: '100%', 
                                                textAlign: 'center', 
                                                padding: '5px', 
                                                background: 'rgba(0,0,0,0.05)', 
                                                fontSize: '0.65rem',
                                                fontWeight: 800
                                            }}>KLIK UNTUK GANTI</div>
                                        </div>
                                    ) : (
                                        <>
                                            <PenTool size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Klik untuk buat tanda tangan</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Paraf</label>
                                <div 
                                    onClick={() => openSignatureModal('paraf')}
                                    style={{ 
                                        width: '100%', 
                                        height: '140px', 
                                        background: '#f8fafc', 
                                        border: '2px dashed var(--border)', 
                                        borderRadius: '12px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        flexDirection: 'column', 
                                        color: 'var(--text-light)',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}
                                >
                                    {user?.paraf ? (
                                        <div style={{ width: '100%', height: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
                                            <img 
                                                src={`/public/uploads/parafs/${user.paraf}`} 
                                                alt="Paraf" 
                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                                            />
                                            <div style={{ 
                                                position: 'absolute', 
                                                bottom: '0', 
                                                width: '100%', 
                                                textAlign: 'center', 
                                                padding: '5px', 
                                                background: 'rgba(0,0,0,0.05)', 
                                                fontSize: '0.65rem',
                                                fontWeight: 800
                                            }}>GANTI</div>
                                        </div>
                                    ) : (
                                        <>
                                            <PenTool size={24} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                                            <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Paraf Baru</span>
                                        </>
                                    )}
                                </div>
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

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={handleSaveProfile}
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

            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        style={{
                            position: 'fixed',
                            top: '20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 10000,
                            padding: '1rem 2rem',
                            borderRadius: '16px',
                            background: notification.type === 'success' ? '#10b981' : '#ef4444',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                            fontWeight: 700
                        }}
                    >
                        {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Signature Pad Modal */}
            <AnimatePresence>
                {showSignatureModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(8px)'
                        }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            style={{
                                background: 'white',
                                width: '540px',
                                padding: '2.5rem',
                                borderRadius: '32px',
                                boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}
                        >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                                {signatureMode === 'signature' ? 'Buat Tanda Tangan' : 'Buat Paraf'}
                            </h3>
                            <button 
                                onClick={() => setShowSignatureModal(false)}
                                style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ 
                            border: '2px solid #e2e8f0', 
                            borderRadius: '16px', 
                            overflow: 'hidden', 
                            background: '#f8fafc',
                            marginBottom: '1.5rem'
                        }}>
                            <SignatureCanvas 
                                ref={signaturePadRef}
                                penColor="black"
                                canvasProps={{
                                    width: 436,
                                    height: 250,
                                    className: 'sigCanvas'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                            <button
                                onClick={clearSignature}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: '#f1f5f9',
                                    color: 'var(--text-main)',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <RotateCcw size={18} /> Ulangi
                            </button>
                            
                            <button
                                onClick={saveSignature}
                                disabled={loading}
                                style={{
                                    padding: '0.75rem 2rem',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    boxShadow: '0 4px 12px rgba(30, 89, 197, 0.3)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                Simpan {signatureMode === 'signature' ? 'Tanda Tangan' : 'Paraf'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            <style>{`
                @keyframes modalSlideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .sigCanvas {
                    cursor: crosshair;
                }
            `}</style>
        </div>
    );
};

export default Profile;
