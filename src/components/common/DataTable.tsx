import React, { ReactNode } from 'react';
import { Search, Filter, MoreVertical } from 'lucide-react';
import { Button } from './index';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  actions?: (item: T) => ReactNode;
  title?: string;
  searchPlaceholder?: string;
}

export function DataTable<T extends { id: string | number }>({ 
  data, 
  columns, 
  onRowClick, 
  actions,
  title,
  searchPlaceholder = "Search records..."
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {(title || searchPlaceholder) && (
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {title && <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{title}</h3>}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder={searchPlaceholder}
                className="bg-slate-50 border-none rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-accent/20 w-64"
              />
            </div>
            <Button variant="ghost" size="sm" icon={Filter} className="text-slate-400 h-8 font-bold">Filter</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              {columns.map((col, idx) => (
                <th key={idx} className={`px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${col.className}`}>
                  {col.header}
                </th>
              ))}
              {actions && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((item) => (
              <tr 
                key={item.id} 
                onClick={() => onRowClick?.(item)}
                className={`group transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50/50' : ''}`}
              >
                {columns.map((col, idx) => (
                  <td key={idx} className={`px-6 py-4 text-xs font-medium text-slate-600 ${col.className}`}>
                    {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as ReactNode)}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {actions(item)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
