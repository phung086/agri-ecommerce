"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Truck,
  UserCheck,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getApiErrorMessage,
} from "@/lib/admin-utils";
import { adminService } from "@/services/admin.service";

const ORDER_FETCH_PARAMS = {
  page: 0,
  size: 100,
  sort: "createdAt,desc",
};

const DELIVERY_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "processing", label: "Đang xử lý" },
  { value: "ready_for_delivery", label: "Sẵn sàng giao" },
  { value: "out_for_delivery", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "completed", label: "Hoàn tất" },
];

const DELIVERY_STATUSES = new Set(
  DELIVERY_STATUS_OPTIONS.filter((option) => option.value !== "all").map(
    (option) => option.value
  )
);

const NEXT_STATUSES = {
  processing: "ready_for_delivery",
  ready_for_delivery: "out_for_delivery",
  out_for_delivery: "delivered",
  delivered: "completed",
};

const STATUS_LABELS = Object.fromEntries(
  DELIVERY_STATUS_OPTIONS.map((option) => [option.value, option.label])
);

function readPageContent(response) {
  if (Array.isArray(response?.content)) {
    return response.content;
  }

  return Array.isArray(response) ? response : [];
}

function getCustomerName(order) {
  return order.customerName || order.shippingAddress?.fullName || "Khách hàng";
}

function getCustomerPhone(order) {
  return order.customerPhoneNumber || order.shippingAddress?.phone || "";
}

function getShippingAddress(order) {
  const shippingAddress = order.shippingAddress;

  if (!shippingAddress) {
    return "Chưa có địa chỉ";
  }

  return [shippingAddress.address, shippingAddress.city]
    .filter(Boolean)
    .join(", ");
}

function getActionKey(orderId, action) {
  return `${orderId}:${action}`;
}

export default function AdminDeliveryPage() {
  const [orders, setOrders] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDeliveryData() {
      setLoading(true);
      setError("");

      const [ordersResult, staffResult] = await Promise.allSettled([
        adminService.getOrders(ORDER_FETCH_PARAMS),
        adminService.getActiveDeliveryStaff(),
      ]);

      if (!mounted) {
        return;
      }

      if (ordersResult.status === "fulfilled") {
        setOrders(
          readPageContent(ordersResult.value).filter((order) =>
            DELIVERY_STATUSES.has(order.status)
          )
        );
      } else {
        setOrders([]);
        setError(getApiErrorMessage(ordersResult.reason));
      }

      if (staffResult.status === "fulfilled") {
        setStaff(Array.isArray(staffResult.value) ? staffResult.value : []);
      } else {
        setStaff([]);
      }

      setLoading(false);
    }

    loadDeliveryData();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const waiting = orders.filter(
      (order) =>
        order.status === "processing" ||
        (order.status === "ready_for_delivery" && !order.deliveryStaffId)
    ).length;
    const delivering = orders.filter(
      (order) => order.status === "out_for_delivery"
    ).length;
    const completed = orders.filter((order) =>
      ["delivered", "completed"].includes(order.status)
    ).length;

    return { waiting, delivering, completed };
  }, [orders]);

  const staffSummaries = useMemo(
    () =>
      staff.map((member) => {
        const assignedOrders = orders.filter(
          (order) => String(order.deliveryStaffId) === String(member.id)
        );

        return {
          ...member,
          currentOrders: assignedOrders.filter((order) =>
            ["ready_for_delivery", "out_for_delivery"].includes(order.status)
          ).length,
          completedOrders: assignedOrders.filter((order) =>
            ["delivered", "completed"].includes(order.status)
          ).length,
        };
      }),
    [orders, staff]
  );

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesKeyword =
        !keyword ||
        [
          `#${order.id}`,
          String(order.id),
          getCustomerName(order),
          getCustomerPhone(order),
          getShippingAddress(order),
          order.deliveryStaffName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      const matchesStaff =
        staffFilter === "all" ||
        (staffFilter === "unassigned" && !order.deliveryStaffId) ||
        String(order.deliveryStaffId) === String(staffFilter);

      return matchesKeyword && matchesStatus && matchesStaff;
    });
  }, [orders, searchTerm, statusFilter, staffFilter]);

  function updateOrderInState(updatedOrder) {
    setOrders((current) =>
      current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );
  }

  async function refreshDeliveryData() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const [ordersResponse, staffResponse] = await Promise.all([
        adminService.getOrders(ORDER_FETCH_PARAMS),
        adminService.getActiveDeliveryStaff(),
      ]);

      setOrders(
        readPageContent(ordersResponse).filter((order) =>
          DELIVERY_STATUSES.has(order.status)
        )
      );
      setStaff(Array.isArray(staffResponse) ? staffResponse : []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function assignStaff(order, staffId) {
    if (!staffId) {
      return;
    }

    const key = getActionKey(order.id, "assign");
    setActionLoading(key);
    setError("");
    setNotice("");

    try {
      const updatedOrder = await adminService.assignDeliveryStaff(order.id, {
        deliveryStaffId: Number(staffId),
        note: "Phân công từ trang quản lí giao hàng.",
      });
      updateOrderInState(updatedOrder);
      setNotice(`Đã phân công nhân viên giao hàng cho đơn #${order.id}.`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading("");
    }
  }

  async function updateDeliveryStatus(order, status) {
    if (!status) {
      return;
    }

    const key = getActionKey(order.id, `status:${status}`);
    setActionLoading(key);
    setError("");
    setNotice("");

    try {
      const updatedOrder = await adminService.updateOrderStatus(order.id, {
        status,
        note: "Cập nhật từ trang quản lí giao hàng.",
      });
      updateOrderInState(updatedOrder);
      setNotice(
        `Đã cập nhật đơn #${order.id} sang ${
          STATUS_LABELS[status] || status
        }.`
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading("");
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Quản lí giao hàng"
        description="Phân công nhân viên giao hàng và cập nhật trạng thái vận chuyển bằng API đơn hàng thật."
        image="/admin-assets/delivery.svg"
        badges={["Admin API", "Delivery staff", "Order workflow"]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Đơn chờ điều phối"
          value={formatNumber(stats.waiting)}
          description="Đang xử lý hoặc chưa phân công"
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
          value={formatNumber(staff.length)}
          description="Role delivery_staff active"
          icon={UserCheck}
          tone="rose"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {staffSummaries.map((member) => (
          <Card key={member.id} className="rounded-lg border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="truncate">{member.name}</span>
                <StatusBadge status={member.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Liên hệ
                </p>
                <p className="mt-1 font-medium">
                  {member.phoneNumber || member.email || "Chưa có"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Đang giao
                </p>
                <p className="mt-1 font-medium">
                  {formatNumber(member.currentOrders)} đơn
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Hoàn tất
                </p>
                <p className="mt-1 font-medium">
                  {formatNumber(member.completedOrders)} đơn
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
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
          {DELIVERY_STATUS_OPTIONS.map((option) => (
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
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="outline"
          onClick={refreshDeliveryData}
          disabled={loading}
          className="font-bold"
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          Làm mới
        </Button>
      </div>

      {(notice || error) && (
        <div
          className={`rounded-[8px] border px-4 py-3 text-sm font-semibold ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || notice}
        </div>
      )}

      <DataTable
        columns={[
          "Mã đơn",
          "Khách hàng",
          "Nhân viên giao",
          "Trạng thái",
          "Thời gian",
          "Tổng tiền",
        ]}
        data={filteredOrders}
        loading={loading}
        error={loading || orders.length === 0 ? error : ""}
        emptyText="Không tìm thấy đơn giao hàng"
        renderRow={(order) => {
          const nextStatus = NEXT_STATUSES[order.status];
          const rowBusy = actionLoading.startsWith(`${order.id}:`);
          const canMoveNext =
            nextStatus &&
            (nextStatus !== "out_for_delivery" || order.deliveryStaffId);

          return (
            <TableRow key={order.id}>
              <TableCell className="px-4 font-medium">#{order.id}</TableCell>
              <TableCell className="px-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{getCustomerName(order)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getCustomerPhone(order)} · {getShippingAddress(order)}
                  </p>
                </div>
              </TableCell>
              <TableCell className="px-4">
                <select
                  value={order.deliveryStaffId || ""}
                  disabled={
                    rowBusy ||
                    ["delivered", "completed"].includes(order.status)
                  }
                  onChange={(event) => assignStaff(order, event.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
                >
                  <option value="">Chưa phân công</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                {order.deliveryStaffName && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.deliveryStaffName}
                  </p>
                )}
              </TableCell>
              <TableCell className="px-4">
                <div className="space-y-2">
                  <StatusBadge status={order.status} />
                  {nextStatus && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={rowBusy || !canMoveNext}
                      onClick={() => updateDeliveryStatus(order, nextStatus)}
                    >
                      {actionLoading ===
                      getActionKey(order.id, `status:${nextStatus}`) ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Truck className="size-3.5" />
                      )}
                      {STATUS_LABELS[nextStatus] || nextStatus}
                    </Button>
                  )}
                  {nextStatus === "out_for_delivery" &&
                    !order.deliveryStaffId && (
                      <p className="text-xs font-medium text-amber-700">
                        Cần phân công trước
                      </p>
                    )}
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
          );
        }}
      />
    </div>
  );
}
