import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';

interface DashboardProps {
  role: string;
}

export const DashboardPage: React.FC<DashboardProps> = ({ role }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInspector, setShowInspector] = useState(false);
  const [benchmark, setBenchmark] = useState<any>(null);
  const [benchmarking, setBenchmarking] = useState(false);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.get('/api/dashboard');
        setData(res);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const openInspector = async () => {
    setShowInspector(true);
    setBenchmarking(true);
    try {
      const res = await api.get('/api/dashboard/benchmark');
      setBenchmark(res);
    } catch (err) {
      console.error('Benchmark failed:', err);
    } finally {
      setBenchmarking(false);
    }
  };

  if (loading) return <div className="panel">Loading dashboard metrics...</div>;
  if (!data?.stats) return <div className="panel">No metrics available.</div>;

  const stats = data.stats;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1>{role} Dashboard</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Operating on <strong>{data.engine === 'mysql' ? 'SQL (MySQL 8.4)' : 'NoSQL (MongoDB 6.0)'}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn no-print" onClick={openInspector} style={{ fontSize: '0.82rem' }}>
            Dual-Engine Parity Inspector
          </button>
          <button className="btn btn-primary no-print" onClick={() => window.print()} style={{ fontSize: '0.82rem' }}>
            Print Formal Ledger
          </button>
        </div>
      </div>

      {/* Administrator Dashboard */}
      {role === 'Administrator' && (
        <>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-label">System Users</div>
              <div className="stat-value">{stats.userCount}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Departments</div>
              <div className="stat-value">{stats.deptCount}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Employees</div>
              <div className="stat-value">{stats.empCount}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Active Projects</div>
              <div className="stat-value">{stats.activeProjectCount}</div>
            </div>
          </div>
          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Enterprise System State</h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.88rem' }}>
              All administrative entities are synchronized across relational and document models via direct low-level drivers without ORM abstraction.
            </p>
          </div>
        </>
      )}

      {/* Strategic Manager Dashboard */}
      {role === 'Strategic Manager' && (
        <>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-label">Primary Focus Dimension</div>
              <div className="stat-value" style={{ fontSize: '1.35rem', color: 'var(--accent)' }}>
                {stats.primaryDimension || 'Environmental'}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Strategic Decisions</div>
              <div className="stat-value">{stats.strategicDecisions}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Decisions</div>
              <div className="stat-value">{stats.totalDecisions}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Archived Reports</div>
              <div className="stat-value">{stats.totalReports}</div>
            </div>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Sustainability Dimensions Matrix (Triple Bottom Line)</h2>
            <div className="table-container">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Dimension</th>
                    <th>Active Indicators</th>
                    <th>Latest Measurement Recorded</th>
                    <th>Institutional Focus Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.dimensionStats?.map((dim: any) => {
                    const isPrimary = dim.name === stats.primaryDimension;
                    return (
                      <tr key={dim.dimension_id} style={isPrimary ? { backgroundColor: 'var(--paper)' } : {}}>
                        <td>
                          <strong>{dim.name}</strong>
                          {isPrimary && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.15rem 0.4rem', backgroundColor: 'var(--accent)', color: '#fff', borderRadius: '2px' }}>
                              PRIMARY FOCUS
                            </span>
                          )}
                        </td>
                        <td className="font-mono">{dim.indicator_count}</td>
                        <td className="font-mono">{dim.latest_measurement_date}</td>
                        <td>{isPrimary ? 'Priority Level 1' : 'Standard Focus'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {stats.recentDecisions?.length > 0 && (
            <div className="panel" style={{ marginTop: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Recent Strategic Decisions</h2>
              <table className="ledger-table">
                <thead>
                  <tr><th>Date</th><th>Decision Title</th></tr>
                </thead>
                <tbody>
                  {stats.recentDecisions.map((dec: any) => (
                    <tr key={dec.decision_id}>
                      <td className="font-mono" style={{ width: '130px' }}>{dec.date}</td>
                      <td>{dec.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tactical Manager Dashboard */}
      {role === 'Tactical Manager' && (
        <>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-label">Open Project Tasks</div>
              <div className="stat-value">{stats.openTaskCount}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Projects</div>
              <div className="stat-value">
                {stats.projectsByStatus?.reduce((acc: number, p: any) => acc + p.count, 0) || 0}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Logged Risks</div>
              <div className="stat-value">
                {stats.risksByLevel?.reduce((acc: number, r: any) => acc + r.count, 0) || 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="panel">
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Projects by Status</h2>
              <table className="ledger-table">
                <thead>
                  <tr><th>Status</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {stats.projectsByStatus?.map((p: any) => (
                    <tr key={p.status}>
                      <td>{p.status}</td>
                      <td className="font-mono">{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel">
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Risks by Severity Level</h2>
              <table className="ledger-table">
                <thead>
                  <tr><th>Level</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {stats.risksByLevel?.map((r: any) => (
                    <tr key={r.level}>
                      <td>{r.level}</td>
                      <td className="font-mono">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {stats.deptWorkload?.length > 0 && (
            <div className="panel" style={{ marginTop: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Department Workload & Project Commitments</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {stats.deptWorkload.map((dw: any) => {
                  const pct = Math.min(100, dw.assignment_count * 25);
                  return (
                    <div key={dw.dept_name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                        <span>{dw.dept_name}</span>
                        <span className="font-mono">{dw.assignment_count} assignments</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '2px' }}>
                        <div style={{ width: `${Math.max(4, pct)}%`, height: '100%', backgroundColor: 'var(--accent)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Operational User Dashboard */}
      {role === 'Operational User' && (
        <>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-label">Measurements This Month</div>
              <div className="stat-value">{stats.measurementsThisMonth}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Measurements Logged</div>
              <div className="stat-value">{stats.totalMeasurementsEntered}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Assigned Project Tasks</div>
              <div className="stat-value">
                {stats.tasksByStatus?.reduce((acc: number, t: any) => acc + t.count, 0) || 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="panel">
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Assigned Task Breakdown</h2>
              {stats.tasksByStatus?.length === 0 ? (
                <div className="empty-state">No tasks currently assigned to your employee record.</div>
              ) : (
                <table className="ledger-table">
                  <thead>
                    <tr><th>Task Status</th><th>Count</th></tr>
                  </thead>
                  <tbody>
                    {stats.tasksByStatus?.map((t: any) => (
                      <tr key={t.status}>
                        <td>{t.status}</td>
                        <td className="font-mono">{t.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="panel">
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Recent Logged Measurements</h2>
              {stats.recentMeasurements?.length === 0 ? (
                <div className="empty-state">No recent measurements.</div>
              ) : (
                <table className="ledger-table">
                  <thead>
                    <tr><th>Date</th><th>Indicator</th><th>Reading</th></tr>
                  </thead>
                  <tbody>
                    {stats.recentMeasurements?.map((m: any) => (
                      <tr key={m.measurement_id}>
                        <td className="font-mono">{m.measurement_date}</td>
                        <td>{m.indicator_name}</td>
                        <td className="font-mono">{m.value} {m.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Engine Comparison / Inspector Modal */}
      {showInspector && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,36,33,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.75rem', maxWidth: '720px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Dual-Engine Parity & Latency Inspector</h3>
              <button className="btn btn-sm" onClick={() => setShowInspector(false)}>Close</button>
            </div>

            <p style={{ color: 'var(--ink-soft)', fontSize: '0.88rem', marginBottom: '1rem' }}>
              Demonstrates identical SQL query execution across both relational (MySQL 8.4) and document (MongoDB 6.0) engines via the low-level AlaSQL memory bridge.
            </p>

            {benchmarking ? (
              <p>Executing live cross-engine benchmark query...</p>
            ) : benchmark ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="stat-box" style={{ padding: '0.75rem' }}>
                    <div className="stat-label">Active Engine</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      {benchmark.engine === 'mysql' ? 'SQL (MySQL 8.4)' : 'NoSQL (MongoDB 6.0)'}
                    </div>
                  </div>
                  <div className="stat-box" style={{ padding: '0.75rem' }}>
                    <div className="stat-label">Execution Latency</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)' }}>
                      {benchmark.latencyMs} ms
                    </div>
                  </div>
                </div>

                <div className="panel" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    Unified ANSI SQL Statement
                  </div>
                  <pre className="font-mono" style={{ backgroundColor: 'var(--paper)', padding: '0.5rem', borderRadius: '2px', fontSize: '0.78rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {benchmark.sql}
                  </pre>
                </div>

                <div className="panel" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    Underlying NoSQL Translation Pipeline
                  </div>
                  <p className="font-mono" style={{ fontSize: '0.82rem', margin: 0 }}>
                    {benchmark.mongoEquivalent}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
