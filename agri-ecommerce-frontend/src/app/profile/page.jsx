"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Eye,
  EyeOff,
  Home,
  Leaf,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  ShoppingBasket,
  Star,
  Truck,
  UserRound,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, formatNumber } from "@/lib/admin-utils";
import {
  AUTH_SCOPES,
  clearAuthSession,
  getAuthSession,
  isAuthSessionExpired,
  isAuthSessionRemembered,
  saveAuthSession,
} from "@/lib/auth-storage";
import { authService } from "@/services/auth.service";
import { orderService } from "@/services/order.service";
import { profileService } from "@/services/profile.service";
import { reviewService } from "@/services/review.service";

const blankLoginForm = {
  email: "",
  password: "",
};

const blankRegisterForm = {
  name: "",
  email: "",
  password: "",
  phoneNumber: "",
  address: "",
};

const blankProfileForm = {
  name: "",
  phoneNumber: "",
  address: "",
  avatar: "",
};

const blankPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const defaultReviewDraft = {
  rating: 5,
  comment: "",
};

function unwrapApiData(response) {
  return response?.data ?? response;
}

function getInitial(user) {
  return (user?.name || user?.email || "K").charAt(0).toUpperCase();
}

function readPageContent(response) {
  return Array.isArray(response?.content) ? response.content : [];
}

function getOrderTotal(order) {
  return Number(order?.totalPrice ?? order?.payment?.amount ?? 0);
}

function isCompletedOrder(order) {
  return ["completed", "delivered"].includes(
    String(order?.status || "").toLowerCase()
  );
}

function getReviewByProduct(reviews, productId) {
  const normalizedProductId = Number(productId);

  if (!Number.isFinite(normalizedProductId)) {
    return null;
  }

  return (
    reviews.find(
      (review) => Number(review.productId) === normalizedProductId
    ) || null
  );
}

function getOrderQuantity(order) {
  return (order?.items || []).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
}

function getPaymentMethod(order) {
  const method = order?.payment?.paymentMethod || "cash";
  const labels = {
    cash: "Tiền mặt",
    cod: "COD",
    paypal: "PayPal",
    bank_transfer: "Chuyển khoản",
  };

  return labels[method] || method;
}

function getShippingText(order) {
  const shippingAddress = order?.shippingAddress;

  if (!shippingAddress) {
    return "Chưa có địa chỉ giao hàng.";
  }

  return [shippingAddress.address, shippingAddress.city]
    .filter(Boolean)
    .join(", ");
}

function AuthPanel({ onAuthenticated }) {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(blankLoginForm);
  const [registerForm, setRegisterForm] = useState(blankRegisterForm);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const isLogin = mode === "login";

  // Validate phone number: must be 0 followed by 9 digits
  function validatePhoneNumber(phone) {
    const phoneRegex = /^0\d{9}$/;
    return phoneRegex.test(phone);
  }

  function updateLogin(field, value) {
    setLoginForm((current) => ({ ...current, [field]: value }));
  }

  function updateRegister(field, value) {
    if (field === "phoneNumber") {
      // Only allow digits
      const digitsOnly = value.replace(/\D/g, "");
      // Limit to 10 digits
      const limited = digitsOnly.slice(0, 10);
      
      setRegisterForm((current) => ({ ...current, [field]: limited }));
      
      // Validate realtime
      if (limited === "") {
        setPhoneError("");
      } else if (!validatePhoneNumber(limited)) {
        setPhoneError("Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số");
      } else {
        setPhoneError("");
      }
    } else {
      setRegisterForm((current) => ({ ...current, [field]: value }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      if (!isLogin) {
        // Validate phone number before submitting
        if (registerForm.phoneNumber && !validatePhoneNumber(registerForm.phoneNumber)) {
          setError("Vui lòng nhập số điện thoại hợp lệ (bắt đầu bằng 0 và có 10 chữ số)");
          setLoading(false);
          return;
        }

        await authService.register({
          name: registerForm.name.trim(),
          email: registerForm.email.trim(),
          password: registerForm.password,
          phoneNumber: registerForm.phoneNumber.trim(),
          address: registerForm.address.trim(),
        });

        setLoginForm({
          email: registerForm.email.trim(),
          password: "",
        });
        setRegisterForm(blankRegisterForm);
        setShowPassword(false);
        setMode("login");
        setNotice("Đăng ký thành công. Vui lòng đăng nhập để vào hồ sơ.");
        return;
      }

      const response = await authService.login({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });
      const payload = unwrapApiData(response);

      if (!payload?.accessToken) {
        setError("Phản hồi xác thực không có access token.");
        return;
      }

      saveAuthSession(payload, { remember, scope: AUTH_SCOPES.customer });
      onAuthenticated(payload.user || null);
      router.replace("/");
    } catch (err) {
      setError(
        err?.message ||
          (isLogin
            ? "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu."
            : "Không thể đăng ký tài khoản. Vui lòng thử lại.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-emerald-700">
            Tài khoản khách hàng
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-normal text-emerald-950">
            {isLogin ? "Đăng nhập hồ sơ" : "Tạo tài khoản mới"}
          </h2>
        </div>
        <div className="flex size-11 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <UserRound className="size-5" />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-[8px] border border-emerald-100 bg-emerald-50/70 p-1">
        {[
          { value: "login", label: "Đăng nhập" },
          { value: "register", label: "Đăng ký" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setMode(item.value);
              setError("");
              setNotice("");
            }}
            className={`h-9 rounded-[8px] text-sm font-black transition ${
              mode === item.value
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-500 hover:text-emerald-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="register-name">Họ tên</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="register-name"
                value={registerForm.name}
                onChange={(event) => updateRegister("name", event.target.value)}
                className="h-11 pl-9"
                placeholder="Nguyễn Văn A"
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={isLogin ? "login-email" : "register-email"}>
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id={isLogin ? "login-email" : "register-email"}
              type="email"
              value={isLogin ? loginForm.email : registerForm.email}
              onChange={(event) =>
                isLogin
                  ? updateLogin("email", event.target.value)
                  : updateRegister("email", event.target.value)
              }
              className="h-11 pl-9"
              placeholder="customer@example.com"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={isLogin ? "login-password" : "register-password"}>
            Mật khẩu
          </Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id={isLogin ? "login-password" : "register-password"}
              type={showPassword ? "text" : "password"}
              value={isLogin ? loginForm.password : registerForm.password}
              onChange={(event) =>
                isLogin
                  ? updateLogin("password", event.target.value)
                  : updateRegister("password", event.target.value)
              }
              className="h-11 pl-9 pr-10"
              placeholder={isLogin ? "Nhập mật khẩu" : "Tối thiểu 6 ký tự"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={isLogin ? undefined : 6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
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

        {!isLogin && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="register-phone">Số điện thoại</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="register-phone"
                  type="tel"
                  value={registerForm.phoneNumber}
                  onChange={(event) =>
                    updateRegister("phoneNumber", event.target.value)
                  }
                  className={`h-11 pl-9 ${phoneError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                  placeholder="090xxxxxxxx"
                  maxLength="10"
                />
              </div>
              {phoneError && (
                <p className="text-sm font-medium text-red-600">{phoneError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-address">Địa chỉ</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="register-address"
                  value={registerForm.address}
                  onChange={(event) =>
                    updateRegister("address", event.target.value)
                  }
                  className="h-11 pl-9"
                  placeholder="Địa chỉ nhận hàng"
                />
              </div>
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
          />
          Ghi nhớ đăng nhập trên thiết bị này
        </label>

        {error && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            {notice}
          </div>
        )}

        <Button
          type="submit"
          className="h-11 w-full bg-emerald-600 font-bold hover:bg-emerald-700"
          disabled={loading}
        >
          {loading
            ? "Đang xử lý..."
            : isLogin
              ? "Đăng nhập"
              : "Đăng ký"}
          {!loading && <CheckCircle2 className="size-4" />}
        </Button>
      </form>
    </section>
  );
}

function PurchaseHistorySection({
  orders,
  ordersMeta,
  ordersLoading,
  ordersError,
  reviews,
  reviewDrafts,
  reviewSubmittingId,
  expandedOrderId,
  orderDetailLoading,
  onRefresh,
  onToggleOrder,
  onUpdateReviewDraft,
  onSubmitReview,
}) {
  const completedOrders = orders.filter(isCompletedOrder).length;
  const totalSpent = orders.reduce((sum, order) => sum + getOrderTotal(order), 0);

  return (
    <section className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
      <div className="flex flex-col gap-3 border-b border-emerald-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-emerald-700">
            Lịch sử mua hàng
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-normal text-emerald-950">
            Chi tiết các đơn đã đặt
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Xem trạng thái, sản phẩm, thanh toán, địa chỉ nhận hàng và tiến trình xử lý của từng đơn.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 border-emerald-100 bg-white text-emerald-800"
          onClick={onRefresh}
          disabled={ordersLoading}
        >
          <RefreshCw className={`size-4 ${ordersLoading ? "animate-spin" : ""}`} />
          Tải lại
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[8px] border border-emerald-100 bg-emerald-50/70 p-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <ReceiptText className="size-4" />
            <span className="text-xs font-black uppercase">Tổng đơn</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">
            {formatNumber(ordersMeta.totalElements || orders.length)}
          </p>
        </div>
        <div className="rounded-[8px] border border-sky-100 bg-sky-50 p-3">
          <div className="flex items-center gap-2 text-sky-700">
            <PackageCheck className="size-4" />
            <span className="text-xs font-black uppercase">Đã giao/hoàn tất</span>
          </div>
          <p className="mt-2 text-2xl font-black text-sky-950">
            {formatNumber(completedOrders)}
          </p>
        </div>
        <div className="rounded-[8px] border border-amber-100 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-amber-700">
            <CreditCard className="size-4" />
            <span className="text-xs font-black uppercase">Giá trị hiển thị</span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-950">
            {formatCurrency(totalSpent)}
          </p>
        </div>
      </div>

      {ordersError && (
        <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {ordersError}
        </div>
      )}

      {ordersLoading && orders.length === 0 ? (
        <div className="mt-4 rounded-[8px] border border-emerald-100 bg-[#f6faef] p-6 text-center text-sm font-semibold text-emerald-800">
          Đang tải lịch sử mua hàng...
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-4 rounded-[8px] border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-center">
          <ShoppingBasket className="mx-auto size-8 text-emerald-700" />
          <p className="mt-3 font-black text-emerald-950">
            Chưa có đơn hàng nào.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Khi bạn checkout thành công, đơn hàng sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((order) => {
            const expanded = expandedOrderId === order.id;
            const detailLoading = orderDetailLoading === String(order.id);

            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-[8px] border border-emerald-100 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => onToggleOrder(order)}
                  className="grid w-full gap-3 p-4 text-left transition hover:bg-emerald-50/70 lg:grid-cols-[1fr_auto_auto_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">
                        Đơn hàng #{order.id}
                      </h3>
                      <StatusBadge status={order.status} />
                      {order.payment?.status && (
                        <StatusBadge status={order.payment.status} />
                      )}
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <CalendarClock className="size-4 text-emerald-600" />
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="text-sm">
                    <p className="font-black text-slate-950">
                      {formatNumber(getOrderQuantity(order))} sản phẩm
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {getPaymentMethod(order)}
                    </p>
                  </div>

                  <div className="text-sm">
                    <p className="font-black text-emerald-700">
                      {formatCurrency(getOrderTotal(order))}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Phí giao {formatCurrency(order.shippingFee)}
                    </p>
                  </div>

                  <span className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-emerald-100 px-3 text-sm font-black text-emerald-800">
                    {detailLoading ? "Đang tải" : expanded ? "Thu gọn" : "Chi tiết"}
                    {expanded ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-emerald-100 bg-[#f6faef] p-4">
                    <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
                      <div className="rounded-[8px] border border-emerald-100 bg-white p-3">
                        <p className="mb-3 text-sm font-black uppercase text-emerald-700">
                          Sản phẩm đã mua
                        </p>
                        <div className="space-y-2">
                          {(order.items || []).map((item) => {
                            const existingReview = getReviewByProduct(
                              reviews,
                              item.productId
                            );
                            const reviewable = isCompletedOrder(order);
                            const draft =
                              reviewDrafts[String(item.productId)] ||
                              defaultReviewDraft;
                            const submitting =
                              reviewSubmittingId === String(item.productId);

                            return (
                              <div
                                key={item.id || `${order.id}-${item.productId}`}
                                className="rounded-[8px] border border-emerald-100 p-3"
                              >
                                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                  <div className="min-w-0">
                                    <p className="line-clamp-1 font-black text-slate-950">
                                      {item.productName}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                                      {formatCurrency(item.price)} / {item.unit || "sản phẩm"}
                                    </p>
                                  </div>
                                  <div className="text-sm sm:text-right">
                                    <p className="font-black text-slate-950">
                                      x{formatNumber(item.quantity)}
                                    </p>
                                    <p className="mt-1 font-black text-emerald-700">
                                      {formatCurrency(item.lineTotal)}
                                    </p>
                                  </div>
                                </div>

                                {reviewable && existingReview && (
                                  <div className="mt-3 rounded-[8px] border border-amber-100 bg-amber-50 p-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-black uppercase text-amber-700">
                                        Đã đánh giá
                                      </span>
                                      <span className="flex items-center gap-1 text-amber-600">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                          <Star
                                            key={index}
                                            className={`size-4 ${
                                              index < Number(existingReview.rating || 0)
                                                ? "fill-current"
                                                : ""
                                            }`}
                                          />
                                        ))}
                                      </span>
                                    </div>
                                    {existingReview.comment && (
                                      <p className="mt-2 text-sm font-semibold text-amber-950">
                                        {existingReview.comment}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {reviewable && !existingReview && (
                                  <form
                                    className="mt-3 rounded-[8px] border border-emerald-100 bg-emerald-50/60 p-3"
                                    onSubmit={(event) =>
                                      onSubmitReview(event, item)
                                    }
                                  >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                      <p className="text-xs font-black uppercase text-emerald-700">
                                        Đánh giá sản phẩm
                                      </p>
                                      <div className="flex items-center gap-1">
                                        {Array.from({ length: 5 }).map((_, index) => {
                                          const rating = index + 1;
                                          const active =
                                            rating <= Number(draft.rating || 0);

                                          return (
                                            <button
                                              key={rating}
                                              type="button"
                                              onClick={() =>
                                                onUpdateReviewDraft(
                                                  item.productId,
                                                  "rating",
                                                  rating
                                                )
                                              }
                                              className={`inline-flex size-8 items-center justify-center rounded-[8px] transition ${
                                                active
                                                  ? "bg-amber-100 text-amber-600"
                                                  : "bg-white text-slate-300 hover:text-amber-500"
                                              }`}
                                              aria-label={`${rating} sao`}
                                            >
                                              <Star
                                                className={`size-4 ${
                                                  active ? "fill-current" : ""
                                                }`}
                                              />
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <Textarea
                                      value={draft.comment}
                                      onChange={(event) =>
                                        onUpdateReviewDraft(
                                          item.productId,
                                          "comment",
                                          event.target.value
                                        )
                                      }
                                      rows={3}
                                      maxLength={255}
                                      className="mt-3 bg-white"
                                      placeholder="Chia sẻ cảm nhận sau khi nhận hàng..."
                                    />
                                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                      <span className="text-xs font-semibold text-muted-foreground">
                                        {(draft.comment || "").length}/255 ký tự
                                      </span>
                                      <Button
                                        type="submit"
                                        className="h-9 bg-emerald-600 text-sm font-bold hover:bg-emerald-700"
                                        disabled={submitting}
                                      >
                                        <Send className="size-4" />
                                        {submitting ? "Đang gửi..." : "Gửi đánh giá"}
                                      </Button>
                                    </div>
                                  </form>
                                )}

                                {!reviewable && (
                                  <p className="mt-3 rounded-[8px] bg-slate-50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                                    Có thể đánh giá sau khi đơn hàng được giao thành công.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-[8px] border border-emerald-100 bg-white p-3">
                          <p className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-emerald-700">
                            <Truck className="size-4" />
                            Giao hàng
                          </p>
                          <p className="font-black text-slate-950">
                            {order.shippingAddress?.fullName || order.customerName || "Khách hàng"}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-muted-foreground">
                            {order.shippingAddress?.phone || order.customerPhoneNumber || "Chưa có SĐT"}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {getShippingText(order)}
                          </p>
                        </div>

                        <div className="rounded-[8px] border border-emerald-100 bg-white p-3">
                          <p className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-emerald-700">
                            <CreditCard className="size-4" />
                            Thanh toán
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-3">
                              <span className="text-muted-foreground">Tạm tính</span>
                              <span className="font-bold">{formatCurrency(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-muted-foreground">Giảm giá</span>
                              <span className="font-bold">{formatCurrency(order.discountAmount)}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-muted-foreground">Phí giao</span>
                              <span className="font-bold">{formatCurrency(order.shippingFee)}</span>
                            </div>
                            <div className="flex justify-between gap-3 border-t border-emerald-100 pt-2 text-base font-black">
                              <span>Tổng cộng</span>
                              <span className="text-emerald-700">
                                {formatCurrency(order.totalPrice)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-[8px] border border-emerald-100 bg-white p-3">
                      <p className="mb-3 text-sm font-black uppercase text-emerald-700">
                        Tiến trình đơn hàng
                      </p>
                      {order.statusHistory?.length > 0 ? (
                        <div className="space-y-3">
                          {order.statusHistory.map((history) => (
                            <div
                              key={history.id}
                              className="border-l-2 border-emerald-200 pl-3"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={history.status} />
                                <span className="text-xs font-semibold text-muted-foreground">
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
                        <p className="text-sm font-semibold text-muted-foreground">
                          Chưa có lịch sử trạng thái chi tiết cho đơn này.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function CustomerProfilePage() {
  const [authStatus, setAuthStatus] = useState("checking");
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(blankProfileForm);
  const [passwordForm, setPasswordForm] = useState(blankPasswordForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersMeta, setOrdersMeta] = useState({
    totalElements: 0,
    totalPages: 0,
  });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewSubmittingId, setReviewSubmittingId] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState("");

  const profileInitial = getInitial(profile);

  const profileStats = useMemo(
    () => [
      {
        title: "Trạng thái",
        value: profile?.status || "Chưa có",
        description: "Trạng thái tài khoản",
        icon: ShieldCheck,
        tone: "green",
      },
      {
        title: "Vai trò",
        value: profile?.roleName || "Customer",
        description: "Quyền sử dụng hệ thống",
        icon: UserRound,
        tone: "blue",
      },
      {
        title: "Liên hệ",
        value: profile?.phoneNumber || "Chưa thêm",
        description: "Số điện thoại giao hàng",
        icon: Phone,
        tone: "amber",
      },
    ],
    [profile]
  );

  const applyProfile = useCallback((nextProfile) => {
    setProfile(nextProfile);
    setForm({
      name: nextProfile?.name || "",
      phoneNumber: nextProfile?.phoneNumber || "",
      address: nextProfile?.address || "",
      avatar: nextProfile?.avatar || "",
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await profileService.getProfile();
      applyProfile(unwrapApiData(response));
      setAuthStatus("authenticated");
    } catch (err) {
      setError(err?.message || "Không thể tải hồ sơ khách hàng.");
      setAuthStatus("unauthenticated");
      clearAuthSession(AUTH_SCOPES.customer);
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  const loadOrderHistory = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError("");

    try {
      const response = await orderService.getOrders({
        page: 0,
        size: 20,
        sort: "createdAt,desc",
      });
      setOrders(readPageContent(response));
      setOrdersMeta({
        totalElements: Number(response?.totalElements || 0),
        totalPages: Number(response?.totalPages || 0),
      });
    } catch (err) {
      setOrders([]);
      setOrdersMeta({ totalElements: 0, totalPages: 0 });
      setOrdersError(err?.message || "Không thể tải lịch sử mua hàng.");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadMyReviews = useCallback(async () => {
    try {
      const response = await reviewService.getMyReviews({
        page: 0,
        size: 100,
        sort: "createdAt,desc",
      });
      setReviews(readPageContent(response));
    } catch {
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const session = getAuthSession(AUTH_SCOPES.customer);

      if (!session?.accessToken || isAuthSessionExpired(session)) {
        clearAuthSession(AUTH_SCOPES.customer);
        setAuthStatus("unauthenticated");
        return;
      }

      setAuthStatus("authenticated");
      applyProfile(session.currentUser);
      loadProfile();
      loadOrderHistory();
      loadMyReviews();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [applyProfile, loadMyReviews, loadOrderHistory, loadProfile]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updatePasswordForm(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await profileService.updateProfile({
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim(),
        avatar: form.avatar.trim(),
      });
      const nextProfile = unwrapApiData(response);
      applyProfile(nextProfile);
      const session = getAuthSession(AUTH_SCOPES.customer);

      if (session?.accessToken) {
        saveAuthSession(
          {
            accessToken: session.accessToken,
            tokenType: session.tokenType,
            user: nextProfile,
            expiresIn: session.tokenExpiresAt
              ? Math.max(session.tokenExpiresAt - Date.now(), 0)
              : undefined,
          },
          {
            remember: isAuthSessionRemembered(AUTH_SCOPES.customer),
            scope: AUTH_SCOPES.customer,
          }
        );
      }

      setNotice("Đã cập nhật hồ sơ khách hàng.");
    } catch (err) {
      setError(err?.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  function handleAuthenticated(user) {
    setAuthStatus("authenticated");
    applyProfile(user);
    loadProfile();
    loadOrderHistory();
    loadMyReviews();
  }

  function updateReviewDraft(productId, field, value) {
    const key = String(productId);

    setReviewDrafts((current) => ({
      ...current,
      [key]: {
        ...defaultReviewDraft,
        ...(current[key] || {}),
        [field]: field === "rating" ? Number(value) : value,
      },
    }));
  }

  async function submitReview(event, item) {
    event.preventDefault();

    const productId = Number(item.productId);

    if (!Number.isFinite(productId)) {
      setOrdersError("Không thể xác định sản phẩm cần đánh giá.");
      return;
    }

    const key = String(productId);
    const draft = reviewDrafts[key] || defaultReviewDraft;
    const rating = Number(draft.rating || 0);

    if (rating < 1 || rating > 5) {
      setOrdersError("Vui lòng chọn điểm đánh giá từ 1 đến 5 sao.");
      return;
    }

    setReviewSubmittingId(key);
    setOrdersError("");

    try {
      const createdReview = await reviewService.createReview({
        productId,
        rating,
        comment: String(draft.comment || "").trim(),
      });

      setReviews((current) => [createdReview, ...current]);
      setReviewDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[key];
        return nextDrafts;
      });
      setNotice(`Đã gửi đánh giá cho "${item.productName}".`);
    } catch (err) {
      setOrdersError(err?.message || "Không thể gửi đánh giá sản phẩm.");
    } finally {
      setReviewSubmittingId("");
    }
  }

  async function handleToggleOrder(order) {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(order.id);

    if (order.statusHistory?.length > 0) {
      return;
    }

    setOrderDetailLoading(String(order.id));
    setOrdersError("");

    try {
      const detail = await orderService.getOrder(order.id);
      setOrders((current) =>
        current.map((currentOrder) =>
          currentOrder.id === detail.id ? detail : currentOrder
        )
      );
    } catch (err) {
      setOrdersError(err?.message || "Không thể tải chi tiết đơn hàng.");
    } finally {
      setOrderDetailLoading("");
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setChangingPassword(true);
    setError("");
    setNotice("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      setChangingPassword(false);
      return;
    }

    try {
      await profileService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      setPasswordForm(blankPasswordForm);
      setNotice("Đã đổi mật khẩu khách hàng.");
    } catch (err) {
      setError(err?.message || "Không thể đổi mật khẩu.");
    } finally {
      setChangingPassword(false);
    }
  }

  function handleLogout() {
    clearAuthSession(AUTH_SCOPES.customer);
    setProfile(null);
    setForm(blankProfileForm);
    setPasswordForm(blankPasswordForm);
    setOrders([]);
    setOrdersMeta({ totalElements: 0, totalPages: 0 });
    setOrdersError("");
    setExpandedOrderId(null);
    setOrderDetailLoading("");
    setAuthStatus("unauthenticated");
    setNotice("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#f6faef] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/88 backdrop-blur-xl">
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
                Hồ sơ khách hàng
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
            >
              <ArrowLeft className="size-4" />
              Mua hàng
            </Link>
            {authStatus === "authenticated" && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-emerald-800"
              >
                <LogOut className="size-4" />
                Đăng xuất
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <AdminPageHeader
          title="Hồ sơ khách hàng"
          description="Quản lý thông tin cá nhân, số điện thoại và địa chỉ nhận hàng dùng cho trải nghiệm mua nông sản trên AgriMarket."
          image="/market-assets/fresh-market-hero.png"
          badges={["Customer profile", "Auth API", "Cập nhật hồ sơ"]}
        >
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            <Home className="size-4" />
            Về trang mua hàng
          </Link>
        </AdminPageHeader>

        {authStatus === "checking" ? (
          <section className="rounded-[8px] border border-emerald-100 bg-white p-8 text-center shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
            <div className="mx-auto flex size-12 items-center justify-center rounded-[8px] bg-emerald-600 text-white">
              <UserRound className="size-6" />
            </div>
            <p className="mt-4 font-black text-emerald-950">
              Đang kiểm tra phiên đăng nhập
            </p>
          </section>
        ) : authStatus !== "authenticated" ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
              <div className="flex size-11 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <ShieldCheck className="size-5" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-emerald-950">
                Đăng nhập để dùng hồ sơ mua hàng
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Backend hiện hỗ trợ đăng ký, đăng nhập, lấy hồ sơ, cập nhật hồ
                sơ và đổi mật khẩu cho khách hàng. Trang này dùng trực tiếp các
                API đó.
              </p>
              {error && (
                <div className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  {error}
                </div>
              )}
            </section>
            <AuthPanel onAuthenticated={handleAuthenticated} />
          </div>
        ) : (
          <div className="space-y-5">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {profileStats.map((item) => (
                <StatCard
                  key={item.title}
                  title={item.title}
                  value={item.value}
                  description={item.description}
                  icon={item.icon}
                  tone={item.tone}
                />
              ))}
            </section>

            <section className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="space-y-5">
                <div className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
                  <div className="flex items-start gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-[8px] bg-emerald-600 text-2xl font-black text-white shadow-sm">
                      {profileInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase text-emerald-700">
                        Thông tin tài khoản
                      </p>
                      <h2 className="mt-1 truncate text-2xl font-black text-emerald-950">
                        {profile?.name || "Khách hàng"}
                      </h2>
                      <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">
                        {profile?.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="rounded-[8px] border border-emerald-100 bg-emerald-50/70 p-3">
                      <p className="font-black text-emerald-950">Địa chỉ</p>
                      <p className="mt-1 leading-6 text-muted-foreground">
                        {profile?.address || "Chưa có địa chỉ nhận hàng."}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-sky-100 bg-sky-50 p-3">
                      <p className="font-black text-sky-950">Email đăng nhập</p>
                      <p className="mt-1 leading-6 text-muted-foreground">
                        {profile?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={handleChangePassword}
                  className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase text-emerald-700">
                        Bảo mật
                      </p>
                      <h2 className="mt-1 text-xl font-black text-emerald-950">
                        Đổi mật khẩu
                      </h2>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      <LockKeyhole className="size-5" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="customer-current-password">
                        Mật khẩu hiện tại
                      </Label>
                      <Input
                        id="customer-current-password"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          updatePasswordForm("currentPassword", event.target.value)
                        }
                        className="h-10"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-new-password">Mật khẩu mới</Label>
                      <Input
                        id="customer-new-password"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(event) =>
                          updatePasswordForm("newPassword", event.target.value)
                        }
                        className="h-10"
                        minLength={6}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-confirm-password">
                        Xác nhận mật khẩu mới
                      </Label>
                      <Input
                        id="customer-confirm-password"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) =>
                          updatePasswordForm("confirmPassword", event.target.value)
                        }
                        className="h-10"
                        minLength={6}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="mt-4 h-10 bg-slate-950 font-bold hover:bg-emerald-700"
                    disabled={changingPassword}
                  >
                    <LockKeyhole className="size-4" />
                    {changingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
                  </Button>
                </form>
              </div>

              <form
                onSubmit={handleSave}
                className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]"
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-700">
                      Cập nhật hồ sơ
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-normal text-emerald-950">
                      Thông tin nhận hàng
                    </h2>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <UserRound className="size-5" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Họ tên</Label>
                    <Input
                      id="profile-name"
                      value={form.name}
                      onChange={(event) => updateForm("name", event.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-phone">Số điện thoại</Label>
                    <Input
                      id="profile-phone"
                      value={form.phoneNumber}
                      onChange={(event) =>
                        updateForm("phoneNumber", event.target.value)
                      }
                      className="h-11"
                      placeholder="090..."
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="profile-avatar">Avatar URL</Label>
                    <Input
                      id="profile-avatar"
                      value={form.avatar}
                      onChange={(event) =>
                        updateForm("avatar", event.target.value)
                      }
                      className="h-11"
                      placeholder="uploads/avatars/customer.jpg"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="profile-address">Địa chỉ nhận hàng</Label>
                    <Textarea
                      id="profile-address"
                      value={form.address}
                      onChange={(event) =>
                        updateForm("address", event.target.value)
                      }
                      rows={4}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                    />
                  </div>
                </div>

                {notice && (
                  <div className="mt-4 rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                    {notice}
                  </div>
                )}
                {error && (
                  <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    className="h-10 bg-emerald-600 font-bold hover:bg-emerald-700"
                    disabled={saving || loading}
                  >
                    <Save className="size-4" />
                    {saving ? "Đang lưu..." : "Lưu hồ sơ"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 border-emerald-100 bg-white text-emerald-800"
                    onClick={loadProfile}
                    disabled={loading}
                  >
                    Tải lại
                  </Button>
                </div>
              </form>
            </section>

            <PurchaseHistorySection
              orders={orders}
              ordersMeta={ordersMeta}
              ordersLoading={ordersLoading}
              ordersError={ordersError}
              reviews={reviews}
              reviewDrafts={reviewDrafts}
              reviewSubmittingId={reviewSubmittingId}
              expandedOrderId={expandedOrderId}
              orderDetailLoading={orderDetailLoading}
              onRefresh={() => {
                loadOrderHistory();
                loadMyReviews();
              }}
              onToggleOrder={handleToggleOrder}
              onUpdateReviewDraft={updateReviewDraft}
              onSubmitReview={submitReview}
            />
          </div>
        )}
      </div>
    </main>
  );
}
