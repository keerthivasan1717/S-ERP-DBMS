import React from 'react';

interface StatusTagProps {
  status: string;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
  const norm = status.toLowerCase().replace(/\s+/g, '-');
  return <span className={`status-tag ${norm}`}>{status}</span>;
};
