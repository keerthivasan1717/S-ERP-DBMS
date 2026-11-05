import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable, Column } from '../components/DataTable.js';
import { StatusTag } from '../components/StatusTag.js';

export const MyTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const list = await api.get('/api/operational/my-tasks');
        setTasks(list);
      } catch (err: any) {
        console.error('Failed to load my tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  const columns: Column<any>[] = [
    { key: 'task_id', header: 'ID' },
    { key: 'name', header: 'Task Title' },
    { key: 'project_name', header: 'Project' },
    { key: 'assignment_role', header: 'My Project Role' },
    { key: 'status', header: 'Status', render: (r) => <StatusTag status={r.status} /> },
    { key: 'start_date', header: 'Start Date', render: (r) => r.start_date?.slice(0, 10) },
    { key: 'end_date', header: 'Target Completion', render: (r) => (r.end_date ? r.end_date.slice(0, 10) : '—') },
    { key: 'description', header: 'Description', render: (r) => r.description || '—' },
  ];

  if (loading) return <div className="panel">Loading assigned tasks...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>My Assigned Tasks</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Operational project tasks assigned to your employee account through project staffing.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tasks}
        emptyMessage="No tasks currently assigned to your employee record."
      />
    </div>
  );
};
