/**
 * Table — Minimal_Clean spec
 *
 * Neutral surfaces, 8pt spacing, rounded corners, thin 1px borders,
 * minimal shadows, visible keyboard focus, hover/press states,
 * disabled reduced contrast, accessible labels.
 */

import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> extends HTMLAttributes<HTMLTableElement> {
  columns: ColumnDef<T>[];
  data: T[];
  keyAccessor: (row: T) => string;
  striped?: boolean;
  hoverable?: boolean;
  selectable?: boolean;
  onRowSelect?: (row: T) => void;
  selectedKeys?: Set<string>;
  emptyMessage?: string;
}

function Table<T>({
  columns,
  data,
  keyAccessor,
  striped = true,
  hoverable = true,
  selectable = false,
  onRowSelect,
  selectedKeys = new Set(),
  emptyMessage = "No data",
  className,
  children,
  ...props
}: TableProps<T>) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-[var(--Eulinx-radius-lg)] border border-[var(--Eulinx-color-border)]", className)}>
      <table className="w-full caption-bottom text-sm" {...props}>
        <thead className="bg-[var(--Eulinx-color-surface-alt)] border-b border-[var(--Eulinx-color-border)]">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={cn(
                  "h-10 px-3 text-left font-medium text-[var(--Eulinx-color-text-secondary)]",
                  "border-b border-[var(--Eulinx-color-border)]",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-24 px-3 text-center text-[var(--Eulinx-color-text-muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => {
              const key = keyAccessor(row);
              const isSelected = selectedKeys.has(key);

              return (
                <tr
                  key={key}
                  className={cn(
                    "border-b border-[var(--Eulinx-color-border)]",
                    "transition-colors duration-[var(--Eulinx-duration-hover)]",
                    striped && rowIndex % 2 === 0 && "bg-[var(--Eulinx-color-surface-alt)]",
                    hoverable && "hover:bg-[var(--Eulinx-color-hover)]",
                    selectable && "cursor-pointer",
                    isSelected && "bg-[var(--Eulinx-color-selected)]",
                  )}
                  onClick={() => selectable && onRowSelect?.(row)}
                >
                  {columns.map((column) => (
                    <td key={column.header} className={cn("px-3 py-3 text-[var(--Eulinx-color-text)]", column.className)}>
                      {column.cell ? column.cell(row) : row[column.accessorKey as keyof T] as unknown as ReactNode}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

Table.displayName = "Table";

export { Table };