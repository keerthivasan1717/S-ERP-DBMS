import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../api/client.js';

interface EngineStatus {
  reachable: boolean;
  host: string;
  port: number;
  error?: string;
}

interface DualEngineStatus {
  mysql: EngineStatus;
  mongodb: EngineStatus;
}

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

const DEMO_ROLES = [
  { label: 'Administrator', username: 'admin', desc: 'Org, users & depts' },
  { label: 'Strategic Manager', username: 'strategic', desc: 'Indicators & policy' },
  { label: 'Tactical Manager', username: 'tactical', desc: 'Projects & tasks' },
  { label: 'Operational User', username: 'operator', desc: 'Measurements & logs' },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [engine, setEngine] = useState<'mysql' | 'mongodb'>('mysql');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [status, setStatus] = useState<DualEngineStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadEngineStatus() {
      try {
        const res = await api.get<DualEngineStatus>('/api/engines/status');
        setStatus(res);
      } catch (err: any) {
        if (err.details?.mysql && err.details?.mongodb) {
          setStatus(err.details);
        }
      } finally {
        setLoadingStatus(false);
      }
    }
    loadEngineStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const res = await api.post('/api/auth/login', {
        engine,
        username,
        password,
      });
      onLoginSuccess(res.user);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Connection error. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (roleUser: string) => {
    setUsername(roleUser);
    setPassword('1234');
    setErrorMessage(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--paper)',
      }}
    >
      {/* Left Overview Block */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '4rem 3rem',
          borderRight: '1px solid var(--line)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <div style={{ maxWidth: '440px', margin: '0 auto' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.5rem',
              color: 'var(--accent)',
              marginBottom: '0.4rem',
              fontWeight: 700,
            }}
          >
            S-ERP
          </h1>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--ink-soft)',
              marginBottom: '2rem',
              lineHeight: 1.4,
            }}
          >
            Sustainable Enterprise Resource Planning
          </p>

          <div
            style={{
              padding: '1.2rem',
              backgroundColor: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              fontSize: '0.85rem',
              color: 'var(--ink)',
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Dual-Engine Database Architecture</p>
            <p style={{ color: 'var(--ink-soft)', margin: 0 }}>
              The system operates interchangeably across <strong>MySQL 8.4 (Relational SQL)</strong> and{' '}
              <strong>MongoDB 6.0 (Document NoSQL)</strong>. Select your database engine to bind your session to that
              engine's connection pool.
            </p>

            <div
              style={{
                marginTop: '1rem',
                borderTop: '1px dashed var(--line)',
                paddingTop: '0.8rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: '0.5rem' }}>
                DEMO ACCOUNTS (PASSWORD: 1234)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                {DEMO_ROLES.map((r) => (
                  <button
                    key={r.username}
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleQuickFill(r.username)}
                    style={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      fontSize: '0.78rem',
                      padding: '0.35rem 0.5rem',
                      backgroundColor: username === r.username ? 'var(--surface-hover)' : 'var(--surface)',
                      borderColor: username === r.username ? 'var(--accent)' : 'var(--line)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)' }}>{r.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form */}
      <div
        style={{
          flex: '1.2',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '4rem 3rem',
        }}
      >
        <div style={{ maxWidth: '440px', width: '100%', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>Sign in</h2>

          <form onSubmit={handleSubmit}>
            {/* Database Engine Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label>Database Engine</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                {/* MySQL Option */}
                <div
                  onClick={() => setEngine('mysql')}
                  style={{
                    padding: '0.8rem',
                    backgroundColor: engine === 'mysql' ? 'var(--surface)' : 'var(--paper)',
                    border: engine === 'mysql' ? '2px solid var(--accent)' : '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <input
                      type="radio"
                      name="engine"
                      checked={engine === 'mysql'}
                      onChange={() => setEngine('mysql')}
                    />
                    <strong style={{ fontSize: '0.9rem' }}>SQL (MySQL)</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>
                    {status?.mysql ? `${status.mysql.host}:${status.mysql.port}` : '127.0.0.1:3307'}
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    {loadingStatus ? (
                      <span style={{ color: 'var(--ink-soft)' }}>checking...</span>
                    ) : status?.mysql?.reachable ? (
                      <span style={{ color: 'var(--moss)', fontWeight: 600 }}>● reachable</span>
                    ) : (
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>○ offline</span>
                    )}
                  </div>
                </div>

                {/* MongoDB Option */}
                <div
                  onClick={() => setEngine('mongodb')}
                  style={{
                    padding: '0.8rem',
                    backgroundColor: engine === 'mongodb' ? 'var(--surface)' : 'var(--paper)',
                    border: engine === 'mongodb' ? '2px solid var(--accent)' : '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <input
                      type="radio"
                      name="engine"
                      checked={engine === 'mongodb'}
                      onChange={() => setEngine('mongodb')}
                    />
                    <strong style={{ fontSize: '0.9rem' }}>NoSQL (MongoDB)</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>
                    {status?.mongodb ? `${status.mongodb.host}:${status.mongodb.port}` : '127.0.0.1:27017'}
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    {loadingStatus ? (
                      <span style={{ color: 'var(--ink-soft)' }}>checking...</span>
                    ) : status?.mongodb?.reachable ? (
                      <span style={{ color: 'var(--moss)', fontWeight: 600 }}>● reachable</span>
                    ) : (
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>○ offline</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Username Input */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>

            {/* Password Input */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                style={{
                  color: 'var(--danger)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius)',
                }}
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', padding: '0.6rem' }}
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
