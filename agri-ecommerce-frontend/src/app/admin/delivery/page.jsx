"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Search, Truck, UserCheck } from "lucide-react";

import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  deliveryStatusOptions,
  mockDeliveryOrders,
  mockDeliveryStaff,
} from "@/lib/admin-mock-data";
import { formatCurrency, formatDate, formatNumber } from "@/lib/admin-utils";

export default function AdminDeliveryPage() {
  const [deliveries, setDeliveries] = useState(mockDeliveryOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");

  const stats = useMemo(() => {
    const waiting = deliveries.filter((order) => !order.deliveryStaffId).length;
    const delivering = deliveries.filter(
      (order) => order.status === "processing"
    ).length;
    const completed = deliveries.filter((order) =>
      ["delivered", "completed"].includes(order.status)
    ).length;

    return { waiting, delivering, completed };
  }, [deliveries]);

  const filteredDeliveries = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return deliveries.filter((order) => {
      const matchesKeyword =
        !keyword ||
        [
          `#${order.id}`,
          String(order.id),
          order.customerName,
          order.phone,
          order.address,
          order.deliveryStaffName,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      const matchesStaff =
        staffFilter === "all" ||
        (staffFilter === "unassigned" && !order.deliveryStaffId) ||
        String(order.deliveryStaffId) === String(staffFilter);

      return matchesKeyword && matchesStatus && matchesStaff;
    });
  }, [deliveries, searchTerm, statusFilter, staffFilter]);

  function assignStaff(orderId, staffId) {
    const staff = mockDeliveryStaff.find(
      (item) => String(item.id) === String(staffId)
    );

    setDeliveries((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              deliveryStaffId: staff?.id || null,
              deliveryStaffName: staff?.name || "",
              status: staff ? "processing" : "pending",
              dispatchedAt: staff ? new Date().toISOString() : null,
            }
          : order
      )
    );
  }

  function updateDeliveryStatus(orderId, status) {
    setDeliveries((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status,
              deliveredAt:
                ["delivered", "completed"].includes(status) && !order.deliveredAt
                  ? new Date().toISOString()
                  : order.deliveredAt,
            }
          : order
      )
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Đơn chờ phân công"
          value={formatNumber(stats.waiting)}
          description="Chưa có nhân viên giao"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          title="Đang giao"
          value={formatNumber(stats.delivering)}
          description="Đơn đang vận chuyển"
          icon={Truck}
          tone="blue"
        />
        <StatCard
          title="Đã hoàn tất"
          value={formatNumber(stats.completed)}
          description="Đã giao hoặc hoàn tất"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          title="Nhân viên giao hàng"
          value={formatNumber(mockDeliveryStaff.length)}
          description="Dữ liệu mẫu theo role delivery_staff"
          icon={UserCheck}
          tone="rose"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {mockDeliveryStaff.map((staff) => (
          <Card key={staff.id} className="rounded-lg border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="truncate">{staff.name}</span>
                <StatusBadge status={staff.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Khu vực</p>
                <p className="mt-1 font-medium">{staff.area}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Đang giao</p>
                <p className="mt-1 font-medium">
                  {formatNumber(staff.currentOrders)} đơn
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Hoàn tất</p>
                <p className="mt-1 font-medium">
                  {formatNumber(staff.completedOrders)} đơn
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo mã đơn, khách hàng, địa chỉ"
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          {deliveryStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={staffFilter}
          onChange={(event) => setStaffFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          <option value="all">Tất cả nhân viên</option>
          <option value="unassigned">Chưa phân công</option>
          {mockDeliveryStaff.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={[
          "Mã đơn",
          "Khách hàng",
          "Nhân viên giao",
          "Trạng thái",
          "Thời gian",
          "Tổng tiền",
        ]}
        data={filteredDeliveries}
        emptyText="Không tìm thấy đơn giao hàng"
        renderRow={(order) => (
          <TableRow key={order.id}>
            <TableCell className="px-4 font-medium">#{order.id}</TableCell>
            <TableCell className="px-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{order.customerName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {order.phone} · {order.address}
                </p>
              </div>
            </TableCell>
            <TableCell className="px-4">
              <select
                value={order.deliveryStaffId || ""}
                onChange={(event) => assignStaff(order.id, event.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              >
                <option value="">Chưa phân công</option>
                {mockDeliveryStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </TableCell>
            <TableCell className="px-4">
              <select
                value={order.status}
                onChange={(event) =>
                  updateDeliveryStatus(order.id, event.target.value)
                }
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              >
                {deliveryStatusOptions
                  .filter((option) => option.value !== "all")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
              <div className="mt-2">
                <StatusBadge status={order.status} />
              </div>
            </TableCell>
            <TableCell className="px-4">
              <div className="text-xs text-muted-foreground">
                <p>Tạo: {formatDate(order.createdAt)}</p>
                <p>Giao: {formatDate(order.dispatchedAt)}</p>
                <p>Nhận: {formatDate(order.deliveredAt)}</p>
              </div>
            </TableCell>
            <TableCell className="px-4 font-medium">
              {formatCurrency(order.totalPrice)}
            </TableCell>
          </TableRow>
        )}
      />
    </div>
  );
}
