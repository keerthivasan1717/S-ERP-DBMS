import React, { useState, useMemo } from 'react';
import { EmptyState } from './EmptyState.js';

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
  searchable?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = 'No records matching criteria.',
  pageSize = 15,
  searchable = true,
}: DataTableProps<T>) {
  const [filterText, setFilterText] = useState('');
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

  const filteredData = useMemo(() => {
    if (!filterText.trim()) return data;
    const lower = filterText.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        if (val == null) return false;
        return String(val).toLowerCase().includes(lower);
      })
    );
  }, [data, columns, filterText]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      const res = valA < valB ? -1 : 1;
      return sortDirection === 'asc' ? res : -res;
    });
  }, [filteredData, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const currentPageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  return (
    <div>
      {searchable && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.6rem',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
            Showing <strong>{sortedData.length}</strong> {sortedData.length === 1 ? 'entry' : 'entries'}
            {filterText && ` (filtered from ${data.length} total)`}
          </div>
          <div style={{ maxWidth: '260px', width: '100%' }}>
            <input
              type="text"
              placeholder="Search / filter entries..."
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setPage(1);
              }}
              style={{
                fontSize: '0.82rem',
                padding: '0.35rem 0.6rem',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
              }}
            />
          </div>
        </div>
      )}

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
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>{col.header}</span>
                    {sortKey === col.key && (
                      <span style={{ fontSize: '0.7rem' }}>
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentPageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0, border: 'none' }}>
                  <EmptyState message={emptyMessage} />
                </td>
              </tr>
            ) : (
              currentPageData.map((row, idx) => (
                <tr
                  key={
                    row.id ||
                    row.user_id ||
                    row.emp_id ||
                    row.dept_id ||
                    row.project_id ||
                    row.task_id ||
                    row.process_id ||
                    row.resource_id ||
                    row.indicator_id ||
                    row.decision_id ||
                    idx
                  }
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row)
                        : row[col.key] != null
                        ? String(row[col.key])
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.55rem 0.8rem',
              borderTop: '1px solid var(--line)',
              fontSize: '0.82rem',
              backgroundColor: 'var(--paper)',
            }}
          >
            <span>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                className="btn btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
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
    </div>
  );
}
