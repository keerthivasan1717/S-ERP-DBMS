import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable, Column } from '../components/DataTable.js';
import { StatusTag } from '../components/StatusTag.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected project for viewing tasks, phases, risks, members
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  // Modals
  const [showProjModal, setShowProjModal] = useState(false);
  const [editingProj, setEditingProj] = useState<any | null>(null);
  const [deleteProjId, setDeleteProjId] = useState<number | null>(null);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStatus, setTaskStatus] = useState('Planned');
  const [taskStart, setTaskStart] = useState('2026-11-01');
  const [taskEnd, setTaskEnd] = useState('');

  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskTitle, setRiskTitle] = useState('');
  const [riskDesc, setRiskDesc] = useState('');
  const [riskLevel, setRiskLevel] = useState('Medium');

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmpId, setMemberEmpId] = useState<number | ''>('');
  const [memberRole, setMemberRole] = useState('Contributor');
  const [memberAlloc, setMemberAlloc] = useState(100);

  // Project form fields
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projStart, setProjStart] = useState('2026-01-01');
  const [projEnd, setProjEnd] = useState('');
  const [projStatus, setProjStatus] = useState('Planned');
  const [projDeptId, setProjDeptId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      const [pList, dList, eList] = await Promise.all([
        api.get('/api/tactical/projects'),
        api.get('/api/admin/departments'),
        api.get('/api/admin/employees'),
      ]);
      setProjects(pList);
      setDepartments(dList);
      setEmployees(eList);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetails = async (id: number) => {
    try {
      const p = await api.get(`/api/tactical/projects/${id}`);
      setSelectedProject(p);
    } catch (err: any) {
      alert(`Failed to load project details: ${err.message}`);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const openCreateProj = () => {
    setEditingProj(null);
    setProjName('');
    setProjDesc('');
    setProjStart(new Date().toISOString().slice(0, 10));
    setProjEnd('');
    setProjStatus('Planned');
    setProjDeptId(departments[0]?.dept_id || '');
    setError(null);
    setShowProjModal(true);
  };

  const openEditProj = (p: any) => {
    setEditingProj(p);
    setProjName(p.name);
    setProjDesc(p.description || '');
    setProjStart(p.start_date?.slice(0, 10) || '');
    setProjEnd(p.end_date ? p.end_date.slice(0, 10) : '');
    setProjStatus(p.status);
    setProjDeptId(p.department_id);
    setError(null);
    setShowProjModal(true);
  };

  const handleSaveProj = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingProj) {
        await api.put(`/api/tactical/projects/${editingProj.project_id}`, {
          name: projName,
          description: projDesc,
          start_date: projStart,
          end_date: projEnd || null,
          status: projStatus,
          department_id: Number(projDeptId),
        });
      } else {
        await api.post('/api/tactical/projects', {
          name: projName,
          description: projDesc,
          start_date: projStart,
          end_date: projEnd || null,
          status: projStatus,
          department_id: Number(projDeptId),
        });
      }
      setShowProjModal(false);
      loadProjects();
      if (selectedProject && editingProj?.project_id === selectedProject.project_id) {
        loadProjectDetails(selectedProject.project_id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteProj = async () => {
    if (!deleteProjId) return;
    try {
      await api.delete(`/api/tactical/projects/${deleteProjId}`);
      setDeleteProjId(null);
      if (selectedProject?.project_id === deleteProjId) {
        setSelectedProject(null);
      }
      loadProjects();
    } catch (err: any) {
      alert(`Delete project failed: ${err.message}`);
    }
  };

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      await api.post(`/api/tactical/projects/${selectedProject.project_id}/tasks`, {
        name: taskName,
        description: taskDesc,
        status: taskStatus,
        start_date: taskStart,
        end_date: taskEnd || null,
      });
      setShowTaskModal(false);
      setTaskName('');
      setTaskDesc('');
      loadProjectDetails(selectedProject.project_id);
    } catch (err: any) {
      alert(`Add task failed: ${err.message}`);
    }
  };

  // Add Risk
  const handleAddRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      await api.post(`/api/tactical/projects/${selectedProject.project_id}/risks`, {
        title: riskTitle,
        description: riskDesc,
        level: riskLevel,
      });
      setShowRiskModal(false);
      setRiskTitle('');
      setRiskDesc('');
      loadProjectDetails(selectedProject.project_id);
    } catch (err: any) {
      alert(`Add risk failed: ${err.message}`);
    }
  };

  // Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || memberEmpId === '') return;
    try {
      await api.post(`/api/tactical/projects/${selectedProject.project_id}/members`, {
        emp_id: Number(memberEmpId),
        role: memberRole,
        allocation_percentage: Number(memberAlloc),
      });
      setShowMemberModal(false);
      loadProjectDetails(selectedProject.project_id);
    } catch (err: any) {
      alert(`Assign member failed: ${err.message}`);
    }
  };

  const projectColumns: Column<any>[] = [
    { key: 'project_id', header: 'ID' },
    {
      key: 'name',
      header: 'Project Name',
      render: (r) => (
        <span
          style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => loadProjectDetails(r.project_id)}
        >
          {r.name}
        </span>
      ),
    },
    { key: 'department_name', header: 'Department' },
    { key: 'status', header: 'Status', render: (r) => <StatusTag status={r.status} /> },
    { key: 'start_date', header: 'Start Date', render: (r) => r.start_date?.slice(0, 10) },
    { key: 'task_count', header: 'Tasks', render: (r) => <span className="font-mono">{r.task_count}</span> },
    { key: 'member_count', header: 'Staff', render: (r) => <span className="font-mono">{r.member_count}</span> },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-sm" onClick={() => loadProjectDetails(r.project_id)}>
            Inspect
          </button>
          <button className="btn btn-sm" onClick={() => openEditProj(r)}>
            Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => setDeleteProjId(r.project_id)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <div className="panel">Loading tactical projects...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Projects & Tactical Execution</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Track project lifecycle, implementation phases, work tasks, and associated risks.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateProj}>
          + Create Project
        </button>
      </div>

      <DataTable columns={projectColumns} data={projects} />

      {/* Selected Project Details View */}
      {selectedProject && (
        <div style={{ marginTop: '2rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderBottom: '2px solid var(--ink)',
              paddingBottom: '0.4rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h2 style={{ display: 'inline', marginRight: '0.8rem' }}>{selectedProject.name}</h2>
              <StatusTag status={selectedProject.status} />
            </div>
            <button className="btn btn-sm" onClick={() => setSelectedProject(null)}>
              Close Inspection View
            </button>
          </div>

          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.25rem' }}>
            {selectedProject.description || 'No description provided.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Project Tasks */}
            <div className="panel" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3>Work Breakdown Tasks</h3>
                <button className="btn btn-sm" onClick={() => setShowTaskModal(true)}>
                  + Add Task
                </button>
              </div>
              <table className="ledger-table">
                <thead>
                  <tr><th>Task</th><th>Status</th><th>Dates</th></tr>
                </thead>
                <tbody>
                  {selectedProject.tasks?.map((t: any) => (
                    <tr key={t.task_id}>
                      <td><strong>{t.name}</strong></td>
                      <td><StatusTag status={t.status} /></td>
                      <td className="font-mono" style={{ fontSize: '0.8rem' }}>
                        {t.start_date?.slice(0, 10)} {t.end_date ? `→ ${t.end_date.slice(0, 10)}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Project Risks */}
            <div className="panel" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3>Project Risks</h3>
                <button className="btn btn-sm" onClick={() => setShowRiskModal(true)}>
                  + Log Risk
                </button>
              </div>
              <table className="ledger-table">
                <thead>
                  <tr><th>Risk Title</th><th>Level</th></tr>
                </thead>
                <tbody>
                  {selectedProject.risks?.map((r: any) => (
                    <tr key={r.risk_id}>
                      <td>{r.title}</td>
                      <td><StatusTag status={r.level} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Implementation Phases & Assigned Staff */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="panel" style={{ margin: 0 }}>
              <h3>Implementation Roadmap Phases</h3>
              <table className="ledger-table" style={{ marginTop: '0.75rem' }}>
                <thead>
                  <tr><th>Phase</th><th>Start</th><th>End</th></tr>
                </thead>
                <tbody>
                  {selectedProject.phases?.map((ph: any) => (
                    <tr key={ph.phase_id}>
                      <td><strong>{ph.name}</strong></td>
                      <td className="font-mono">{ph.start_date?.slice(0, 10)}</td>
                      <td className="font-mono">{ph.end_date ? ph.end_date.slice(0, 10) : 'Ongoing'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3>Assigned Employees</h3>
                <button className="btn btn-sm" onClick={() => setShowMemberModal(true)}>
                  + Assign Staff
                </button>
              </div>
              <table className="ledger-table">
                <thead>
                  <tr><th>Employee</th><th>Project Role</th><th>Allocation</th></tr>
                </thead>
                <tbody>
                  {selectedProject.members?.map((m: any) => (
                    <tr key={m.emp_id}>
                      <td>{m.employee_name}</td>
                      <td>{m.role}</td>
                      <td className="font-mono">{m.allocation_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Project Create/Edit Modal */}
      {showProjModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,36,33,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.5rem', maxWidth: '500px', width: '90%' }}>
            <h3>{editingProj ? 'Edit Project' : 'Create New Project'}</h3>
            {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            <form onSubmit={handleSaveProj} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Project Name</label>
                <input type="text" required value={projName} onChange={(e) => setProjName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Department</label>
                <select required value={projDeptId} onChange={(e) => setProjDeptId(Number(e.target.value))}>
                  <option value="" disabled>Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.dept_id} value={d.dept_id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" required value={projStart} onChange={(e) => setProjStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>End Date (optional)</label>
                  <input type="date" value={projEnd} onChange={(e) => setProjEnd(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={projStatus} onChange={(e) => setProjStatus(e.target.value)}>
                  <option value="Planned">Planned</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={projDesc} onChange={(e) => setProjDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.2rem' }}>
                <button type="button" className="btn" onClick={() => setShowProjModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,36,33,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.5rem', maxWidth: '440px', width: '90%' }}>
            <h3>Add Task to {selectedProject?.name}</h3>
            <form onSubmit={handleAddTask} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Task Name</label>
                <input type="text" required value={taskName} onChange={(e) => setTaskName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
                  <option value="Planned">Planned</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" required value={taskStart} onChange={(e) => setTaskStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={taskEnd} onChange={(e) => setTaskEnd(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Risk Modal */}
      {showRiskModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,36,33,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.5rem', maxWidth: '440px', width: '90%' }}>
            <h3>Log Project Risk</h3>
            <form onSubmit={handleAddRisk} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Risk Title</label>
                <input type="text" required value={riskTitle} onChange={(e) => setRiskTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Severity Level</label>
                <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={2} value={riskDesc} onChange={(e) => setRiskDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn" onClick={() => setShowRiskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Risk</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,36,33,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.5rem', maxWidth: '440px', width: '90%' }}>
            <h3>Assign Staff Member</h3>
            <form onSubmit={handleAddMember} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Employee</label>
                <select required value={memberEmpId} onChange={(e) => setMemberEmpId(Number(e.target.value))}>
                  <option value="">— Select Employee —</option>
                  {employees.map((emp) => (
                    <option key={emp.emp_id} value={emp.emp_id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Project Role</label>
                <input type="text" required value={memberRole} onChange={(e) => setMemberRole(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Allocation %</label>
                <input type="number" min={1} max={100} value={memberAlloc} onChange={(e) => setMemberAlloc(Number(e.target.value))} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn" onClick={() => setShowMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Confirm */}
      <ConfirmModal
        isOpen={deleteProjId !== null}
        title="Delete Project"
        message="Are you sure you want to delete this project? All associated tasks, phases, and member allocations will be removed."
        onConfirm={handleDeleteProj}
        onCancel={() => setDeleteProjId(null)}
      />
    </div>
  );
};
