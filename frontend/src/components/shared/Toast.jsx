import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const colors = {
        success: {
            bg: '#f0fdf4',
            border: '#dcfce7',
            text: '#166534',
            icon: CheckCircle2,
            iconColor: '#22c55e'
        },
        error: {
            bg: '#fef2f2',
            border: '#fee2e2',
            text: '#991b1b',
            icon: XCircle,
            iconColor: '#ef4444'
        },
        info: {
            bg: '#eff6ff',
            border: '#dbeafe',
            text: '#1e40af',
            icon: Info,
            iconColor: '#3b82f6'
        }
    };

    const config = colors[type] || colors.success;
    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: `1px solid ${config.border}`,
                minWidth: '300px',
                maxWidth: '450px'
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: config.bg,
                flexShrink: 0
            }}>
                <Icon size={18} color={config.iconColor} />
            </div>
            
            <div style={{ flex: 1 }}>
                <p style={{ 
                    margin: 0, 
                    fontSize: '0.875rem', 
                    fontWeight: 600, 
                    color: '#1e293b',
                    lineHeight: 1.4
                }}>
                    {message}
                </p>
            </div>

            <button 
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
            >
                <X size={16} />
            </button>
            
            <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: 0 }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '3px',
                    background: config.iconColor,
                    opacity: 0.3,
                    borderRadius: '0 0 0 16px'
                }}
            />
        </motion.div>
    );
};

export default Toast;
