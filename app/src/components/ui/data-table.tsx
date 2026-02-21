"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { SkeletonTable } from "./skeleton";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  getRowId?: (row: T) => string;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string, direction: "asc" | "desc") => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  className?: string;
  stickyHeader?: boolean;
  compact?: boolean;
}

function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  emptyMessage = "No data available",
  emptyIcon,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  getRowId = (row) => String(row.id || row._id || Math.random()),
  sortColumn,
  sortDirection = "asc",
  onSort,
  pagination,
  onRowClick,
  rowActions,
  className,
  stickyHeader = true,
  compact = false,
}: DataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const allSelected = useMemo(() => {
    if (data.length === 0) return false;
    return data.every((row) => selectedRows.has(getRowId(row)));
  }, [data, selectedRows, getRowId]);

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map((row) => getRowId(row))));
    }
  };

  const handleRowSelect = (rowId: string) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    onSelectionChange(newSelected);
  };

  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    const newDirection = sortColumn === columnKey && sortDirection === "asc" ? "desc" : "asc";
    onSort(columnKey, newDirection);
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-600" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
    );
  };

  if (loading) {
    return <SkeletonTable rows={5} columns={columns.length} className={className} />;
  }

  const rowHeight = compact ? "h-11" : "h-12";

  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className={cn(
                "border-b border-zinc-800",
                stickyHeader && "sticky top-0 z-10 bg-[#09090B]"
              )}
            >
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <button
                    onClick={handleSelectAll}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      allSelected
                        ? "bg-indigo-500 border-indigo-500"
                        : "border-zinc-700 hover:border-zinc-500"
                    )}
                  >
                    {allSelected && <Check className="h-3 w-3 text-white" />}
                  </button>
                </th>
              )}

              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider text-left",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.sortable && "cursor-pointer select-none hover:text-zinc-300 transition-colors"
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      column.align === "center" && "justify-center",
                      column.align === "right" && "justify-end"
                    )}
                  >
                    <span>{column.header}</span>
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}

              {rowActions && <th className="w-10 px-4" />}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="py-8 text-center"
                >
                  <div className="flex flex-col items-center gap-1">
                    {emptyIcon && <div className="text-zinc-600">{emptyIcon}</div>}
                    <p className="text-sm text-zinc-500">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedRows.has(rowId);
                const isHovered = hoveredRow === rowId;

                return (
                  <tr
                    key={rowId}
                    className={cn(
                      rowHeight,
                      "border-b border-zinc-800/50 last:border-b-0 transition-colors",
                      isSelected && "bg-indigo-500/8",
                      !isSelected && isHovered && "bg-zinc-800/40",
                      onRowClick && "cursor-pointer"
                    )}
                    onMouseEnter={() => setHoveredRow(rowId)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRowSelect(rowId)}
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-indigo-500 border-indigo-500"
                              : "border-zinc-700 hover:border-zinc-500"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </button>
                      </td>
                    )}

                    {columns.map((column) => {
                      const value = row[column.key];
                      const rendered = column.render
                        ? column.render(value, row, 0)
                        : String(value ?? "\u2014");

                      return (
                        <td
                          key={column.key}
                          className={cn(
                            "px-4 py-2.5 text-sm text-zinc-300",
                            column.align === "center" && "text-center",
                            column.align === "right" && "text-right"
                          )}
                        >
                          {rendered}
                        </td>
                      );
                    })}

                    {rowActions && (
                      <td className="px-4" onClick={(e) => e.stopPropagation()}>
                        <div className={cn("transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
                          {rowActions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/50">
          <p className="text-xs text-zinc-500">
            {(pagination.page - 1) * pagination.pageSize + 1}&ndash;{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={cn(
                "p-1.5 rounded transition-colors",
                pagination.page === 1 ? "text-zinc-700" : "text-zinc-400 hover:bg-zinc-800"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-medium text-zinc-400 font-mono">
              {pagination.page}/{Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              className={cn(
                "p-1.5 rounded transition-colors",
                pagination.page * pagination.pageSize >= pagination.total ? "text-zinc-700" : "text-zinc-400 hover:bg-zinc-800"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RowActionButton({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors",
        className
      )}
    >
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );
}

export { DataTable, RowActionButton };
