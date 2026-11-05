import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable, Column } from '../components/DataTable.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export const ProcessesPage: React.FC = () => {
  const [processes, setProcesses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingProc, setEditingProc] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deptId, setDeptId] = useState<number | ''>('');
  const [selectedIndIds, setSelectedIndIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Link resource modal
  const [linkingProc, setLinkingProc] = useState<any | null>(null);
  const [linkResId, setLinkResId] = useState<number | ''>('');
  const [linkQuantity, setLinkQuantity] = useState<number>(100);
  const [linkUnit, setLinkUnit] = useState('kWh');

  const loadData = async () => {
    try {
      const [pList, dList, rList, dims] = await Promise.all([
        api.get('/api/tactical/processes'),
        api.get('/api/admin/departments'),
        api.get('/api/tactical/resources'),
        api.get('/api/sustainability/indicators'),
      ]);
      setProcesses(pList);
      setDepartments(dList);
      setResources(rList);

      const flatInds: any[] = [];
      dims.forEach((d: any) => {
        if (d.indicators) {
          d.indicators.forEach((ind: any) => {
            flatInds.push({ ...ind, dimensionName: d.name });
          });
        }
      });
      setIndicators(flatInds);
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
    setEditingProc(null);
    setName('');
    setDescription('');
    setDeptId(departments[0]?.dept_id || '');
    setSelectedIndIds([]);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (p: any) => {
    setEditingProc(p);
    setName(p.name);
    setDescription(p.description || '');
    setDeptId(p.department_id);
    setSelectedIndIds(p.indicators?.map((i: any) => i.indicator_id) || []);
    setError(null);
    setShowModal(true);
  };

  const handleToggleInd = (id: number) => {
    setSelectedIndIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingProc) {
        await api.put(`/api/tactical/processes/${editingProc.process_id}`, {
          name,
          description,
          department_id: Number(deptId),
          indicatorIds: selectedIndIds,
        });
      } else {
        await api.post('/api/tactical/processes', {
          name,
          description,
          department_id: Number(deptId),
          indicatorIds: selectedIndIds,
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
      await api.delete(`/api/tactical/processes/${deleteId}`);
      setDeleteId(null);
      loadData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleLinkResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingProc || linkResId === '') return;
    try {
      await api.post(`/api/tactical/processes/${linkingProc.process_id}/resources`, {
        resource_id: Number(linkResId),
        quantity: Number(linkQuantity),
        unit: linkUnit,
      });
      setLinkingProc(null);
      loadData();
    } catch (err: any) {
      alert(`Assign resource failed: ${err.message}`);
    }
  };

  const columns: Column<any>[] = [
    { key: 'process_id', header: 'ID' },
    { key: 'name', header: 'Process Name' },
    { key: 'department_name', header: 'Department' },
    {
      key: 'resources',
      header: 'Assigned Resources',
      render: (r) => (
        <div>
          {r.resources?.map((res: any) => (
            <div key={res.resource_id} className="font-mono" style={{ fontSize: '0.8rem' }}>
              • {res.name}: {res.quantity} {res.unit}
            </div>
          ))}
          <button
            className="btn btn-sm"
            style={{ marginTop: '0.3rem', fontSize: '0.75rem' }}
            onClick={() => {
              setLinkingProc(r);
              setLinkResId(resources[0]?.resource_id || '');
              setLinkUnit(resources[0]?.unit || 'units');
            }}
          >
            + Link Resource
          </button>
        </div>
      ),
    },
    {
      key: 'indicators',
      header: 'Linked Indicators (G3)',
      render: (r) => (
        <div>
          {r.indicators?.length === 0 ? (
            <span style={{ color: 'var(--ink-soft)' }}>None</span>
          ) : (
            r.indicators?.map((ind: any) => (
              <span key={ind.indicator_id} className="status-tag active" style={{ marginRight: '0.3rem', marginBottom: '0.2rem' }}>
                {ind.name}
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
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-sm" onClick={() => openEditModal(r)}>
            Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(r.process_id)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <div className="panel">Loading business processes...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Business Processes</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Operational workflows, resource consumption links, and sustainability indicator alignment.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Create Process
        </button>
      </div>

      <DataTable columns={columns} data={processes} />

      {/* Process Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,36,33,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.5rem', maxWidth: '520px', width: '90%' }}>
            <h3>{editingProc ? 'Edit Business Process' : 'Create Business Process'}</h3>
            {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            <form onSubmit={handleSave} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Process Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Department</label>
                <select value={deptId} onChange={(e) => setDeptId(Number(e.target.value))}>
                  {departments.map((d) => (
                    <option key={d.dept_id} value={d.dept_id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                <label>Link Sustainability Indicators (G3)</label>
                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--line)', padding: '0.5rem' }}>
                  {indicators.map((ind) => (
                    <label key={ind.indicator_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none', fontWeight: 400, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedIndIds.includes(ind.indicator_id)}
                        onChange={() => handleToggleInd(ind.indicator_id)}
                      />
                      <span>{ind.name} ({ind.dimensionName} - {ind.unit})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Process</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Resource Modal */}
      {linkingProc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,36,33,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.5rem', maxWidth: '440px', width: '90%' }}>
            <h3>Assign Resource to {linkingProc.name}</h3>
            <form onSubmit={handleLinkResource} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Select Resource</label>
                <select
                  value={linkResId}
                  onChange={(e) => {
                    const rId = Number(e.target.value);
                    setLinkResId(rId);
                    const sel = resources.find((r) => r.resource_id === rId);
                    if (sel) setLinkUnit(sel.unit);
                  }}
                >
                  {resources.map((r) => (
                    <option key={r.resource_id} value={r.resource_id}>
                      {r.name} ({r.type} - {r.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" required step="0.01" value={linkQuantity} onChange={(e) => setLinkQuantity(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input type="text" required value={linkUnit} onChange={(e) => setLinkUnit(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn" onClick={() => setLinkingProc(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign Resource</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Business Process"
        message="Are you sure you want to delete this process? All resource linkages and indicator connections will be removed."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
