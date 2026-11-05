import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { DataTable, Column } from '../components/DataTable.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentDeptId, setParentDeptId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const list = await api.get('/api/admin/departments');
      setDepartments(list);
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
    setEditingDept(null);
    setName('');
    setDescription('');
    setParentDeptId('');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (d: any) => {
    setEditingDept(d);
    setName(d.name);
    setDescription(d.description || '');
    setParentDeptId(d.parent_dept_id || '');
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingDept) {
        await api.put(`/api/admin/departments/${editingDept.dept_id}`, {
          name,
          description,
          parent_dept_id: parentDeptId === '' ? null : Number(parentDeptId),
        });
      } else {
        await api.post('/api/admin/departments', {
          name,
          description,
          parent_dept_id: parentDeptId === '' ? null : Number(parentDeptId),
          org_id: 1,
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
      await api.delete(`/api/admin/departments/${deleteId}`);
      setDeleteId(null);
      loadData();
    } catch (err: any) {
      setDeleteId(null);
      alert(`Cannot Delete: ${err.message}`);
    }
  };

  const columns: Column<any>[] = [
    { key: 'dept_id', header: 'ID' },
    { key: 'name', header: 'Department Name' },
    { key: 'parent_name', header: 'Parent Department', render: (r) => r.parent_name || '—' },
    { key: 'employee_count', header: 'Assigned Employees', render: (r) => <span className="font-mono">{r.employee_count}</span> },
    { key: 'description', header: 'Description', render: (r) => r.description || '—' },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-sm" onClick={() => openEditModal(r)}>
            Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(r.dept_id)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <div className="panel">Loading departments...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Departments</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Organizational hierarchy and department functional units.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Create Department
        </button>
      </div>

      <DataTable columns={columns} data={departments} />

      {/* Modal */}
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
              {editingDept ? `Edit Department: ${editingDept.name}` : 'Create Department'}
            </h3>

            {error && (
              <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Department Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Parent Department (optional)</label>
                <select
                  value={parentDeptId}
                  onChange={(e) => setParentDeptId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">— None (Top Level) —</option>
                  {departments
                    .filter((d) => !editingDept || d.dept_id !== editingDept.dept_id)
                    .map((d) => (
                      <option key={d.dept_id} value={d.dept_id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.2rem' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Department"
        message="Are you sure you want to delete this department? Deleting will fail if employees or child departments are still attached."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
