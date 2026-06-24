"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";

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

const ORDER_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả đơn hàng" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "processing", label: "Đang xử lý" },
  { value: "ready_for_delivery", label: "Sẵn sàng giao" },
  { value: "out_for_delivery", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "completed", label: "Hoàn tất" },
  { value: "canceled", label: "Đã hủy" },
];

const STATUS_LABELS = Object.fromEntries(
  ORDER_STATUS_OPTIONS.filter((option) => option.value !== "all").map(
    (option) => [option.value, option.label]
  )
);

const STATUS_PROGRESSION = {
  processing: ["ready_for_delivery"],
  ready_for_delivery: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: ["completed"],
};

const CANCELLABLE_STATUSES = new Set([
  "pending",
  "processing",
  "ready_for_delivery",
]);

function readOrderPage(response) {
  const content = Array.isArray(response?.content)
    ? response.content
    : Array.isArray(response)
      ? response
      : [];

  return {
    content,
    meta: {
      totalElements: Number(response?.totalElements ?? content.length),
      totalPages: Number(response?.totalPages ?? 1),
      page: Number(response?.page ?? 0),
      size: Number(response?.size ?? content.length),
      last: Boolean(response?.last ?? true),
    },
  };
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
    return "Chưa có địa chỉ giao hàng";
  }

  return [shippingAddress.address, shippingAddress.city]
    .filter(Boolean)
    .join(", ");
}

function getPaymentMethod(order) {
  return order.payment?.paymentMethod || "cash";
}

function getPaymentStatus(order) {
  return order.payment?.status || "pending";
}

function getNextStatuses(order) {
  const nextStatuses = STATUS_PROGRESSION[order.status] || [];

  if (order.status === "ready_for_delivery" && !order.deliveryStaffId) {
    return [];
  }

  return nextStatuses;
}

function canCancelOrder(order) {
  return CANCELLABLE_STATUSES.has(order.status);
}

function getActionKey(orderId, action) {
  return `${orderId}:${action}`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [pageMeta, setPageMeta] = useState({
    totalElements: 0,
    totalPages: 1,
    page: 0,
    size: ORDER_FETCH_PARAMS.size,
    last: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      setLoading(true);
      setError("");

      try {
        const response = await adminService.getOrders(ORDER_FETCH_PARAMS);
        const orderPage = readOrderPage(response);

        if (mounted) {
          setOrders(orderPage.content);
          setPageMeta(orderPage.meta);
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesKeyword =
        !keyword ||
        [
          `#${order.id}`,
          String(order.id),
          getCustomerName(order),
          order.customerEmail,
          getCustomerPhone(order),
          getShippingAddress(order),
          order.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const orderStats = useMemo(() => {
    const revenue = orders
      .filter((order) => order.status !== "canceled")
      .reduce((total, order) => total + Number(order.totalPrice || 0), 0);
    const pending = orders.filter((order) => order.status === "pending").length;
    const processing = orders.filter((order) =>
      ["processing", "ready_for_delivery", "out_for_delivery"].includes(
        order.status
      )
    ).length;
    const completed = orders.filter((order) =>
      ["delivered", "completed"].includes(order.status)
    ).length;

    return { revenue, pending, processing, completed };
  }, [orders]);

  function updateOrderInState(updatedOrder) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
      )
    );
    setSelectedOrder((currentOrder) =>
      currentOrder?.id === updatedOrder.id
        ? { ...currentOrder, ...updatedOrder }
        : currentOrder
    );
  }

  async function refreshOrders() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await adminService.getOrders(ORDER_FETCH_PARAMS);
      const orderPage = readOrderPage(response);

      setOrders(orderPage.content);
      setPageMeta(orderPage.meta);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function runOrderAction(order, action, handler, successMessage) {
    const key = getActionKey(order.id, action);

    setActionLoading(key);
    setError("");
    setNotice("");

    try {
      const updatedOrder = await handler();
      updateOrderInState(updatedOrder);
      setNotice(successMessage(updatedOrder));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading("");
    }
  }

  function handleConfirmOrder(order) {
    runOrderAction(
      order,
      "confirm",
      () =>
        adminService.confirmOrder(order.id, {
          note: "Xác nhận từ trang quản trị đơn hàng.",
        }),
      (updatedOrder) =>
        `Đã xác nhận đơn #${updatedOrder.id}. Trạng thái hiện tại: ${
          STATUS_LABELS[updatedOrder.status] || updatedOrder.status
        }.`
    );
  }

  function handleCancelOrder(order) {
    runOrderAction(
      order,
      "cancel",
      () =>
        adminService.cancelOrder(order.id, {
          note: "Hủy từ trang quản trị đơn hàng.",
        }),
      (updatedOrder) => `Đã hủy đơn #${updatedOrder.id}.`
    );
  }

  function handleStatusChange(order, status) {
    if (!status) {
      return;
    }

    runOrderAction(
      order,
      `status:${status}`,
      () =>
        adminService.updateOrderStatus(order.id, {
          status,
          note: "Cập nhật trạng thái từ trang quản trị đơn hàng.",
        }),
      (updatedOrder) =>
        `Đã cập nhật đơn #${updatedOrder.id} sang ${
          STATUS_LABELS[updatedOrder.status] || updatedOrder.status
        }.`
    );
  }

  async function handleViewOrder(order) {
    setSelectedOrder(order);
    setDetailLoading(true);
    setError("");

    try {
      const detail = await adminService.getOrder(order.id);
      setSelectedOrder(detail);
      updateOrderInState(detail);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Quản lí đơn hàng"
        description="Theo dõi đơn hàng thật từ backend, xác nhận, hủy và cập nhật trạng thái theo luồng vận hành."
        image="/admin-assets/orders.svg"
        badges={["API thật", "Admin orders", "Order workflow"]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng doanh thu"
          value={formatCurrency(orderStats.revenue)}
          description={`Trong ${formatNumber(orders.length)} đơn mới nhất`}
          icon={CircleDollarSign}
          tone="green"
        />
        <StatCard
          title="Chờ xử lý"
          value={orderStats.pending}
          description="Cần xác nhận hoặc hủy"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          title="Đang xử lý"
          value={orderStats.processing}
          description="Đang chuẩn bị/giao"
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
            placeholder="Tìm theo mã đơn, khách hàng, email, số điện thoại"
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          {ORDER_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="outline"
          onClick={refreshOrders}
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
          "Ngày tạo",
          "Trạng thái",
          "Thanh toán",
          "Tổng tiền",
          "Thao tác",
          "Chi tiết",
        ]}
        data={filteredOrders}
        loading={loading}
        error={loading || orders.length === 0 ? error : ""}
        emptyText="Không tìm thấy đơn hàng"
        renderRow={(order) => {
          const nextStatuses = getNextStatuses(order);
          const rowBusy = actionLoading.startsWith(`${order.id}:`);

          return (
            <TableRow key={order.id}>
              <TableCell className="px-4 font-medium">#{order.id}</TableCell>
              <TableCell className="px-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {getCustomerName(order)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {order.customerEmail || getCustomerPhone(order)}
                  </p>
                </div>
              </TableCell>
              <TableCell className="px-4">{formatDate(order.createdAt)}</TableCell>
              <TableCell className="px-4">
                <StatusBadge status={order.status} />
              </TableCell>
              <TableCell className="px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="capitalize">{getPaymentMethod(order)}</span>
                  <StatusBadge status={getPaymentStatus(order)} />
                </div>
              </TableCell>
              <TableCell className="px-4 font-medium">
                {formatCurrency(order.totalPrice)}
              </TableCell>
              <TableCell className="px-4">
                <div className="flex flex-wrap items-center gap-2">
                  {order.status === "pending" && (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-600 font-bold hover:bg-emerald-700"
                      disabled={rowBusy}
                      onClick={() => handleConfirmOrder(order)}
                    >
                      {actionLoading === getActionKey(order.id, "confirm") ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      Xác nhận
                    </Button>
                  )}

                  {canCancelOrder(order) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={rowBusy}
                      onClick={() => handleCancelOrder(order)}
                    >
                      {actionLoading === getActionKey(order.id, "cancel") ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <XCircle className="size-3.5" />
                      )}
                      Hủy
                    </Button>
                  )}

                  {nextStatuses.length > 0 ? (
                    <select
                      value=""
                      disabled={rowBusy}
                      onChange={(event) =>
                        handleStatusChange(order, event.target.value)
                      }
                      className="h-7 rounded-lg border border-input bg-background px-2 text-xs font-semibold outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
                    >
                      <option value="">Chuyển trạng thái</option>
                      {nextStatuses.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status] || status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    order.status === "ready_for_delivery" && (
                      <span className="text-xs font-semibold text-muted-foreground">
                        Cần phân công giao hàng
                      </span>
                    )
                  )}
                </div>
              </TableCell>
              <TableCell className="px-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  title="Xem chi tiết đơn hàng"
                  aria-label="Xem chi tiết đơn hàng"
                  onClick={() => handleViewOrder(order)}
                >
                  <Eye className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        }}
      />

      <p className="text-xs font-medium text-muted-foreground">
        Đang hiển thị {formatNumber(filteredOrders.length)} /{" "}
        {formatNumber(pageMeta.totalElements)} đơn từ API admin.
      </p>

      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          {selectedOrder && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Đơn hàng #{selectedOrder.id}</DialogTitle>
                <DialogDescription>
                  Chi tiết đơn hàng lấy từ API quản trị.
                </DialogDescription>
              </DialogHeader>

              {detailLoading && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm font-semibold text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Đang tải chi tiết đơn hàng...
                </div>
              )}

              <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Khách hàng
                  </p>
                  <p className="mt-1 font-medium">
                    {getCustomerName(selectedOrder)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getCustomerPhone(selectedOrder)}
                  </p>
                  {selectedOrder.customerEmail && (
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.customerEmail}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Địa chỉ
                  </p>
                  <p className="mt-1 text-sm">
                    {getShippingAddress(selectedOrder)}
                  </p>
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
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm capitalize">
                    <span>{getPaymentMethod(selectedOrder)}</span>
                    <StatusBadge status={getPaymentStatus(selectedOrder)} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Nhân viên giao hàng
                  </p>
                  <p className="mt-1 text-sm">
                    {selectedOrder.deliveryStaffName || "Chưa phân công"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Ngày tạo
                  </p>
                  <p className="mt-1 text-sm">
                    {formatDate(selectedOrder.createdAt)}
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
                    {(selectedOrder.items || []).map((item) => (
                      <TableRow key={item.id || `${selectedOrder.id}-${item.productName}`}>
                        <TableCell className="px-4 font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="px-4">{item.quantity}</TableCell>
                        <TableCell className="px-4">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="px-4 text-right font-medium">
                          {formatCurrency(
                            item.lineTotal || Number(item.price) * item.quantity
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="rounded-lg border bg-card p-3">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Truck className="size-4 text-emerald-700" />
                    Lịch sử trạng thái
                  </div>
                  {selectedOrder.statusHistory?.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOrder.statusHistory.map((history) => (
                        <div
                          key={history.id}
                          className="border-l-2 border-emerald-200 pl-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={history.status} />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(history.changedAt)}
                            </span>
                          </div>
                          {history.note && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {history.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chưa có lịch sử trạng thái chi tiết.
                    </p>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border bg-card p-3 text-sm">
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
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status === "pending" && (
                    <Button
                      type="button"
                      className="bg-emerald-600 font-bold hover:bg-emerald-700"
                      disabled={Boolean(actionLoading)}
                      onClick={() => handleConfirmOrder(selectedOrder)}
                    >
                      <CheckCircle2 className="size-4" />
                      Xác nhận
                    </Button>
                  )}
                  {canCancelOrder(selectedOrder) && (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={Boolean(actionLoading)}
                      onClick={() => handleCancelOrder(selectedOrder)}
                    >
                      <XCircle className="size-4" />
                      Hủy đơn
                    </Button>
                  )}
                </div>
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
