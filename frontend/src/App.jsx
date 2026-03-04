import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import AssetKSOList from './pages/AssetKSOList';
import EmployeeList from './pages/EmployeeList';
import GDMS from './pages/GDMS';
import UserManagement from './pages/UserManagement';
import LaptopManagement from './pages/LaptopManagement';
import GoForm from './pages/GoForm';
import MaintenanceLaptop from './pages/MaintenanceLaptop';
import MasterBranch from './pages/MasterBranch';
import MasterDepartment from './pages/MasterDepartment';
import FormBASTLaptop from './pages/FormBASTLaptop';
import MaintenanceHistory from './pages/MaintenanceHistory';
import MaintenanceHistoryDetail from './pages/MaintenanceHistoryDetail';
import Login from './pages/Login';
import { Loader2 } from 'lucide-react';

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

const MainLayout = ({ children }) => (
  <div className="app-container">
    <Sidebar />
    <div className="main-content">
      <Navbar />
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

function App() {
  return (
    <Router>
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
              <MainLayout><AssetKSOList /></MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/asset-management/laptop" element={
            <ProtectedRoute>
              <MainLayout><LaptopManagement /></MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/maintenance/laptop" element={
            <ProtectedRoute>
              <MainLayout><MaintenanceLaptop /></MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/maintenance/history" element={
            <ProtectedRoute>
              <MainLayout><MaintenanceHistory /></MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/maintenance/history/detail/:id" element={
            <ProtectedRoute>
              <MainLayout><MaintenanceHistoryDetail /></MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/administration/employee" element={
            <ProtectedRoute>
              <MainLayout><EmployeeList /></MainLayout>
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

          <Route path="/goform" element={
            <ProtectedRoute>
              <MainLayout><GoForm /></MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/goform/fill/form-bast-laptop" element={
            <ProtectedRoute>
              <MainLayout><FormBASTLaptop /></MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/godms/doc" element={
            <ProtectedRoute>
              <MainLayout><GDMS /></MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/godms/doc/:folderId" element={
            <ProtectedRoute>
              <MainLayout><GDMS /></MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/setting/user" element={
            <ProtectedRoute>
              <MainLayout><UserManagement /></MainLayout>
            </ProtectedRoute>
          } />

          {/* Catch-all route to redirect back home or to login if not found or unauthorized */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
