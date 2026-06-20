"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DataTable({
  columns,
  data,
  loading,
  error,
  emptyText = "Không có dữ liệu",
  renderRow,
}) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-emerald-100 bg-white shadow-[0_16px_42px_rgba(15,61,38,0.06)]">
      <Table>
        <TableHeader className="bg-emerald-50/80">
          <TableRow className="border-emerald-100">
            {columns.map((column) => (
              <TableHead
                key={column}
                className="h-11 px-4 text-xs font-black uppercase tracking-normal text-emerald-800"
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-28 px-4 text-center text-muted-foreground"
              >
                Đang tải dữ liệu...
              </TableCell>
            </TableRow>
          )}

          {!loading && error && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-28 px-4 text-center font-medium text-red-600"
              >
                {error}
              </TableCell>
            </TableRow>
          )}

          {!loading && !error && data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-28 px-4 text-center text-muted-foreground"
              >
                {emptyText}
              </TableCell>
            </TableRow>
          )}

          {!loading && !error && data.map(renderRow)}
        </TableBody>
      </Table>
    </div>
  );
}
