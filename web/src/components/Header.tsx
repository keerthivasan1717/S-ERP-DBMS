import React from 'react';

interface HeaderProps {
  engine: string;
  username: string;
  role: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ engine, username, role, onLogout }) => {
  const engineLabel = engine === 'mysql' ? 'SQL (MySQL 8.4)' : 'NoSQL (MongoDB 6.0)';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.65rem 1.25rem',
        borderBottom: '1px solid var(--line)',
        backgroundColor: 'var(--surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '0.02em',
          }}
        >
          S-ERP
        </span>
        <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
          Sustainable Enterprise Resource Planning
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.2rem 0.6rem',
            backgroundColor: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            fontSize: '0.82rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span style={{ color: 'var(--ink-soft)' }}>Engine:</span>
          <strong>{engineLabel}</strong>
        </div>

        <div style={{ fontSize: '0.85rem' }}>
          <strong>{username}</strong>{' '}
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.78rem' }}>({role})</span>
        </div>

        <button className="btn btn-sm" onClick={onLogout} style={{ border: '1px solid var(--line)' }}>
          Sign out
        </button>
      </div>
    </header>
  );
};
