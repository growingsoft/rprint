import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Print } from './pages/Print';
import { Servers } from './pages/Servers';
import { Clients } from './pages/Clients';
import { Users } from './pages/Users';
import { Dashboard } from './pages/Dashboard';
import { Downloads } from './pages/Downloads';
import { ClientDownload } from './pages/ClientDownload';
import { AdminPrinters } from './pages/AdminPrinters';
import { ApiKeys } from './pages/ApiKeys';
import { ApiToken } from './pages/ApiToken';
import { ApiDocs } from './pages/ApiDocs';
import { Workers } from './pages/Workers';
import { Layout } from './components/Layout';
import { api } from './services/api';
import './styles/App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return api.isAuthenticated() ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/client-download" element={<ClientDownload />} />

        {/* New main navigation */}
        <Route
          path="/print"
          element={
            <ProtectedRoute>
              <Print />
            </ProtectedRoute>
          }
        />
        <Route
          path="/servers"
          element={
            <ProtectedRoute>
              <Servers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <Clients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          }
        />

        {/* Legacy/admin routes */}
        <Route
          path="/admin/printers"
          element={
            <ProtectedRoute>
              <AdminPrinters />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/api-keys"
          element={
            <ProtectedRoute>
              <ApiKeys />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/workers"
          element={
            <ProtectedRoute>
              <Workers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/api-token"
          element={
            <ProtectedRoute>
              <ApiToken />
            </ProtectedRoute>
          }
        />
        <Route
          path="/api-docs"
          element={
            <ProtectedRoute>
              <ApiDocs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Default route to Print page */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Print />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
