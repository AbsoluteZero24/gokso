import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import SessionTimeoutModal from '../components/SessionTimeoutModal';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTimeoutModal, setShowTimeoutModal] = useState(false);

    const checkAuth = async () => {
        try {
            const response = await axios.get('/api/check-auth');
            setUser(response.data);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (username, password) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await axios.post('/api/login', formData);
            await checkAuth();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.error || 'Login failed'
            };
        }
    };

    const logout = async (reason = '') => {
        try {
            await axios.get('/api/logout', { headers: { 'Accept': 'application/json' } });
            setUser(null);
            if (reason === 'timeout') {
                setShowTimeoutModal(true);
            } else if (reason) {
                alert(reason);
            }
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // Inactivity Timer Logic
    useEffect(() => {
        if (!user) return;

        let idleTimer;
        // 45 minutes in milliseconds
        const IDLE_TIMEOUT = 45 * 60 * 1000;

        const handleIdle = () => {
            logout("timeout");
        };

        const resetTimer = () => {
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(handleIdle, IDLE_TIMEOUT);
        };

        // Events to track user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        // Initial start
        resetTimer();

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            if (idleTimer) clearTimeout(idleTimer);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
            {children}
            <SessionTimeoutModal
                isOpen={showTimeoutModal}
                onConfirm={() => setShowTimeoutModal(false)}
            />
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
