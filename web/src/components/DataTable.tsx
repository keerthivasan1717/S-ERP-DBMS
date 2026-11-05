import React, { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = 'No records found.',
  pageSize = 20,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      const res = valA < valB ? -1 : 1;
      return sortDirection === 'asc' ? res : -res;
    });
  }, [data, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const currentPageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  return (
    <div className="table-container">
      <table className="ledger-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.sortable !== false ? 'sortable' : ''}
                onClick={() => col.sortable !== false && handleSort(col.key)}
              >
                {col.header}
                {sortKey === col.key && (
                  <span style={{ marginLeft: '4px' }}>
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {currentPageData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty-state">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            currentPageData.map((row, idx) => (
              <tr key={row.id || row.user_id || row.emp_id || row.dept_id || row.project_id || row.task_id || row.process_id || row.resource_id || row.indicator_id || row.decision_id || idx}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : (row[col.key] != null ? String(row[col.key]) : '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', borderTop: '1px solid var(--line)', fontSize: '0.82rem' }}>
          <span>
            Page {page} of {totalPages} ({data.length} total rows)
          </span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              className="btn btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
