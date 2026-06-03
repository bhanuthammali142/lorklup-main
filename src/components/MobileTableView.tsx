// src/components/MobileTableView.tsx
import React from 'react'

export interface Column<T> {
  header: string
  key: string
  render?: (row: T) => React.ReactNode
}

interface MobileTableViewProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string | number
  onRowClick?: (item: T) => void
  emptyMessage?: string
}

export function MobileTableView<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No records found.'
}: MobileTableViewProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/20 border border-slate-900 rounded-2xl">
        <p className="text-sm font-semibold">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Desktop view */}
      <div className="hidden md:block table-container-responsive">
        <table className="table-premium">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="table-premium-th">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr 
                key={keyExtractor(row)} 
                className={onRowClick ? "cursor-pointer hover:bg-slate-900/60 transition" : ""}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, idx) => (
                  <td key={idx} className="table-premium-td">
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div 
            key={keyExtractor(row)}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm hover:border-slate-700/60 transition active:scale-[0.99] flex flex-col gap-2.5"
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col, idx) => {
              // Usually the first column is the main identifier (e.g. Student Name, Room ID)
              const isHeader = idx === 0
              const value = col.render ? col.render(row) : (row as any)[col.key]
              
              if (isHeader) {
                return (
                  <div key={idx} className="border-b border-slate-800 pb-2 flex justify-between items-center">
                    <span className="text-sm font-bold text-white leading-tight">{value}</span>
                  </div>
                )
              }
              
              return (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{col.header}</span>
                  <span className="font-medium text-slate-200">{value}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
export default MobileTableView
