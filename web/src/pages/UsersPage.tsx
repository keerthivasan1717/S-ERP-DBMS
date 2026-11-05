import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable, Column } from '../components/DataTable.js';
import { StatusTag } from '../components/StatusTag.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [appRole, setAppRole] = useState('Operational User');
  const [empId, setEmpId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [uList, eList] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/employees'),
      ]);
      setUsers(uList);
      setEmployees(eList);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setAppRole('Operational User');
    setEmpId('');
    setIsActive(true);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setUsername(u.username);
    setPassword('');
    setAppRole(u.app_role);
    setEmpId(u.emp_id || '');
    setIsActive(Boolean(u.is_active));
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingUser) {
        const payload: any = {
          app_role: appRole,
          emp_id: empId === '' ? null : Number(empId),
          is_active: isActive,
        };
        if (password) payload.password = password;
        await api.put(`/api/admin/users/${editingUser.user_id}`, payload);
      } else {
        await api.post('/api/admin/users', {
          username,
          password,
          app_role: appRole,
          emp_id: empId === '' ? null : Number(empId),
          is_active: isActive,
        });
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/admin/users/${deleteId}`);
      setDeleteId(null);
      loadData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const columns: Column<any>[] = [
    { key: 'user_id', header: 'ID' },
    { key: 'username', header: 'Username' },
    { key: 'app_role', header: 'System Role', render: (r) => <StatusTag status={r.app_role} /> },
    { key: 'employee_name', header: 'Linked Employee', render: (r) => r.employee_name || '—' },
    {
      key: 'is_active',
      header: 'Status',
      render: (r) => (
        <span style={{ color: r.is_active ? 'var(--moss)' : 'var(--danger)', fontWeight: 600 }}>
          {r.is_active ? 'Active' : 'Deactivated'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-sm" onClick={() => openEditModal(r)}>
            Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(r.user_id)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <div className="panel">Loading users...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>User Accounts</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Manage access credentials, roles, and employee linkage across the S-ERP system.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Create User
        </button>
      </div>

      <DataTable columns={columns} data={users} />

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(30,36,33,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '1.5rem',
              maxWidth: '480px',
              width: '90%',
            }}
          >
            <h3 style={{ marginBottom: '1rem' }}>
              {editingUser ? `Edit User: ${editingUser.username}` : 'Create New User Account'}
            </h3>

            {error && (
              <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              {!editingUser && (
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label>{editingUser ? 'Reset Password (optional)' : 'Password'}</label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? 'Leave blank to retain current password' : ''}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>System Role</label>
                <select value={appRole} onChange={(e) => setAppRole(e.target.value)}>
                  <option value="Administrator">Administrator</option>
                  <option value="Strategic Manager">Strategic Manager</option>
                  <option value="Tactical Manager">Tactical Manager</option>
                  <option value="Operational User">Operational User</option>
                </select>
              </div>

              <div className="form-group">
                <label>Link to Employee</label>
                <select value={empId} onChange={(e) => setEmpId(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">— Unlinked / None —</option>
                  {employees.map((emp) => (
                    <option key={emp.emp_id} value={emp.emp_id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="activeCheck" style={{ margin: 0, textTransform: 'none' }}>
                  Account is Active
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.2rem' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete User Account"
        message="Are you sure you want to delete this user? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
