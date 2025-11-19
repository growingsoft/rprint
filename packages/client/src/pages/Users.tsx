import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../styles/Users.css';

interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clients');
      setUsers(response.data.clients || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      setError('');
      await api.put(`/clients/${userId}/role`, { role: newRole });
      // Reload users after role change
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to change role:', err);
      setError(err.response?.data?.error || 'Failed to change user role');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      await api.delete(`/clients/${userId}`);
      // Reload users after deletion
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="users-page">
        <div className="page-header">
          <h1>User Management</h1>
        </div>
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>User Management</h1>
        <p className="page-description">Manage user accounts and roles</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="users-grid">
        {users.map((user) => (
          <div key={user.id} className="user-card">
            <div className="user-header">
              <div className="user-info">
                <h3>{user.displayName}</h3>
                <p className="user-username">@{user.username}</p>
                {user.email && <p className="user-email">{user.email}</p>}
              </div>
              <div className={`user-role-badge ${user.role}`}>
                {user.role}
              </div>
            </div>

            <div className="user-meta">
              <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="user-actions">
              <select
                value={user.role}
                onChange={(e) => handleChangeRole(user.id, e.target.value as 'admin' | 'user')}
                className="role-select"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>

              <button
                onClick={() => handleDeleteUser(user.id, user.username)}
                className="delete-button"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && !loading && (
        <div className="no-users">
          <p>No users found</p>
        </div>
      )}
    </div>
  );
};
