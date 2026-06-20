"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleDollarSign, Clock3, Eye, PackageCheck, Search } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/admin-utils";
import { mockOrders, orderStatusOptions } from "@/lib/admin-mock-data";

export default function AdminOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return mockOrders.filter((order) => {
      const matchesKeyword =
        !keyword ||
        [
          `#${order.id}`,
          String(order.id),
          order.customerName,
          order.email,
          order.phone,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const orderStats = useMemo(() => {
    const revenue = mockOrders.reduce(
      (total, order) => total + Number(order.totalPrice || 0),
      0
    );
    const pending = mockOrders.filter((order) => order.status === "pending").length;
    const processing = mockOrders.filter((order) => order.status === "processing")
      .length;
    const completed = mockOrders.filter((order) =>
      ["delivered", "completed"].includes(order.status)
    ).length;

    return { revenue, pending, processing, completed };
  }, []);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Quản lí đơn hàng"
        description="Theo dõi đơn hàng, trạng thái xử lý, thanh toán và chi tiết từng sản phẩm trong đơn."
        image="/admin-assets/orders.svg"
        badges={["Dữ liệu mẫu", "Theo bảng orders"]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng doanh thu"
          value={formatCurrency(orderStats.revenue)}
          description="Từ danh sách đơn mẫu"
          icon={CircleDollarSign}
          tone="green"
        />
        <StatCard
          title="Chờ xử lý"
          value={orderStats.pending}
          description="Cần xác nhận đơn"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          title="Đang xử lý"
          value={orderStats.processing}
          description="Đang chuẩn bị hoặc giao"
          icon={PackageCheck}
          tone="blue"
        />
        <StatCard
          title="Đã hoàn tất"
          value={orderStats.completed}
          description="Đã giao/hoàn tất"
          icon={CheckCircle2}
          tone="rose"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo mã đơn, khách hàng, email"
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          {orderStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={[
          "Mã đơn",
          "Khách hàng",
          "Ngày tạo",
          "Trạng thái",
          "Thanh toán",
          "Tổng tiền",
          "Chi tiết",
        ]}
        data={filteredOrders}
        emptyText="Không tìm thấy đơn hàng"
        renderRow={(order) => (
          <TableRow key={order.id}>
            <TableCell className="px-4 font-medium">#{order.id}</TableCell>
            <TableCell className="px-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{order.customerName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {order.email}
                </p>
              </div>
            </TableCell>
            <TableCell className="px-4">{formatDate(order.createdAt)}</TableCell>
            <TableCell className="px-4">
              <StatusBadge status={order.status} />
            </TableCell>
            <TableCell className="px-4">
              <div className="flex items-center gap-2">
                <span className="capitalize">{order.paymentMethod}</span>
                <StatusBadge status={order.paymentStatus} />
              </div>
            </TableCell>
            <TableCell className="px-4 font-medium">
              {formatCurrency(order.totalPrice)}
            </TableCell>
            <TableCell className="px-4">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Xem chi tiết đơn hàng"
                aria-label="Xem chi tiết đơn hàng"
                onClick={() => setSelectedOrder(order)}
              >
                <Eye className="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          {selectedOrder && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Đơn hàng #{selectedOrder.id}</DialogTitle>
                <DialogDescription>
                  Dữ liệu mẫu được dựng theo cấu trúc bảng orders.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Khách hàng
                  </p>
                  <p className="mt-1 font-medium">{selectedOrder.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.phone}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Địa chỉ
                  </p>
                  <p className="mt-1 text-sm">{selectedOrder.address}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Trạng thái
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Thanh toán
                  </p>
                  <p className="mt-1 text-sm capitalize">
                    {selectedOrder.paymentMethod} · {selectedOrder.paymentStatus}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="px-4">Sản phẩm</TableHead>
                      <TableHead className="px-4">SL</TableHead>
                      <TableHead className="px-4">Giá</TableHead>
                      <TableHead className="px-4 text-right">Tạm tính</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={`${selectedOrder.id}-${item.productName}`}>
                        <TableCell className="px-4 font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="px-4">{item.quantity}</TableCell>
                        <TableCell className="px-4">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="px-4 text-right font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="ml-auto w-full max-w-sm space-y-2 rounded-lg border bg-card p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Giảm giá</span>
                  <span>{formatCurrency(selectedOrder.discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phí giao hàng</span>
                  <span>{formatCurrency(selectedOrder.shippingFee)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold">
                  <span>Tổng cộng</span>
                  <span>{formatCurrency(selectedOrder.totalPrice)}</span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedOrder(null)}
                >
                  Đóng
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
