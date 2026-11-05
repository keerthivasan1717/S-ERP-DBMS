import React from 'react';

interface EmptyStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Records Found',
  message,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        padding: '2.5rem 1.5rem',
        border: '1px dashed var(--line)',
        borderRadius: 'var(--radius)',
        backgroundColor: 'var(--surface)',
        textAlign: 'center',
        margin: '1rem 0',
      }}
    >
      <h4
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.05rem',
          color: 'var(--ink)',
          marginBottom: '0.4rem',
        }}
      >
        {title}
      </h4>
      <p
        style={{
          color: 'var(--ink-soft)',
          fontSize: '0.85rem',
          maxWidth: '400px',
          margin: '0 auto 1rem auto',
        }}
      >
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          className="btn btn-sm"
          onClick={onAction}
          style={{ borderColor: 'var(--line-strong)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
