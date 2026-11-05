import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable, Column } from '../components/DataTable.js';
import { StatusTag } from '../components/StatusTag.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export const ResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRes, setEditingRes] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [type, setType] = useState('Energy');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('kWh');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const list = await api.get('/api/tactical/resources');
      setResources(list);
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
    setEditingRes(null);
    setType('Energy');
    setName('');
    setDescription('');
    setUnit('kWh');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (r: any) => {
    setEditingRes(r);
    setType(r.type);
    setName(r.name);
    setDescription(r.description || '');
    setUnit(r.unit);
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingRes) {
        await api.put(`/api/tactical/resources/${editingRes.resource_id}`, {
          type,
          name,
          description,
          unit,
        });
      } else {
        await api.post('/api/tactical/resources', {
          type,
          name,
          description,
          unit,
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
      await api.delete(`/api/tactical/resources/${deleteId}`);
      setDeleteId(null);
      loadData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const columns: Column<any>[] = [
    { key: 'resource_id', header: 'ID' },
    { key: 'name', header: 'Resource Name' },
    { key: 'type', header: 'Type', render: (r) => <StatusTag status={r.type} /> },
    { key: 'unit', header: 'Unit of Measure', render: (r) => <span className="font-mono">{r.unit}</span> },
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
          <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(r.resource_id)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <div className="panel">Loading resource catalog...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Resource Tracking</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Physical and financial resources tracked across operational workflows (Energy, Water, Material, Financial).
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Create Resource
        </button>
      </div>

      <DataTable columns={columns} data={resources} />

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,36,33,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.5rem', maxWidth: '480px', width: '90%' }}>
            <h3>{editingRes ? 'Edit Resource' : 'Register New Resource'}</h3>
            {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            <form onSubmit={handleSave} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Resource Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Energy">Energy</option>
                    <option value="Water">Water</option>
                    <option value="Material">Material</option>
                    <option value="Financial">Financial</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Unit of Measure</label>
                  <input type="text" required value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. kWh, m³, USD" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Resource</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Resource"
        message="Are you sure you want to remove this resource from the catalog?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
