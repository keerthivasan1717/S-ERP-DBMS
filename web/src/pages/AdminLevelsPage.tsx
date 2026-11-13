import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable, Column } from '../components/DataTable.js';
import { StatusTag } from '../components/StatusTag.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

interface AdminLevel {
  level_id: number;
  name: string;
  description?: string | null;
  decision_count: number;
  created_at: string;
}

export const AdminLevelsPage: React.FC = () => {
  const [levels, setLevels] = useState<AdminLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const list = await api.get('/api/decisions/levels');
      setLevels(list);
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
    setName('');
    setDescription('');
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/api/decisions/levels', {
        name,
        description: description || undefined,
      });
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/decisions/levels/${deleteId}`);
      setDeleteId(null);
      loadData();
    } catch (err: any) {
      alert(`Deletion Failed: ${err.message}`);
      setDeleteId(null);
    }
  };

  const columns: Column<AdminLevel>[] = [
    { key: 'level_id', header: 'ID' },
    {
      key: 'name',
      header: 'Administration Level',
      render: (r) => <StatusTag status={r.name} />,
    },
    {
      key: 'description',
      header: 'Scope & Description',
      render: (r) => r.description || '—',
    },
    {
      key: 'decision_count',
      header: 'Decisions Logged',
      render: (r) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {r.decision_count}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Tier Classification',
      render: (r) => {
        const isCore = ['Strategic', 'Tactical', 'Operational'].includes(r.name);
        return (
          <span style={{ fontSize: '0.8rem', color: isCore ? 'var(--ink-soft)' : 'var(--accent)' }}>
            {isCore ? 'Standard Decisional Tier' : 'Custom Administration Level'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (r) => {
        const isCore = ['Strategic', 'Tactical', 'Operational'].includes(r.name);
        if (isCore) {
          return <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem' }}>System Core</span>;
        }
        return (
          <button
            className="btn btn-sm btn-danger"
            onClick={() => setDeleteId(r.level_id)}
            disabled={r.decision_count > 0}
            title={r.decision_count > 0 ? 'Cannot delete level with associated decisions' : 'Delete Level'}
          >
            Delete
          </button>
        );
      },
    },
  ];

  if (loading) return <div className="panel">Loading administration levels...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Administration Levels</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Decisional paradigm administration tiers (Strategic, Tactical, Operational) and custom organizational governance levels.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Create Administration Level
        </button>
      </div>

      <DataTable columns={columns} data={levels} />

      {/* Create Level Modal */}
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
            <h3 style={{ marginBottom: '1rem' }}>Create New Level of Administration</h3>

            {error && (
              <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Administration Level Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Normative Governance, Executive Oversight"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Scope & Justification</label>
                <textarea
                  rows={3}
                  placeholder="Define the administrative scope, policy domain, or operational governance level..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.2rem' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Administration Level
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Administration Level"
        message="Are you sure you want to delete this custom administration level? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
