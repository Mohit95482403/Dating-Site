import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: React.ReactNode;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
}

export function AdminTable<T extends { id: number | string }>({
  columns,
  data,
  loading = false,
  emptyTitle = 'No records found',
  emptySubtitle = 'There are currently no items matching your criteria.',
  emptyIcon = '📭',
  page,
  totalPages,
  totalItems,
  onPageChange,
}: AdminTableProps<T>) {
  return (
    <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width, minWidth: col.width } : undefined}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="admin-loading-row">
                <td colSpan={columns.length}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '2rem 0' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid rgba(255,255,255,0.1)',
                      borderTopColor: '#6366f1',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    <span>Loading data from database...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="admin-empty-state">
                    <div className="admin-empty-icon">{emptyIcon}</div>
                    <div className="admin-empty-title">{emptyTitle}</div>
                    <p style={{ fontSize: '0.85rem' }}>{emptySubtitle}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="admin-pagination">
          <div>
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} total records)
          </div>
          <div className="admin-page-btns">
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTable;
