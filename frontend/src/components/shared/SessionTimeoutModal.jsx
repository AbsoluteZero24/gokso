import React from 'react';
import { Clock, LogIn, X } from 'lucide-react';

const SessionTimeoutModal = ({ isOpen, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(12px)',
            padding: '1rem',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <style>
                {`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9) translateY(20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                .modal-premium {
                    animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    background: rgba(255, 255, 255, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                .btn-premium {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }
                .btn-premium:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px -4px rgba(30, 89, 197, 0.4);
                    filter: brightness(1.1);
                }
                .btn-premium:active {
                    transform: translateY(0);
                }
                `}
            </style>
            
            <div
                className="modal-premium"
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    borderRadius: '32px',
                    padding: '2.5rem',
                    textAlign: 'center',
                    boxShadow: '0 40px 80px -15px rgba(0, 0, 0, 0.25)',
                    position: 'relative'
                }}
            >
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '24px',
                    background: 'linear-gradient(135deg, rgba(30, 89, 197, 0.1) 0%, rgba(30, 89, 197, 0.05) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem auto',
                    color: 'var(--primary)',
                    boxShadow: 'inset 0 0 0 1px rgba(30, 89, 197, 0.1)'
                }}>
                    <Clock size={40} strokeWidth={1.5} />
                </div>

                <h2 style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: 800, 
                    color: '#0f172a', 
                    marginBottom: '0.75rem',
                    letterSpacing: '-0.02em'
                }}>
                    Sesi Berakhir
                </h2>
                
                <p style={{ 
                    color: '#64748b', 
                    lineHeight: '1.6', 
                    fontSize: '1rem', 
                    marginBottom: '2rem',
                    padding: '0 0.5rem'
                }}>
                    Sesi Anda telah berakhir karena tidak ada aktivitas selama 45 menit. Mohon login kembali untuk melanjutkan.
                </p>

                <button
                    onClick={onConfirm}
                    className="btn-premium"
                    style={{
                        width: '100%',
                        padding: '1.125rem',
                        borderRadius: '20px',
                        background: 'var(--primary)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.063rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem'
                    }}
                >
                    <LogIn size={20} />
                    Login Kembali
                </button>
            </div>
        </div>
    );
};

export default SessionTimeoutModal;
