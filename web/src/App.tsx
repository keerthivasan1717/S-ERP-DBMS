import React, { useState, useEffect } from 'react';
import { api } from './api/client.js';
import { Header } from './components/Header.js';
import { Sidebar, NavItemKey } from './components/Sidebar.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { UsersPage } from './pages/UsersPage.js';
import { DepartmentsPage } from './pages/DepartmentsPage.js';
import { EmployeesPage } from './pages/EmployeesPage.js';
import { OrganizationPage } from './pages/OrganizationPage.js';
import { AdminLevelsPage } from './pages/AdminLevelsPage.js';
import { ProjectsPage } from './pages/ProjectsPage.js';
import { ProcessesPage } from './pages/ProcessesPage.js';
import { ResourcesPage } from './pages/ResourcesPage.js';
import { DecisionsPage } from './pages/DecisionsPage.js';
import { IndicatorsPage } from './pages/IndicatorsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { MyTasksPage } from './pages/MyTasksPage.js';
import { EnterMeasurementPage } from './pages/EnterMeasurementPage.js';

export interface UserSession {
  userId: number;
  username: string;
  role: string;
  engine: string;
  empId?: number | null;
}

export const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<NavItemKey>('dashboard');

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get('/api/auth/me');
        if (res.user) {
          setUser(res.user);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
      setActiveItem('dashboard');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--ink-soft)' }}>Initializing S-ERP session...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard':
        return <DashboardPage role={user.role} />;
      case 'users':
        return <UsersPage />;
      case 'departments':
        return <DepartmentsPage />;
      case 'employees':
        return <EmployeesPage />;
      case 'organization':
        return <OrganizationPage />;
      case 'admin-levels':
        return <AdminLevelsPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'processes':
        return <ProcessesPage />;
      case 'resources':
        return <ResourcesPage />;
      case 'decisions':
        return <DecisionsPage userRole={user.role} />;
      case 'indicators':
        return <IndicatorsPage userRole={user.role} />;
      case 'reports':
        return <ReportsPage userRole={user.role} />;
      case 'my-tasks':
        return <MyTasksPage />;
      case 'enter-measurement':
        return <EnterMeasurementPage />;
      default:
        return <DashboardPage role={user.role} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        engine={user.engine}
        username={user.username}
        role={user.role}
        onLogout={handleLogout}
      />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar
          role={user.role}
          activeItem={activeItem}
          onSelect={(item) => setActiveItem(item)}
        />
        <main
          style={{
            flex: 1,
            padding: '1.75rem 2.25rem',
            backgroundColor: 'var(--paper)',
            overflowY: 'auto',
          }}
        >
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
