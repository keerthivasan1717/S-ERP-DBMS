import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client.js';
import { DataTable, Column } from '../components/DataTable.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

interface Department {
  dept_id: number;
  name: string;
  description?: string;
  parent_dept_id?: number | null;
  parent_name?: string | null;
  employee_count: number;
  org_id: number;
}

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [editingDept, setEditingDept] = useState<Department | null>(null);
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

  const openEditModal = (d: Department) => {
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

  // Build department hierarchy tree
  const treeNodes = useMemo(() => {
    const byParent: Record<number | string, Department[]> = {};
    for (const d of departments) {
      const pKey = d.parent_dept_id != null ? d.parent_dept_id : 'root';
      if (!byParent[pKey]) byParent[pKey] = [];
      byParent[pKey].push(d);
    }
    return byParent;
  }, [departments]);

  const renderTree = (parentId: number | string = 'root', depth = 0): React.ReactNode => {
    const children = treeNodes[parentId] || [];
    if (children.length === 0) return null;

    return (
      <div style={{ marginLeft: depth > 0 ? '1.5rem' : 0 }}>
        {children.map((child) => (
          <div key={child.dept_id} style={{ marginBottom: '0.4rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.3rem 0.6rem',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                fontSize: '0.85rem',
              }}
            >
              <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                #{child.dept_id}
              </span>
              <strong>{child.name}</strong>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--ink-soft)',
                  backgroundColor: 'var(--paper)',
                  padding: '0.1rem 0.4rem',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {child.employee_count} {Number(child.employee_count) === 1 ? 'employee' : 'employees'}
              </span>
              {child.description && (
                <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  — {child.description}
                </span>
              )}
            </div>
            {renderTree(child.dept_id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  const columns: Column<Department>[] = [
    { key: 'dept_id', header: 'ID' },
    { key: 'name', header: 'Department Name' },
    { key: 'parent_name', header: 'Parent Department', render: (r) => r.parent_name || '—' },
    {
      key: 'employee_count',
      header: 'Assigned Employees',
      render: (r) => <span className="font-mono">{r.employee_count}</span>,
    },
    { key: 'description', header: 'Description', render: (r) => r.description || '—' },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button type="button" className="btn btn-sm" onClick={() => openEditModal(r)}>
            Edit
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(r.dept_id)}>
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
            Organizational hierarchy, functional units, and reporting lines.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateModal}>
          + Create Department
        </button>
      </div>

      {/* Department Hierarchy Tree Visualization */}
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1.2rem',
          backgroundColor: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
        }}
      >
        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>
          Department Hierarchy Tree
        </div>
        {renderTree()}
      </div>

      {/* Dense Ledger Table */}
      <DataTable columns={columns} data={departments} />

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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Department"
        message="Are you sure you want to delete this department? Deleting will fail with HTTP 409 if employees or child departments are still attached."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
