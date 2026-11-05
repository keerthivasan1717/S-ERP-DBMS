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

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--paper)',
      }}
    >
      {/* Left Block */}
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
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.4rem',
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
              The system operates interchangeably across MySQL 8.4 (SQL) and MongoDB 6.0 (NoSQL). Select your target
              database engine below to initiate a role-authenticated session.
            </p>
            <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--ink-soft)', borderTop: '1px dashed var(--line)', paddingTop: '0.6rem' }}>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Demo accounts:</strong> admin, tactical, strategic, operator</p>
              <p style={{ margin: 0 }}><strong>Password:</strong> <code style={{ backgroundColor: 'var(--surface)', padding: '0.15rem 0.4rem', borderRadius: '3px', border: '1px solid var(--line)' }}>1234</code></p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form */}
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
              <label>Database</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                {/* MySQL Selector */}
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
                      <span style={{ color: 'var(--moss)', fontWeight: 600 }}>reachable</span>
                    ) : (
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>not reachable</span>
                    )}
                  </div>
                </div>

                {/* MongoDB Selector */}
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
                      <span style={{ color: 'var(--moss)', fontWeight: 600 }}>reachable</span>
                    ) : (
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>not reachable</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Username */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>

            {/* Error notice in plain text */}
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
