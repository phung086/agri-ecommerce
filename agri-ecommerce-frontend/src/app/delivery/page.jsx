"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";

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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from "@/lib/admin-utils";
import {
  AUTH_SCOPES,
  clearAuthSession,
  getAuthSession,
  isAuthSessionExpired,
  isAuthSessionRemembered,
  isDeliveryStaffUser,
  saveAuthSession,
} from "@/lib/auth-storage";
import { authService } from "@/services/auth.service";
import { deliveryService } from "@/services/delivery.service";

const ORDER_FETCH_PARAMS = {
  page: 0,
  size: 100,
  sort: "createdAt,desc",
};

const DELIVERY_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả đơn" },
  { value: "ready_for_delivery", label: "Sẵn sàng giao" },
  { value: "out_for_delivery", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "completed", label: "Hoàn tất" },
];

const blankLoginForm = {
  email: "",
  password: "",
};

function readPageContent(response) {
  if (Array.isArray(response?.content)) {
    return response.content;
  }

  return Array.isArray(response) ? response : [];
}

function getAuthPayload(response) {
  return response?.data ?? response;
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

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

export default function DeliveryPage() {
  const [authStatus, setAuthStatus] = useState("checking");
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState(blankLoginForm);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function initializeDeliverySession() {
      await Promise.resolve();

      const session = getAuthSession(AUTH_SCOPES.delivery);

      if (!session?.accessToken || isAuthSessionExpired(session)) {
        if (session?.accessToken) {
          clearAuthSession(AUTH_SCOPES.delivery);
        }

        if (!cancelled) {
          setRemember(isAuthSessionRemembered(AUTH_SCOPES.delivery));
          setAuthStatus("unauthenticated");
        }
        return;
      }

      if (!isDeliveryStaffUser(session.currentUser)) {
        clearAuthSession(AUTH_SCOPES.delivery);

        if (!cancelled) {
          setAuthStatus("unauthenticated");
        }
        return;
      }

      if (!cancelled) {
        setCurrentUser(session.currentUser);
        setAuthStatus("authenticated");
        setLoading(true);
        setError("");
        setNotice("");
      }

      try {
        const response = await deliveryService.getAssignedOrders(
          ORDER_FETCH_PARAMS
        );

        if (!cancelled) {
          setOrders(readPageContent(response));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            getErrorMessage(err, "Không thể tải danh sách đơn giao hàng.")
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initializeDeliverySession();

    return () => {
      cancelled = true;
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
          getCustomerPhone(order),
          getShippingAddress(order),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const ready = orders.filter(
      (order) => order.status === "ready_for_delivery"
    ).length;
    const delivering = orders.filter(
      (order) => order.status === "out_for_delivery"
    ).length;
    const delivered = orders.filter((order) =>
      ["delivered", "completed"].includes(order.status)
    ).length;

    return { ready, delivering, delivered };
  }, [orders]);

  function updateLoginForm(field, value) {
    setLoginForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateOrderInState(updatedOrder) {
    setOrders((current) =>
      current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );
    setSelectedOrder((current) =>
      current?.id === updatedOrder.id ? updatedOrder : current
    );
  }

  async function loadOrders() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await deliveryService.getAssignedOrders(
        ORDER_FETCH_PARAMS
      );
      setOrders(readPageContent(response));
    } catch (err) {
      setError(
        getErrorMessage(err, "Không thể tải danh sách đơn giao hàng.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoggingIn(true);
    setError("");
    setNotice("");

    try {
      const response = await authService.login({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });
      const payload = getAuthPayload(response);

      if (!payload?.accessToken) {
        setError("Phản hồi đăng nhập không có access token.");
        return;
      }

      if (!isDeliveryStaffUser(payload.user)) {
        clearAuthSession(AUTH_SCOPES.delivery);
        setError("Tài khoản này không có quyền nhân viên giao hàng.");
        return;
      }

      saveAuthSession(payload, { remember, scope: AUTH_SCOPES.delivery });
      setCurrentUser(payload.user);
      setLoginForm(blankLoginForm);
      setAuthStatus("authenticated");
      await loadOrders();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu."
        )
      );
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    clearAuthSession(AUTH_SCOPES.delivery);
    setCurrentUser(null);
    setOrders([]);
    setSelectedOrder(null);
    setAuthStatus("unauthenticated");
    setNotice("");
    setError("");
  }

  async function handleViewOrder(order) {
    setSelectedOrder(order);
    setDetailLoading(true);
    setError("");

    try {
      const detail = await deliveryService.getAssignedOrder(order.id);
      setSelectedOrder(detail);
      updateOrderInState(detail);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải chi tiết đơn giao hàng."));
    } finally {
      setDetailLoading(false);
    }
  }

  async function runOrderAction(order, action, handler, successMessage) {
    setActionLoading(`${order.id}:${action}`);
    setError("");
    setNotice("");

    try {
      const updatedOrder = await handler();
      updateOrderInState(updatedOrder);
      setNotice(successMessage(updatedOrder));
    } catch (err) {
      setError(getErrorMessage(err, "Không thể cập nhật đơn giao hàng."));
    } finally {
      setActionLoading("");
    }
  }

  function markOutForDelivery(order) {
    runOrderAction(
      order,
      "out",
      () =>
        deliveryService.markOutForDelivery(order.id, {
          note: "Nhân viên giao hàng bắt đầu giao.",
        }),
      (updatedOrder) => `Đơn #${updatedOrder.id} đang được giao.`
    );
  }

  function markDelivered(order) {
    runOrderAction(
      order,
      "delivered",
      () =>
        deliveryService.markDelivered(order.id, {
          note: "Nhân viên giao hàng xác nhận đã giao.",
        }),
      (updatedOrder) => `Đã xác nhận giao thành công đơn #${updatedOrder.id}.`
    );
  }

  return (
    <main className="min-h-screen bg-[#f6faef] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-[1480px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-emerald-600 text-white shadow-sm">
              <Leaf className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-emerald-950">
                AgriMarket
              </p>
              <p className="hidden text-xs font-medium text-emerald-700 sm:block">
                Khu vực giao hàng
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {authStatus === "authenticated" && (
              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                className="font-bold"
              >
                <LogOut className="size-4" />
                Đăng xuất
              </Button>
            )}
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
            >
              <ArrowLeft className="size-4" />
              Trang chủ
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {authStatus === "checking" ? (
          <section className="rounded-[8px] border border-emerald-100 bg-white p-8 text-center shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
            <Loader2 className="mx-auto size-8 animate-spin text-emerald-700" />
            <p className="mt-4 font-black text-emerald-950">
              Đang kiểm tra phiên giao hàng...
            </p>
          </section>
        ) : authStatus === "unauthenticated" ? (
          <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_0.7fr]">
            <div className="rounded-[8px] border border-emerald-100 bg-white p-6 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
              <div className="inline-flex items-center gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800">
                <Truck className="size-4" />
                Delivery Staff
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-normal text-emerald-950">
                Nhận đơn, giao hàng và xác nhận hoàn tất.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
                Trang này dùng API `/delivery/orders` và chỉ dành cho tài khoản
                có role `delivery_staff`.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: ShieldCheck, label: "Token riêng" },
                  { icon: PackageCheck, label: "Đơn được phân công" },
                  { icon: CheckCircle2, label: "Xác nhận giao" },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="rounded-[8px] border border-emerald-100 bg-[#f6faef] p-4"
                    >
                      <Icon className="size-5 text-emerald-700" />
                      <p className="mt-3 text-sm font-bold text-slate-800">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <form
              onSubmit={handleLogin}
              className="rounded-[8px] border border-emerald-100 bg-white p-6 shadow-[0_16px_42px_rgba(15,61,38,0.07)]"
            >
              <div className="mb-5">
                <p className="text-sm font-bold uppercase text-emerald-700">
                  Delivery Login
                </p>
                <h2 className="mt-1 text-2xl font-black text-emerald-950">
                  Đăng nhập nhân viên giao hàng
                </h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delivery-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="delivery-email"
                      type="email"
                      value={loginForm.email}
                      onChange={(event) =>
                        updateLoginForm("email", event.target.value)
                      }
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery-password">Mật khẩu</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="delivery-password"
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(event) =>
                        updateLoginForm("password", event.target.value)
                      }
                      className="pl-9 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-slate-500 hover:bg-slate-100"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="size-4 rounded border-emerald-200 text-emerald-600"
                  />
                  Ghi nhớ phiên giao hàng
                </label>

                {error && (
                  <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-11 w-full bg-emerald-600 font-black hover:bg-emerald-700"
                  disabled={loggingIn}
                >
                  {loggingIn ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Truck className="size-4" />
                  )}
                  Đăng nhập
                </Button>
              </div>
            </form>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-[8px] border border-emerald-100 bg-white shadow-[0_18px_55px_rgba(15,61,38,0.08)]">
              <div className="grid min-h-48 gap-0 lg:grid-cols-[1fr_22rem]">
                <div className="flex flex-col justify-center gap-4 p-5 sm:p-6 lg:p-7">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">
                      Delivery API
                    </span>
                    <span className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">
                      Assigned orders
                    </span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-normal text-emerald-950">
                      Xin chào, {currentUser?.name || "nhân viên giao hàng"}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      Quản lý các đơn được phân công, chuyển sang đang giao và
                      xác nhận giao thành công.
                    </p>
                  </div>
                </div>
                <div className="relative min-h-48 border-t border-emerald-100 bg-emerald-50 lg:border-l lg:border-t-0">
                  <div className="absolute inset-0 bg-[url('/admin-assets/delivery.svg')] bg-contain bg-center bg-no-repeat opacity-90" />
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <StatCard
                title="Sẵn sàng giao"
                value={formatNumber(stats.ready)}
                description="Có thể bắt đầu giao"
                icon={PackageCheck}
                tone="green"
              />
              <StatCard
                title="Đang giao"
                value={formatNumber(stats.delivering)}
                description="Cần xác nhận khi hoàn tất"
                icon={Truck}
                tone="blue"
              />
              <StatCard
                title="Đã giao"
                value={formatNumber(stats.delivered)}
                description="Đã giao hoặc hoàn tất"
                icon={CheckCircle2}
                tone="amber"
              />
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
                {DELIVERY_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                onClick={loadOrders}
                disabled={loading}
                className="font-bold"
              >
                <RefreshCw
                  className={loading ? "size-4 animate-spin" : "size-4"}
                />
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
                "Trạng thái",
                "Thời gian",
                "Tổng tiền",
                "Thao tác",
              ]}
              data={filteredOrders}
              loading={loading}
              error={loading || orders.length === 0 ? error : ""}
              emptyText="Không có đơn giao hàng phù hợp"
              renderRow={(order) => {
                const rowBusy = actionLoading.startsWith(`${order.id}:`);

                return (
                  <TableRow key={order.id}>
                    <TableCell className="px-4 font-medium">
                      #{order.id}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {getCustomerName(order)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {getCustomerPhone(order)} · {getShippingAddress(order)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <StatusBadge status={order.status} />
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
                    <TableCell className="px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {order.status === "ready_for_delivery" && (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-emerald-600 font-bold hover:bg-emerald-700"
                            disabled={rowBusy}
                            onClick={() => markOutForDelivery(order)}
                          >
                            {actionLoading === `${order.id}:out` ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Truck className="size-3.5" />
                            )}
                            Bắt đầu giao
                          </Button>
                        )}
                        {order.status === "out_for_delivery" && (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-emerald-600 font-bold hover:bg-emerald-700"
                            disabled={rowBusy}
                            onClick={() => markDelivered(order)}
                          >
                            {actionLoading === `${order.id}:delivered` ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-3.5" />
                            )}
                            Đã giao
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="Xem chi tiết đơn"
                          aria-label="Xem chi tiết đơn"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }}
            />

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
                      <DialogTitle>Đơn giao #{selectedOrder.id}</DialogTitle>
                      <DialogDescription>
                        Chi tiết đơn được phân công cho nhân viên giao hàng.
                      </DialogDescription>
                    </DialogHeader>

                    {detailLoading && (
                      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm font-semibold text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Đang tải chi tiết đơn...
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
                          Tổng tiền
                        </p>
                        <p className="mt-1 font-medium">
                          {formatCurrency(selectedOrder.totalPrice)}
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
                            <TableHead className="px-4 text-right">
                              Tạm tính
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedOrder.items || []).map((item) => (
                            <TableRow
                              key={
                                item.id ||
                                `${selectedOrder.id}-${item.productName}`
                              }
                            >
                              <TableCell className="px-4 font-medium">
                                {item.productName}
                              </TableCell>
                              <TableCell className="px-4">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="px-4">
                                {formatCurrency(item.price)}
                              </TableCell>
                              <TableCell className="px-4 text-right font-medium">
                                {formatCurrency(
                                  item.lineTotal ||
                                    Number(item.price) * item.quantity
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <DialogFooter>
                      {selectedOrder.status === "ready_for_delivery" && (
                        <Button
                          type="button"
                          onClick={() => markOutForDelivery(selectedOrder)}
                        >
                          <Truck className="size-4" />
                          Bắt đầu giao
                        </Button>
                      )}
                      {selectedOrder.status === "out_for_delivery" && (
                        <Button
                          type="button"
                          onClick={() => markDelivered(selectedOrder)}
                        >
                          <CheckCircle2 className="size-4" />
                          Xác nhận đã giao
                        </Button>
                      )}
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
          </>
        )}
      </div>
    </main>
  );
}
