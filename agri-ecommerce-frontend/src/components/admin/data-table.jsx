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
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column} className="h-11 px-4 text-xs uppercase">
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
                className="h-28 px-4 text-center text-red-600"
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
