import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable, Column } from '../components/DataTable.js';
import { StatusTag } from '../components/StatusTag.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

interface DecisionsPageProps {
  userRole: string;
}

export const DecisionsPage: React.FC<DecisionsPageProps> = ({ userRole }) => {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const defaultLevel =
    userRole === 'Strategic Manager' ? 'Strategic' : userRole === 'Tactical Manager' ? 'Tactical' : 'Operational';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [decisionLevel, setDecisionLevel] = useState<string>(defaultLevel);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [projectId, setProjectId] = useState<number | ''>('');
  const [processId, setProcessId] = useState<number | ''>('');
  const [selectedRiskIds, setSelectedRiskIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const url = levelFilter === 'All' ? '/api/decisions' : `/api/decisions?level=${levelFilter}`;
      const dList = await api.get(url);
      setDecisions(dList);

      // Try loading projects, processes, risks if tactical or admin
      if (userRole === 'Administrator' || userRole === 'Tactical Manager' || userRole === 'Strategic Manager') {
        const [projRes, procRes] = await Promise.all([
          api.get('/api/tactical/projects').catch(() => []),
          api.get('/api/tactical/processes').catch(() => []),
        ]);
        setProjects(projRes);
        setProcesses(procRes);

        const allRisks: any[] = [];
        for (const p of projRes) {
          if (p.project_id) {
            const detail = await api.get(`/api/tactical/projects/${p.project_id}`).catch(() => null);
            if (detail?.risks) allRisks.push(...detail.risks);
          }
        }
        setRisks(allRisks);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [levelFilter]);

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setDecisionLevel(defaultLevel);
    setDate(new Date().toISOString().slice(0, 10));
    setProjectId('');
    setProcessId('');
    setSelectedRiskIds([]);
    setError(null);
    setShowModal(true);
  };

  const handleToggleRisk = (rId: number) => {
    setSelectedRiskIds((prev) =>
      prev.includes(rId) ? prev.filter((id) => id !== rId) : [...prev, rId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/api/decisions', {
        title,
        description,
        decision_level: decisionLevel,
        date,
        project_id: projectId === '' ? null : Number(projectId),
        process_id: processId === '' ? null : Number(processId),
        riskIds: selectedRiskIds,
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
      await api.delete(`/api/decisions/${deleteId}`);
      setDeleteId(null);
      loadData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const columns: Column<any>[] = [
    { key: 'decision_id', header: 'ID' },
    { key: 'title', header: 'Decision Title' },
    { key: 'decision_level', header: 'Decisional Level', render: (r) => <StatusTag status={r.decision_level} /> },
    { key: 'date', header: 'Date', render: (r) => r.date?.slice(0, 10) },
    { key: 'creator_name', header: 'Recorded By' },
    { key: 'project_name', header: 'Linked Project', render: (r) => r.project_name || '—' },
    { key: 'process_name', header: 'Linked Process', render: (r) => r.process_name || '—' },
    {
      key: 'risks',
      header: 'Associated Risks (G5)',
      render: (r) => (
        <div>
          {r.risks?.length === 0 ? (
            <span style={{ color: 'var(--ink-soft)' }}>—</span>
          ) : (
            r.risks?.map((risk: any) => (
              <span key={risk.risk_id} className="status-tag medium" style={{ marginRight: '0.2rem' }}>
                {risk.title}
              </span>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (r) => (
        <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(r.decision_id)}>
          Delete
        </button>
      ),
    },
  ];

  if (loading) return <div className="panel">Loading decisions...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Decisions Log</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Decisional paradigm records classified by tier (Strategic, Tactical, Operational) linked to business processes and risks.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>Filter Level:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
            >
              <option value="All">All Levels</option>
              <option value="Strategic">Strategic</option>
              <option value="Tactical">Tactical</option>
              <option value="Operational">Operational</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={openCreateModal}>
            + Log Decision
          </button>
        </div>
      </div>

      <DataTable columns={columns} data={decisions} />

      {/* Decision Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,36,33,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.5rem', maxWidth: '520px', width: '90%' }}>
            <h3>Record Governance Decision</h3>
            {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            <form onSubmit={handleSave} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Decision Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Decisional Paradigm Level</label>
                  <select
                    value={decisionLevel}
                    onChange={(e) => setDecisionLevel(e.target.value)}
                    disabled={userRole !== 'Administrator'}
                  >
                    {userRole === 'Administrator' ? (
                      <>
                        <option value="Strategic">Strategic</option>
                        <option value="Tactical">Tactical</option>
                        <option value="Operational">Operational</option>
                      </>
                    ) : userRole === 'Strategic Manager' ? (
                      <option value="Strategic">Strategic (Enforced for Role)</option>
                    ) : userRole === 'Tactical Manager' ? (
                      <option value="Tactical">Tactical (Enforced for Role)</option>
                    ) : (
                      <option value="Operational">Operational</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label>Decision Date</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Linked Project (optional)</label>
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value === '' ? '' : Number(e.target.value))}>
                    <option value="">— None —</option>
                    {projects.map((p) => (
                      <option key={p.project_id} value={p.project_id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Linked Process (optional)</label>
                  <select value={processId} onChange={(e) => setProcessId(e.target.value === '' ? '' : Number(e.target.value))}>
                    <option value="">— None —</option>
                    {processes.map((pr) => (
                      <option key={pr.process_id} value={pr.process_id}>{pr.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description & Justification</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {risks.length > 0 && (
                <div style={{ marginTop: '0.8rem', marginBottom: '0.8rem' }}>
                  <label>Associated Risks (G5)</label>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid var(--line)', padding: '0.4rem' }}>
                    {risks.map((r) => (
                      <label key={r.risk_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none', fontWeight: 400, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedRiskIds.includes(r.risk_id)}
                          onChange={() => handleToggleRisk(r.risk_id)}
                        />
                        <span>{r.title} ({r.level})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Decision</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Decision"
        message="Are you sure you want to delete this decision log?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
