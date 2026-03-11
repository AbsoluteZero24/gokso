import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Aset from './pages/Aset';
import Service from './pages/Service';
import Gudang from './pages/Gudang';
import Inactive from './pages/Inactive';
import GoDMS from './pages/GoDMS';
import User from './pages/User';
import Roles from './pages/Roles';
import AssetManagement from './pages/AssetManagement';
import GoForm from './pages/GoForm';
import GoSign from './pages/GoSign';
import MasterBranch from './pages/MasterBranch';
import MasterDepartment from './pages/MasterDepartment';
import MasterPosition from './pages/MasterPosition';
import MasterAssetCategory from './pages/MasterAssetCategory';
import FormBASTLaptop from './pages/FormBASTLaptop';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import Trash from './pages/Trash';
import { Loader2, AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', margin: '2rem' }}>
          <h2 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle /> Something went wrong
          </h2>
          <pre style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', background: '#dc2626', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none' }}
          >
            Retry / Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: '#0f172a' }}>
        <Loader2 className="animate-spin" size={48} color="#1e59c5" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const MainLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={isSidebarCollapsed} onExpand={() => setIsSidebarCollapsed(false)} />
      <div className="main-content">
        <Navbar onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        {children}
        <footer style={{
          padding: '1.5rem 2rem',
          borderTop: '1px solid var(--border)',
          textAlign: 'left',
          fontSize: '0.875rem',
          color: 'var(--text-light)'
        }}>
          Copyright © 2026 <span style={{ color: 'var(--primary)', fontWeight: 600 }}>gokso.</span> All rights reserved.
        </footer>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout><Dashboard /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/inventori/aset-laptop" element={
              <ProtectedRoute>
                <MainLayout><Aset /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/inventori/service" element={
              <ProtectedRoute>
                <MainLayout><Service /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/inventori/gudang" element={
              <ProtectedRoute>
                <MainLayout><Gudang /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/inventori/inactive" element={
              <ProtectedRoute>
                <MainLayout><Inactive /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/inventori/master-data/asset-category" element={
              <ProtectedRoute>
                <MainLayout><MasterAssetCategory /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/asset-management/laptop" element={
              <ProtectedRoute>
                <MainLayout><AssetManagement /></MainLayout>
              </ProtectedRoute>
            } />


            <Route path="/administration/employee" element={
              <ProtectedRoute>
                <MainLayout><User /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/administration/master-data/branch" element={
              <ProtectedRoute>
                <MainLayout><MasterBranch /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/administration/master-data/department" element={
              <ProtectedRoute>
                <MainLayout><MasterDepartment /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/administration/master-data/position" element={
              <ProtectedRoute>
                <MainLayout><MasterPosition /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/goform" element={
              <ProtectedRoute>
                <MainLayout><GoForm /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/gosign" element={
              <ProtectedRoute>
                <MainLayout><GoSign /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/goform/fill/form-bast-laptop" element={
              <ProtectedRoute>
                <MainLayout><FormBASTLaptop /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/goform/fill/form-bast" element={
              <ProtectedRoute>
                <MainLayout><FormBASTLaptop /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/godms" element={<Navigate to="/godms/edoc" replace />} />

            <Route path="/godms/edoc" element={
              <ProtectedRoute>
                <MainLayout><GoDMS /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/godms/edoc/:folderId" element={
              <ProtectedRoute>
                <MainLayout><GoDMS /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/godms/trash" element={
              <ProtectedRoute>
                <MainLayout><Trash /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/setting/user" element={
              <ProtectedRoute>
                <MainLayout><User /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/setting/role" element={
              <ProtectedRoute>
                <MainLayout><Roles /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <MainLayout><Profile /></MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/notifications" element={
              <ProtectedRoute>
                <MainLayout><Notifications /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Catch-all route to redirect back home or to login if not found or unauthorized */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
