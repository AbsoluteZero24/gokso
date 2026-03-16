import React from 'react';
import { AlertCircle, X, Check, Loader2 } from 'lucide-react';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Konfirmasi Hapus",
    message = "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.",
    confirmText = "Hapus",
    cancelText = "Batal",
    type = "danger", // danger, warning, info
    loading = false
}) => {
    if (!isOpen) return null;

    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: <AlertCircle size={28} color="#ef4444" />,
                    bg: 'rgba(239, 68, 68, 0.1)',
                    btn: '#ef4444',
                    btnHover: '#dc2626'
                };
            case 'warning':
                return {
                    icon: <AlertCircle size={28} color="#f59e0b" />,
                    bg: 'rgba(245, 158, 11, 0.1)',
                    btn: '#f59e0b',
                    btnHover: '#d97706'
                };
            default:
                return {
                    icon: <Check size={28} color="var(--primary)" />,
                    bg: 'rgba(30, 89, 197, 0.1)',
                    btn: 'var(--primary)',
                    btnHover: 'var(--primary-dark)'
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(8px)',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <style>
                {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { transform: scale(0.95) translateY(10px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
          .modal-content-anim {
            animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .confirm-btn:hover {
            filter: brightness(0.9);
          }
          .cancel-btn:hover {
            background: #f1f5f9 !important;
          }
        `}
            </style>
            <div
                className="modal-content-anim"
                style={{
                    background: 'white',
                    width: '100%',
                    maxWidth: '440px',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
            >
                <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
                        <button
                            onClick={onClose}
                            style={{ color: '#94a3b8', padding: '0.5rem', borderRadius: '50%', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '20px',
                            background: styles.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem auto'
                        }}>
                            {styles.icon}
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                            {title}
                        </h3>
                        <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '1rem' }}>
                            {message}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {cancelText && (
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="cancel-btn"
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    borderRadius: '16px',
                                    background: '#f8fafc',
                                    color: '#64748b',
                                    fontWeight: 700,
                                    fontSize: '0.938rem',
                                    border: '1px solid #e2e8f0',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="confirm-btn"
                            style={{
                                flex: 1,
                                padding: '1rem',
                                borderRadius: '16px',
                                background: styles.btn,
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.938rem',
                                border: 'none',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: `0 4px 12px ${type === 'danger' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(30, 89, 197, 0.25)'}`
                            }}
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
