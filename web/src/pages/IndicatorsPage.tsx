import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';

interface IndicatorsPageProps {
  userRole: string;
}

export const IndicatorsPage: React.FC<IndicatorsPageProps> = ({ userRole }) => {
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicator, setSelectedIndicator] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create indicator (Admin)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [dimId, setDimId] = useState<number>(1);
  const [deptId, setDeptId] = useState<number | ''>('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [dims, depts] = await Promise.all([
        api.get('/api/sustainability/indicators'),
        api.get('/api/admin/departments').catch(() => []),
      ]);
      setDimensions(dims);
      setDepartments(depts);
      if (dims[0]) setDimId(dims[0].dimension_id);
    } catch (err: any) {
      console.error('Failed to load indicators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDetail = async (indicatorId: number) => {
    setLoadingDetail(true);
    try {
      const detail = await api.get(`/api/sustainability/indicators/${indicatorId}`);
      setSelectedIndicator(detail);
    } catch (err: any) {
      alert(`Failed to load indicator details: ${err.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/api/sustainability/indicators', {
        name,
        unit,
        description,
        dimension_id: Number(dimId),
        department_id: deptId === '' ? null : Number(deptId),
      });
      setShowCreateModal(false);
      setName('');
      setUnit('');
      setDescription('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="panel">Loading sustainability indicators...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Sustainability Indicators & Metrics</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Triple bottom line measurement indicators derived from the S-ERP framework (Fernández-Sánchez & Rodríguez-López 2010).
          </p>
        </div>
        {userRole === 'Administrator' && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create Indicator
          </button>
        )}
      </div>

      {/* Indicator Detail Inspection View */}
      {selectedIndicator && (
        <div className="panel" style={{ marginBottom: '2rem', border: '2px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.8rem' }}>
            <div>
              <h2 style={{ display: 'inline', marginRight: '0.6rem' }}>{selectedIndicator.name}</h2>
              <span className="status-tag active">{selectedIndicator.dimension_name}</span>
            </div>
            <button className="btn btn-sm" onClick={() => setSelectedIndicator(null)}>
              Close History View
            </button>
          </div>

          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.2rem', fontSize: '0.88rem' }}>
            <div><strong>Unit of Measure:</strong> <span className="font-mono">{selectedIndicator.unit}</span></div>
            <div><strong>Owning Department:</strong> {selectedIndicator.department_name || 'Enterprise Shared'}</div>
            <div><strong>Total Measurements Logged:</strong> <span className="font-mono">{selectedIndicator.measurements?.length || 0}</span></div>
          </div>

          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.2rem', fontSize: '0.88rem' }}>
            {selectedIndicator.description || 'No description provided.'}
          </p>

          {/* SVG Sparkline Trend */}
          {selectedIndicator.measurements && selectedIndicator.measurements.length > 1 && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                Historical Trend Sparkline ({selectedIndicator.unit})
              </div>
              {(() => {
                const points = [...selectedIndicator.measurements].reverse();
                const values = points.map((p: any) => Number(p.value));
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min === 0 ? 1 : max - min;
                const width = 500;
                const height = 80;
                const padding = 15;
                const step = (width - padding * 2) / (values.length - 1);

                const coords = values.map((v, i) => {
                  const x = padding + i * step;
                  const y = height - padding - ((v - min) / range) * (height - padding * 2);
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <div>
                    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                      <polyline
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2"
                        points={coords}
                      />
                      {values.map((v, i) => {
                        const x = padding + i * step;
                        const y = height - padding - ((v - min) / range) * (height - padding * 2);
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r="3" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
                            <text x={x} y={y - 8} fontSize="9" textAnchor="middle" fill="var(--ink-soft)" fontFamily="var(--font-mono)">
                              {v}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>
          )}

          <h3 style={{ fontSize: '1rem', marginBottom: '0.6rem' }}>Measurement History Ledger</h3>
          {selectedIndicator.measurements?.length === 0 ? (
            <div className="empty-state">No measurements logged for this indicator yet.</div>
          ) : (
            <div className="table-container">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Value Recorded</th>
                    <th>Unit</th>
                    <th>Source / Station</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedIndicator.measurements?.map((m: any) => (
                    <tr key={m.measurement_id}>
                      <td className="font-mono">{m.measurement_date?.slice(0, 10)}</td>
                      <td className="font-mono" style={{ fontWeight: 600 }}>{m.value}</td>
                      <td>{selectedIndicator.unit}</td>
                      <td>{m.source}</td>
                      <td>{m.recorded_by_username || 'System Seed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Grouped by Dimension */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {dimensions.map((dim) => (
          <div key={dim.dimension_id} className="panel">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <h2 style={{ fontSize: '1.2rem' }}>{dim.name} Dimension</h2>
              <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>{dim.description}</span>
            </div>

            <div className="table-container">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Indicator</th>
                    <th>Unit</th>
                    <th>Owning Department (G2)</th>
                    <th>Latest Value</th>
                    <th>Latest Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dim.indicators?.map((ind: any) => (
                    <tr key={ind.indicator_id}>
                      <td><strong>{ind.name}</strong></td>
                      <td className="font-mono">{ind.unit}</td>
                      <td>{ind.department_name || 'Enterprise Shared'}</td>
                      <td className="font-mono" style={{ fontWeight: 600 }}>
                        {ind.latest_value != null ? ind.latest_value : '—'}
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.82rem' }}>
                        {ind.latest_date ? ind.latest_date.slice(0, 10) : '—'}
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={() => openDetail(ind.indicator_id)}>
                          View History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Create Indicator Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,36,33,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.5rem', maxWidth: '480px', width: '90%' }}>
            <h3>Register Sustainability Indicator</h3>
            {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            <form onSubmit={handleCreate} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Indicator Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Atmosphere, Soil, Water" />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Dimension</label>
                  <select value={dimId} onChange={(e) => setDimId(Number(e.target.value))}>
                    {dimensions.map((d) => (
                      <option key={d.dimension_id} value={d.dimension_id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input type="text" required value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. tCO2e, m³, %" />
                </div>
              </div>
              <div className="form-group">
                <label>Owning Department (G2, optional)</label>
                <select value={deptId} onChange={(e) => setDeptId(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">— Enterprise Shared —</option>
                  {departments.map((d) => (
                    <option key={d.dept_id} value={d.dept_id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Indicator</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
