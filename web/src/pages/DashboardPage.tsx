import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';

interface DashboardProps {
  role: string;
}

export const DashboardPage: React.FC<DashboardProps> = ({ role }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="panel">Loading dashboard metrics...</div>;
  if (!data?.stats) return <div className="panel">No metrics available.</div>;

  const stats = data.stats;

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1>{role} Dashboard</h1>
        <p style={{ color: 'var(--ink-soft)' }}>
          Operating on <strong>{data.engine === 'mysql' ? 'SQL (MySQL 8.4)' : 'NoSQL (MongoDB 6.0)'}</strong>
        </p>
      </div>

      {/* Administrator Dashboard */}
      {role === 'Administrator' && (
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
      )}

      {/* Strategic Manager Dashboard */}
      {role === 'Strategic Manager' && (
        <>
          <div className="stat-grid">
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
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Sustainability Dimensions Overview</h2>
            <div className="table-container">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Dimension</th>
                    <th>Active Indicators</th>
                    <th>Latest Measurement Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.dimensionStats?.map((dim: any) => (
                    <tr key={dim.dimension_id}>
                      <td><strong>{dim.name}</strong></td>
                      <td className="font-mono">{dim.indicator_count}</td>
                      <td className="font-mono">{dim.latest_measurement_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
        </>
      )}
    </div>
  );
};
