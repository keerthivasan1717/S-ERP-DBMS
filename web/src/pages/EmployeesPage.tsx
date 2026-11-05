import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable, Column } from '../components/DataTable.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [deptId, setDeptId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [eList, dList] = await Promise.all([
        api.get('/api/admin/employees'),
        api.get('/api/admin/departments'),
      ]);
      setEmployees(eList);
      setDepartments(dList);
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
    setEditingEmp(null);
    setName('');
    setEmail('');
    setRole('');
    setDeptId(departments[0]?.dept_id || '');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (e: any) => {
    setEditingEmp(e);
    setName(e.name);
    setEmail(e.email);
    setRole(e.role);
    setDeptId(e.department_id);
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingEmp) {
        await api.put(`/api/admin/employees/${editingEmp.emp_id}`, {
          name,
          email,
          role,
          department_id: Number(deptId),
        });
      } else {
        await api.post('/api/admin/employees', {
          name,
          email,
          role,
          department_id: Number(deptId),
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
      await api.delete(`/api/admin/employees/${deleteId}`);
      setDeleteId(null);
      loadData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const columns: Column<any>[] = [
    { key: 'emp_id', header: 'ID' },
    { key: 'name', header: 'Full Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Job Title / Role' },
    { key: 'department_name', header: 'Department' },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-sm" onClick={() => openEditModal(r)}>
            Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(r.emp_id)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <div className="panel">Loading employees...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Employees</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Enterprise staff directory and departmental assignments.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Create Employee
        </button>
      </div>

      <DataTable columns={columns} data={employees} />

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
              {editingEmp ? `Edit Employee: ${editingEmp.name}` : 'Create Employee Record'}
            </h3>

            {error && (
              <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Job Title / Role</label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Operations Project Manager"
                />
              </div>

              <div className="form-group">
                <label>Department</label>
                <select
                  required
                  value={deptId}
                  onChange={(e) => setDeptId(Number(e.target.value))}
                >
                  {departments.map((d) => (
                    <option key={d.dept_id} value={d.dept_id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.2rem' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Employee"
        message="Are you sure you want to delete this employee record?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
