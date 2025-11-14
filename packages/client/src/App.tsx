import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Downloads } from './pages/Downloads';
import { ClientDownload } from './pages/ClientDownload';
import { AdminPrinters } from './pages/AdminPrinters';
import { api } from './services/api';
import './styles/App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return api.isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/client-download" element={<ClientDownload />} />
        <Route
          path="/admin/printers"
          element={
            <ProtectedRoute>
              <AdminPrinters />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
