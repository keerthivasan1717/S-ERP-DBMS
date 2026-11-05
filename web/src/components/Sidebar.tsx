import React from 'react';

export type NavItemKey =
  | 'dashboard'
  | 'users'
  | 'departments'
  | 'employees'
  | 'organization'
  | 'projects'
  | 'processes'
  | 'resources'
  | 'decisions'
  | 'indicators'
  | 'reports'
  | 'my-tasks'
  | 'enter-measurement';

interface SidebarProps {
  role: string;
  activeItem: NavItemKey;
  onSelect: (item: NavItemKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, activeItem, onSelect }) => {
  const isAdmin = role === 'Administrator';
  const isStrategic = role === 'Strategic Manager';
  const isTactical = role === 'Tactical Manager';
  const isOperational = role === 'Operational User';

  const linkStyle = (item: NavItemKey): React.CSSProperties => {
    const isActive = activeItem === item;
    return {
      display: 'block',
      padding: '0.45rem 0.75rem',
      fontSize: '0.86rem',
      fontWeight: isActive ? 600 : 400,
      color: isActive ? 'var(--accent)' : 'var(--ink)',
      backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
      borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
      textDecoration: 'none',
      cursor: 'pointer',
      marginBottom: '0.15rem',
    };
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '0.74rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--ink-soft)',
    fontWeight: 700,
    padding: '0.8rem 0.75rem 0.3rem',
  };

  return (
    <aside
      style={{
        width: '220px',
        borderRight: '1px solid var(--line)',
        backgroundColor: 'var(--surface)',
        minHeight: 'calc(100vh - 49px)',
        padding: '0.5rem 0',
      }}
    >
      <div style={sectionHeaderStyle}>Overview</div>
      <div style={linkStyle('dashboard')} onClick={() => onSelect('dashboard')}>
        Dashboard
      </div>

      {/* Administrator Navigation */}
      {isAdmin && (
        <>
          <div style={sectionHeaderStyle}>Administration</div>
          <div style={linkStyle('users')} onClick={() => onSelect('users')}>
            User Accounts
          </div>
          <div style={linkStyle('departments')} onClick={() => onSelect('departments')}>
            Departments
          </div>
          <div style={linkStyle('employees')} onClick={() => onSelect('employees')}>
            Employees
          </div>
          <div style={linkStyle('organization')} onClick={() => onSelect('organization')}>
            Organization Profile
          </div>
        </>
      )}

      {/* Tactical Manager Navigation */}
      {(isTactical || isAdmin) && (
        <>
          <div style={sectionHeaderStyle}>Tactical Operations</div>
          <div style={linkStyle('projects')} onClick={() => onSelect('projects')}>
            Projects & Tasks
          </div>
          <div style={linkStyle('processes')} onClick={() => onSelect('processes')}>
            Business Processes
          </div>
          <div style={linkStyle('resources')} onClick={() => onSelect('resources')}>
            Resource Tracking
          </div>
        </>
      )}

      {/* Decisions (Strategic, Tactical, Admin) */}
      {(isAdmin || isStrategic || isTactical) && (
        <>
          <div style={sectionHeaderStyle}>Decisions</div>
          <div style={linkStyle('decisions')} onClick={() => onSelect('decisions')}>
            Decisions Log
          </div>
        </>
      )}

      {/* Operational User Navigation */}
      {isOperational && (
        <>
          <div style={sectionHeaderStyle}>Daily Operations</div>
          <div style={linkStyle('enter-measurement')} onClick={() => onSelect('enter-measurement')}>
            Enter Measurement
          </div>
          <div style={linkStyle('my-tasks')} onClick={() => onSelect('my-tasks')}>
            My Assigned Tasks
          </div>
        </>
      )}

      {/* Shared Sustainability Overview */}
      <div style={sectionHeaderStyle}>Sustainability</div>
      <div style={linkStyle('indicators')} onClick={() => onSelect('indicators')}>
        Indicators & Metrics
      </div>
      <div style={linkStyle('reports')} onClick={() => onSelect('reports')}>
        Reports Archive
      </div>
    </aside>
  );
};
