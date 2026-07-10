"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/language-provider";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Copy,
  Eye,
  EyeOff,
  Home,
  ImagePlus,
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
  X,
  Coins,
  Award,
  Trash2,
  Loader2,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AvatarUploadField } from "@/components/profile/avatar-upload-field";
import { VietnamAddressFields } from "@/components/profile/vietnam-address-fields";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getAssetUrl,
} from "@/lib/admin-utils";
import {
  AUTH_SCOPES,
  clearAuthSession,
  getAuthSession,
  isAuthSessionExpired,
  isAuthSessionRemembered,
  saveAuthSession,
} from "@/lib/auth-storage";
import {
  getVietnamPhoneError,
  normalizeVietnamPhone,
} from "@/lib/profile-validation";
import {
  PHONE_ERROR_MESSAGE,
  isValidPhoneNumber,
} from "@/lib/phone-utils";
import {
  buildProfileAddress,
  createVietnamAddressForm,
  getVietnamAddressError,
  buildDetailedAddress,
  buildFullVietnamAddress,
  isVietnamAddressComplete,
  addressFormToShippingPayload,
  VIETNAM_PROVINCES,
} from "@/lib/vietnam-addresses";
import { authService } from "@/services/auth.service";
import { orderService } from "@/services/order.service";
import { profileService } from "@/services/profile.service";
import { reviewService } from "@/services/review.service";
import { shippingAddressService } from "@/services/shipping-address.service";
import { promotionService } from "@/services/promotion.service";

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
  images: [],
};

const MAX_REVIEW_IMAGES = 3;
const MAX_REVIEW_IMAGE_SIZE = 5 * 1024 * 1024;
const REVIEW_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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

function getReviewDraft(draft) {
  return {
    ...defaultReviewDraft,
    ...(draft || {}),
    images: Array.isArray(draft?.images) ? draft.images : [],
  };
}

function getReviewImageSource(image) {
  return typeof image === "string" ? image : image?.previewUrl || "";
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
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [loginForm, setLoginForm] = useState(blankLoginForm);
  const [registerForm, setRegisterForm] = useState(blankRegisterForm);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Tracking State
  const [trackOrderId, setTrackOrderId] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackMethod, setTrackMethod] = useState("id");

  const isLogin = mode === "login";
  const isTrack = mode === "track";

  // Validate phone number: must be 0 followed by 9 digits
  function validatePhoneNumber(phone) {
    const phoneRegex = /^0\d{9}$/;
    return phoneRegex.test(phone);
  }

  const [registerAddress, setRegisterAddress] = useState(() => createVietnamAddressForm());

  function updateLogin(field, value) {
    setLoginForm((current) => ({ ...current, [field]: value }));
  }

  function updateRegister(field, value) {
    if (field === "phoneNumber") {
      const digitsOnly = value.replace(/\D/g, "");
      const limited = digitsOnly.slice(0, 10);
      setRegisterForm((current) => ({ ...current, [field]: limited }));
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

  async function handleTrackOrder(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setTrackedOrder(null);
    setLoading(true);

    const codeOrId = trackOrderId.trim();
    if (!codeOrId || !trackPhone.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin tra cứu.");
      setLoading(false);
      return;
    }

    try {
      let response;
      if (trackMethod === "ghn") {
        response = await orderService.trackByGhnCode(codeOrId, trackPhone.trim());
      } else {
        const parsedId = Number(codeOrId);
        if (isNaN(parsedId)) {
          throw new Error("Mã đơn hàng phải là một số hợp lệ.");
        }
        response = await orderService.trackGuestOrder(parsedId, trackPhone.trim());
      }
      setTrackedOrder(response?.data ?? response);
      setNotice("Tìm thấy thông tin đơn hàng!");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không tìm thấy đơn hàng khớp với thông tin đã cung cấp."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      if (!isLogin) {
        if (registerForm.phoneNumber && !validatePhoneNumber(registerForm.phoneNumber)) {
          setError("Vui lòng nhập số điện thoại hợp lệ (bắt đầu bằng 0 và có 10 chữ số)");
          setLoading(false);
          return;
        }

        // Kiểm tra xem địa chỉ Việt Nam đã được nhập đầy đủ chưa
        if (!isVietnamAddressComplete(registerAddress)) {
          setError("Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện, Phường/Xã và nhập địa chỉ cụ thể.");
          setLoading(false);
          return;
        }

        const fullAddr = buildFullVietnamAddress(registerAddress);

        // 1. Đăng ký tài khoản khách hàng
        const registerResponse = await authService.register({
          name: registerForm.name.trim(),
          email: registerForm.email.trim(),
          password: registerForm.password,
          phoneNumber: registerForm.phoneNumber.trim(),
          address: fullAddr,
        });

        // 2. Đăng nhập ngay lập tức để lấy token lưu session
        const loginResponse = await authService.login({
          email: registerForm.email.trim(),
          password: registerForm.password,
        });
        const payload = unwrapApiData(loginResponse);

        if (payload?.accessToken) {
          saveAuthSession(payload, { remember, scope: AUTH_SCOPES.customer });

          // 3. Tạo địa chỉ giao hàng mặc định ngay sau khi đăng nhập thành công
          try {
            await shippingAddressService.createAddress({
              fullName: registerForm.name.trim(),
              phone: registerForm.phoneNumber.trim(),
              city: registerAddress.provinceName,
              address: buildDetailedAddress(registerAddress),
              defaultAddress: true,
            });
          } catch (addrErr) {
            console.warn("Failed to create default shipping address on registration:", addrErr);
          }

          onAuthenticated(payload.user || null);
          router.replace("/");
          return;
        }

        setLoginForm({
          email: registerForm.email.trim(),
          password: "",
        });
        setRegisterForm(blankRegisterForm);
        setRegisterAddress(createVietnamAddressForm());
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
            {isTrack
              ? "Tra cứu đơn hàng"
              : isLogin
              ? "Đăng nhập hồ sơ"
              : "Tạo tài khoản mới"}
          </h2>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRoleDropdown((prev) => !prev)}
            className="flex size-11 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100 transition"
            title="Chọn vai trò đăng nhập"
          >
            <UserRound className="size-5" />
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-40 rounded-[8px] border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 animate-in fade-in-50 slide-in-from-top-1 duration-150">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs font-bold bg-slate-50 text-emerald-800 rounded-[6px]"
              >
                Khách hàng
              </button>
              <button
                type="button"
                onClick={() => router.push("/delivery")}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-800 rounded-[6px] transition"
              >
                Giao hàng
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin/login")}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-800 rounded-[6px] transition"
              >
                Quản trị viên
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Đăng nhập/Đăng ký/Tra cứu đơn */}
      <div className="mb-5 grid grid-cols-3 gap-2 rounded-[8px] border border-emerald-100 bg-emerald-50/70 p-1">
        {[
          { value: "login", label: "Đăng nhập" },
          { value: "register", label: "Đăng ký" },
          { value: "track", label: "Tra cứu đơn" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setMode(item.value);
              setError("");
              setNotice("");
              setTrackedOrder(null);
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

      {isTrack ? (
        <div className="space-y-5">
          {!trackedOrder ? (
            <form onSubmit={handleTrackOrder} className="space-y-4">
              <div className="space-y-2">
                <Label>Phương thức tra cứu</Label>
                <div className="grid grid-cols-2 gap-2 rounded-[8px] border border-emerald-100 bg-emerald-50/50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTrackMethod("id");
                      setError("");
                    }}
                    className={`h-8 rounded-[6px] text-xs font-bold transition ${
                      trackMethod === "id"
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "text-slate-500 hover:text-emerald-700"
                    }`}
                  >
                    Mã đơn hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTrackMethod("ghn");
                      setError("");
                    }}
                    className={`h-8 rounded-[6px] text-xs font-bold transition ${
                      trackMethod === "ghn"
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "text-slate-500 hover:text-emerald-700"
                    }`}
                  >
                    Mã vận đơn GHN
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="track-order-id">
                  {trackMethod === "ghn" ? "Mã vận đơn GHN" : "Mã đơn hàng"}
                </Label>
                <Input
                  id="track-order-id"
                  type="text"
                  value={trackOrderId}
                  onChange={(e) => setTrackOrderId(e.target.value)}
                  placeholder={
                    trackMethod === "ghn"
                      ? "Nhập mã vận đơn GHN (ví dụ: GHN12345678)"
                      : "Nhập mã số đơn hàng (ví dụ: 12)"
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="track-phone">Số điện thoại nhận hàng</Label>
                <Input
                  id="track-phone"
                  type="tel"
                  value={trackPhone}
                  onChange={(e) => setTrackPhone(e.target.value)}
                  placeholder="Nhập số điện thoại đặt hàng"
                  required
                />
              </div>

              {error && (
                <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full bg-emerald-600 font-bold hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? "Đang tra cứu..." : "Tra cứu trạng thái"}
                {!loading && <Send className="size-4" />}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-slate-800">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-black text-slate-900">Đơn hàng #{trackedOrder.id}</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Mã vận đơn GHN: <span className="font-mono text-emerald-700 font-bold">{trackedOrder.trackingNumber || "Chưa có"}</span>
                  </p>
                </div>
                <StatusBadge status={trackedOrder.status} />
              </div>

              {/* Status Timeline */}
              {trackedOrder.statusHistory?.length > 0 && (
                <div className="space-y-2.5 rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs">
                  <p className="font-black uppercase tracking-wider text-slate-400 text-[10px]">Lịch sử trạng thái</p>
                  <div className="space-y-2 border-l border-emerald-150 pl-3">
                    {trackedOrder.statusHistory.map((history) => (
                      <div key={history.id} className="relative">
                        <span className="absolute -left-[16.5px] top-1 size-2.5 rounded-full border border-white bg-emerald-500" />
                        <div className="flex items-center gap-1.5 font-bold">
                          <StatusBadge status={history.status} />
                          <span className="text-[10px] text-slate-400 font-normal">
                            {formatDate(history.changedAt)}
                          </span>
                        </div>
                        {history.note && (
                          <p className="mt-0.5 text-slate-500 font-medium">{history.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery info */}
              {trackedOrder.shippingAddress && (
                <div className="rounded-lg border border-sky-100 bg-sky-50/40 p-3 text-xs space-y-1">
                  <p className="font-black uppercase tracking-wider text-sky-800 text-[10px]">Thông tin giao hàng</p>
                  <p className="font-bold text-slate-900 mt-1">
                    {trackedOrder.shippingAddress.fullName} - {trackedOrder.shippingAddress.phone}
                  </p>
                  <p className="text-slate-600 leading-normal">
                    {trackedOrder.shippingAddress.address}, {trackedOrder.shippingAddress.city}
                  </p>
                </div>
              )}

              {/* Products list */}
              {trackedOrder.items?.length > 0 && (
                <div className="rounded-lg border border-slate-100 bg-white p-3 text-xs space-y-2">
                  <p className="font-black uppercase tracking-wider text-slate-400 text-[10px]">Sản phẩm</p>
                  <div className="divide-y divide-slate-100">
                    {trackedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between py-1.5 items-center">
                        <div className="max-w-[70%]">
                          <p className="font-bold text-slate-800">{item.productName}</p>
                          <p className="text-slate-400 mt-0.5">x{item.quantity}</p>
                        </div>
                        <span className="font-bold text-slate-700">
                          {formatCurrency(item.lineTotal || item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Costs Breakdown */}
              <div className="rounded-lg border border-emerald-100 bg-[#f7faf4] p-3 text-xs space-y-1.5 font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(trackedOrder.subtotal)}</span>
                </div>
                {trackedOrder.couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Mã giảm giá</span>
                    <span>-{formatCurrency(trackedOrder.couponDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Phí giao hàng</span>
                  <span>{trackedOrder.shippingFee === 0 ? "Miễn phí" : formatCurrency(trackedOrder.shippingFee)}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-100 pt-2 font-black text-slate-900 text-sm">
                  <span>Tổng thanh toán</span>
                  <span className="text-emerald-700">{formatCurrency(trackedOrder.totalPrice)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full"
                  onClick={() => {
                    setTrackedOrder(null);
                    setError("");
                    setNotice("");
                  }}
                >
                  Tra cứu đơn khác
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="register-name">Họ và tên</Label>
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
              Địa chỉ email
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
            <>
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
                    required
                  />
                </div>
                {phoneError && (
                  <p className="text-sm font-medium text-red-600">{phoneError}</p>
                )}
              </div>

              <div className="border-t border-emerald-100/50 pt-4 mt-2">
                <Label className="mb-3 block text-sm font-black text-emerald-800">Địa chỉ giao hàng mặc định (Việt Nam)</Label>
                <VietnamAddressFields
                  value={registerAddress}
                  onChange={setRegisterAddress}
                  idPrefix="register-address"
                  className="bg-emerald-50/20 p-3 rounded-lg border border-emerald-100/50"
                />
              </div>
            </>
          )}

          {isLogin && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="size-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
              />
              Ghi nhớ đăng nhập trên thiết bị này
            </label>
          )}

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
              : "Đăng ký tài khoản"}
            {!loading && <CheckCircle2 className="size-4" />}
          </Button>
        </form>
      )}
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
  onSelectReviewImages,
  onRemoveReviewImage,
  onSubmitReview,
}) {
  const { t } = useLanguage();
  const completedOrders = orders.filter(isCompletedOrder).length;
  const totalSpent = orders.filter(isCompletedOrder).reduce((sum, order) => sum + getOrderTotal(order), 0);

  return (
    <section className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
      <div className="flex flex-col gap-3 border-b border-emerald-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-emerald-700">
            {t("Lịch sử mua hàng")}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-normal text-emerald-950">
            {t("Chi tiết các đơn đã đặt")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("Xem trạng thái, sản phẩm, thanh toán, địa chỉ nhận hàng và tiến trình xử lý của từng đơn.")}
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
          {t("Tải lại")}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[8px] border border-emerald-100 bg-emerald-50/70 p-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <ReceiptText className="size-4" />
            <span className="text-xs font-black uppercase">{t("Tổng đơn")}</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">
            {formatNumber(ordersMeta.totalElements || orders.length)}
          </p>
        </div>
        <div className="rounded-[8px] border border-sky-100 bg-sky-50 p-3">
          <div className="flex items-center gap-2 text-sky-700">
            <PackageCheck className="size-4" />
            <span className="text-xs font-black uppercase">{t("Đã giao/hoàn tất")}</span>
          </div>
          <p className="mt-2 text-2xl font-black text-sky-950">
            {formatNumber(completedOrders)}
          </p>
        </div>
        <div className="rounded-[8px] border border-amber-100 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-amber-700">
            <CreditCard className="size-4" />
            <span className="text-xs font-black uppercase">{t("Tổng chi tiêu")}</span>
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
          {t("Đang tải lịch sử mua hàng...")}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-4 rounded-[8px] border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-center">
          <ShoppingBasket className="mx-auto size-8 text-emerald-700" />
          <p className="mt-3 font-black text-emerald-950">
            {t("Chưa có đơn hàng nào.")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Khi bạn checkout thành công, đơn hàng sẽ xuất hiện tại đây.")}
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
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-950">
                          Đơn hàng {order.trackingNumber || '#' + order.id}
                        </h3>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(order.trackingNumber || String(order.id));
                            toast.success("Đã sao chép mã đơn hàng!");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              navigator.clipboard.writeText(order.trackingNumber || String(order.id));
                              toast.success("Đã sao chép mã đơn hàng!");
                            }
                          }}
                          className="flex size-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                          title="Sao chép mã đơn hàng"
                        >
                          <Copy className="size-3.5" />
                        </span>
                      </div>
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
                      {t("Phí giao")} {formatCurrency(order.shippingFee)}
                    </p>
                  </div>

                  <span className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-emerald-100 px-3 text-sm font-black text-emerald-800">
                    {detailLoading ? t("Đang tải") : expanded ? t("Thu gọn") : t("Chi tiết")}
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
                          {t("Sản phẩm đã mua")}
                        </p>
                        <div className="space-y-2">
                          {(order.items || []).map((item) => {
                            const existingReview = getReviewByProduct(
                              reviews,
                              item.productId
                            );
                            const reviewable = isCompletedOrder(order);
                            const draft = getReviewDraft(
                              reviewDrafts[String(item.productId)]
                            );
                            const draftImages = draft.images;
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
                                    {Array.isArray(existingReview.images) &&
                                      existingReview.images.length > 0 && (
                                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                          {existingReview.images.map((imageUrl, index) => (
                                            <div
                                              key={`${existingReview.id}-image-${index}`}
                                              className="aspect-square overflow-hidden rounded-[8px] border border-amber-100 bg-white"
                                            >
                                              <img
                                                src={getAssetUrl(imageUrl)}
                                                alt={`Anh danh gia ${index + 1}`}
                                                className="h-full w-full object-cover"
                                              />
                                            </div>
                                          ))}
                                        </div>
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
                                    <div className="mt-3 space-y-2">
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-black uppercase text-emerald-700">
                                          Anh thuc te
                                        </p>
                                        <span className="text-xs font-semibold text-muted-foreground">
                                          {draftImages.length}/{MAX_REVIEW_IMAGES} anh
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                        {draftImages.map((image, index) => (
                                          <div
                                            key={image.id || `${item.productId}-image-${index}`}
                                            className="relative aspect-square overflow-hidden rounded-[8px] border border-emerald-100 bg-white"
                                          >
                                            <img
                                              src={getAssetUrl(getReviewImageSource(image))}
                                              alt={`Anh danh gia ${index + 1}`}
                                              className="h-full w-full object-cover"
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                onRemoveReviewImage(item.productId, index)
                                              }
                                              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition hover:bg-red-50 hover:text-red-600"
                                              aria-label="Xoa anh danh gia"
                                            >
                                              <X className="size-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                        {draftImages.length < MAX_REVIEW_IMAGES && (
                                          <label
                                            htmlFor={`review-images-${order.id}-${item.productId}`}
                                            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed border-emerald-200 bg-white text-center text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
                                          >
                                            <ImagePlus className="size-5" />
                                            <span className="px-1 text-[11px] font-bold">
                                              Them anh
                                            </span>
                                            <input
                                              id={`review-images-${order.id}-${item.productId}`}
                                              type="file"
                                              accept="image/jpeg,image/png,image/webp,image/gif"
                                              multiple
                                              className="hidden"
                                              onChange={(event) => {
                                                onSelectReviewImages(
                                                  item.productId,
                                                  event.target.files
                                                );
                                                event.target.value = "";
                                              }}
                                            />
                                          </label>
                                        )}
                                      </div>
                                      <p className="text-xs font-semibold text-muted-foreground">
                                        Toi da 3 anh, moi anh khong qua 5MB.
                                      </p>
                                    </div>
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
                            SĐT: {order.shippingAddress?.phone || order.customerPhoneNumber || "Chưa có SĐT"}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            Đến: {getShippingText(order)}
                          </p>
                          {order.deliveryStaff && (
                            <div className="mt-3 pt-3 border-t border-emerald-100/50">
                              <p className="text-xs font-black uppercase text-emerald-700">Đơn vị & Tài xế giao hàng</p>
                              <p className="mt-1 font-bold text-slate-900">{order.deliveryStaff.name || "Tài xế AgriMarket"}</p>
                              {order.deliveryStaff.phoneNumber && (
                                <p className="text-xs font-semibold text-slate-500">Liên hệ: {order.deliveryStaff.phoneNumber}</p>
                              )}
                              <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">Đối tác vận chuyển hỏa tốc AgriExpress</p>
                            </div>
                          )}
                        </div>

                        <div className="rounded-[8px] border border-emerald-100 bg-white p-3">
                          <p className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-emerald-700">
                            <CreditCard className="size-4" />
                            {t("Thanh toán")}
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-3">
                              <span className="text-muted-foreground">{t("Tạm tính")}</span>
                              <span className="font-bold">{formatCurrency(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-muted-foreground">{t("Giảm giá")}</span>
                              <span className="font-bold">{formatCurrency(order.discountAmount)}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-muted-foreground">{t("Phí giao")}</span>
                              <span className="font-bold">{formatCurrency(order.shippingFee)}</span>
                            </div>
                            <div className="flex justify-between gap-3 border-t border-emerald-100 pt-2 text-base font-black">
                              <span>{t("Tổng cộng")}</span>
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
                        {t("Tiến trình đơn hàng")}
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
                          {t("Chưa có lịch sử trạng thái chi tiết cho đơn này.")}
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

function mapShippingAddressToForm(shippingAddress) {
  const form = createVietnamAddressForm({
    fullName: shippingAddress.fullName || "",
    phone: shippingAddress.phone || "",
    defaultAddress: Boolean(shippingAddress.defaultAddress),
  });

  if (!shippingAddress.city) {
    form.address = shippingAddress.address || "";
    return form;
  }

  // 1. Tìm tỉnh/thành phố khớp tên
  const cityNameNorm = String(shippingAddress.city).trim().toLowerCase();
  const province = VIETNAM_PROVINCES.find((p) => {
    const pName = String(p.name).toLowerCase();
    return pName.includes(cityNameNorm) || cityNameNorm.includes(pName);
  });

  if (!province) {
    form.address = [shippingAddress.address, shippingAddress.city].filter(Boolean).join(", ");
    return form;
  }

  form.provinceCode = String(province.code);
  form.provinceName = province.name;

  // 2. Tìm quận/huyện, phường/xã trong địa chỉ cụ thể
  const rawAddr = shippingAddress.address || "";
  const parts = rawAddr.split(",").map((p) => p.trim());

  let foundDistrict = null;
  let districtIndex = -1;

  if (Array.isArray(province.districts)) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const partNorm = parts[i].toLowerCase();
      const dist = province.districts.find((d) => {
        const dName = String(d.name).toLowerCase();
        return dName.includes(partNorm) || partNorm.includes(dName);
      });
      if (dist) {
        foundDistrict = dist;
        districtIndex = i;
        break;
      }
    }
  }

  if (foundDistrict) {
    form.districtCode = String(foundDistrict.code);
    form.districtName = foundDistrict.name;

    let foundWard = null;
    let wardIndex = -1;

    if (Array.isArray(foundDistrict.wards)) {
      for (let i = districtIndex - 1; i >= 0; i--) {
        const partNorm = parts[i].toLowerCase();
        const ward = foundDistrict.wards.find((w) => {
          const wName = String(w.name).toLowerCase();
          return wName.includes(partNorm) || partNorm.includes(wName);
        });
        if (ward) {
          foundWard = ward;
          wardIndex = i;
          break;
        }
      }
    }

    if (foundWard) {
      form.wardCode = String(foundWard.code);
      form.wardName = foundWard.name;
      form.address = parts.slice(0, wardIndex).join(", ");
    } else {
      form.address = parts.slice(0, districtIndex).join(", ");
    }
  } else {
    form.address = rawAddr;
  }

  return form;
}

export default function CustomerProfilePage() {
  const { t } = useLanguage();
  const [authStatus, setAuthStatus] = useState("checking");
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(blankProfileForm);
  const [profileAddressForm, setProfileAddressForm] = useState(() =>
    createVietnamAddressForm()
  );
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState(() =>
    createVietnamAddressForm({ fullName: "", phone: "", defaultAddress: false })
  );
  const [savingAddress, setSavingAddress] = useState(false);
  const [passwordForm, setPasswordForm] = useState(blankPasswordForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
  const [activeTab, setActiveTab] = useState("profile"); // "profile", "addresses", "password", "orders"
  const [orderFilter, setOrderFilter] = useState("all"); // "all", "pending", "delivering", "completed", "canceled"
  const [phoneError, setPhoneError] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);

  const loadPublicCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const response = await promotionService.getPublicCoupons({ page: 0, size: 5 });
      const content = readPageContent(response);
      setCoupons(content || []);
    } catch (err) {
      console.warn("Failed to load public coupons:", err);
      setCoupons([]);
    } finally {
      setCouponsLoading(false);
    }
  }, []);

  const profileInitial = getInitial(profile);
  const profileAvatarUrl = getAssetUrl(form.avatar || profile?.avatar);

  const getTierLabel = (tier) => {
    const labels = {
      BRONZE: t("Đồng"),
      SILVER: t("Bạc"),
      GOLD: t("Vàng"),
      PLATINUM: t("Kim Cương"),
    };
    return labels[String(tier).toUpperCase()] || tier || t("Đồng");
  };

  const profileStats = useMemo(
    () => [
      {
        title: t("Xu tích lũy"),
        value: profile?.loyaltyPoints !== undefined ? `${formatNumber(profile.loyaltyPoints)} Xu` : "0 Xu",
        description: t("Dùng để giảm trừ trực tiếp khi thanh toán"),
        icon: Coins,
        tone: "amber",
      },
      {
        title: t("Hạng thành viên"),
        value: profile?.membershipTier ? getTierLabel(profile.membershipTier) : t("Đồng"),
        description: t("Hạng Vàng & Kim Cương được mã VIP"),
        icon: Award,
        tone: "rose",
      },
      {
        title: t("Số điện thoại"),
        value: profile?.phoneNumber || t("Chưa thêm"),
        description: t("Số điện thoại giao hàng mặc định"),
        icon: Phone,
        tone: "green",
      },
    ],
    [profile, t]
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
      const profileData = unwrapApiData(response);
      setProfile(profileData);
      setForm({
        name: profileData?.name || "",
        phoneNumber: profileData?.phoneNumber || "",
        address: profileData?.address || "",
        avatar: profileData?.avatar || "",
      });

      // Tải danh sách địa chỉ giao hàng của khách hàng
      let nextAddresses = [];
      try {
        const addrResponse = await shippingAddressService.getAddresses();
        nextAddresses = Array.isArray(addrResponse) ? addrResponse : [];
        setAddresses(nextAddresses);
      } catch (addrErr) {
        console.warn("Failed to load shipping addresses on profile mount:", addrErr);
      }

      // Tự động đồng bộ hóa nếu trường address của profile rỗng mà có địa chỉ mặc định
      const defaultAddr = nextAddresses.find((a) => a.defaultAddress) || nextAddresses[0];
      if (profileData && !profileData.address && defaultAddr) {
        const fullAddr = [defaultAddr.address, defaultAddr.city].filter(Boolean).join(", ");
        try {
          const syncResponse = await profileService.updateProfile({
            name: profileData.name || "",
            phoneNumber: profileData.phoneNumber || defaultAddr.phone || "",
            address: fullAddr,
            avatar: profileData.avatar || "",
          });
          const updatedProfile = unwrapApiData(syncResponse);
          setProfile(updatedProfile);
          setForm({
            name: updatedProfile?.name || "",
            phoneNumber: updatedProfile?.phoneNumber || "",
            address: updatedProfile?.address || "",
            avatar: updatedProfile?.avatar || "",
          });
        } catch (syncErr) {
          console.warn("Auto-sync profile address failed:", syncErr);
        }
      }

      setAuthStatus("authenticated");
    } catch (err) {
      setError(err?.message || "Không thể tải hồ sơ khách hàng.");
      setAuthStatus("unauthenticated");
      clearAuthSession(AUTH_SCOPES.customer);
    } finally {
      setLoading(false);
    }
  }, []);

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

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");
        if (tab && ["profile", "addresses", "password", "orders", "coupons"].includes(tab)) {
          setActiveTab(tab);
        }
      }

      if (!session?.accessToken || isAuthSessionExpired(session)) {
        clearAuthSession(AUTH_SCOPES.customer);
        setAuthStatus("unauthenticated");
        loadPublicCoupons();
        return;
      }

      setAuthStatus("authenticated");
      applyProfile(session.currentUser);
      loadProfile();
      loadOrderHistory();
      loadMyReviews();
      loadPublicCoupons();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [applyProfile, loadMyReviews, loadOrderHistory, loadProfile, loadPublicCoupons]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updatePasswordForm(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  function updateStoredProfile(nextProfile) {
    const session = getAuthSession(AUTH_SCOPES.customer);

    if (!session?.accessToken) {
      return;
    }

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

  async function handleAvatarFile(file) {
    if (!file) {
      return null;
    }

    const response = await profileService.uploadAvatar(file);
    const nextProfile = unwrapApiData(response);

    applyProfile(nextProfile);
    updateStoredProfile(nextProfile);

    return nextProfile;
  }

  async function handleAvatarRemove() {
    const response = await profileService.deleteAvatar();
    const nextProfile = unwrapApiData(response);
    applyProfile(nextProfile);
    updateStoredProfile(nextProfile);
    setNotice("Đã xóa ảnh đại diện.");
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    setPhoneError("");

    if (!isValidPhoneNumber(form.phoneNumber)) {
      setError(PHONE_ERROR_MESSAGE);
      setSaving(false);
      return;
    }

    try {
      const phoneValidationError = getVietnamPhoneError(form.phoneNumber);
      if (phoneValidationError) {
        setPhoneError(phoneValidationError);
        setError(phoneValidationError);
        setSaving(false);
        return;
      }

      const response = await profileService.updateProfile({
        name: form.name.trim(),
        phoneNumber: normalizeVietnamPhone(form.phoneNumber),
        address: profile?.address || "", // Giữ nguyên địa chỉ hiện tại
        avatar: form.avatar.trim(),
      });
      const nextProfile = unwrapApiData(response);
      applyProfile(nextProfile);
      updateStoredProfile(nextProfile);

      setNotice("Đã cập nhật hồ sơ cá nhân thành công.");
    } catch (err) {
      setError(err?.message || "Không thể cập nhật hồ sơ cá nhân.");
    } finally {
      setSaving(false);
    }
  }

  function openAddressForm(addr = null) {
    if (addr) {
      setEditingAddress(addr);
      setAddressForm(mapShippingAddressToForm(addr));
    } else {
      setEditingAddress(null);
      setAddressForm(createVietnamAddressForm({
        fullName: "",
        phone: "",
        defaultAddress: addresses.length === 0,
      }));
    }
    setShowAddressForm(true);
  }

  function closeAddressForm() {
    setEditingAddress(null);
    setAddressForm(createVietnamAddressForm({
      fullName: "",
      phone: "",
      defaultAddress: false,
    }));
    setShowAddressForm(false);
  }

  async function handleSaveAddress(event) {
    event.preventDefault();
    setSavingAddress(true);
    setError("");
    setNotice("");

    try {
      const payload = addressFormToShippingPayload(addressForm, addresses.length);
      if (
        !payload.fullName ||
        !payload.phone ||
        !payload.city ||
        !isVietnamAddressComplete(addressForm) ||
        !payload.address
      ) {
        throw new Error("Vui lòng nhập đầy đủ thông tin địa chỉ giao hàng.");
      }

      // Nếu đang sửa địa chỉ và nó là mặc định, hoặc đây là địa chỉ duy nhất
      // payload.defaultAddress sẽ là true
      if (editingAddress) {
        payload.defaultAddress = Boolean(addressForm.defaultAddress) || editingAddress.defaultAddress || addresses.length === 1;
      } else {
        payload.defaultAddress = Boolean(addressForm.defaultAddress) || addresses.length === 0;
      }

      let savedAddress;
      if (editingAddress) {
        savedAddress = await shippingAddressService.updateAddress(editingAddress.id, payload);
      } else {
        savedAddress = await shippingAddressService.createAddress(payload);
      }

      // Tải lại danh sách địa chỉ mới nhất
      const nextAddresses = await shippingAddressService.getAddresses();
      const normalizedAddresses = Array.isArray(nextAddresses) ? nextAddresses : [];
      setAddresses(normalizedAddresses);

      // Nếu là mặc định, đồng bộ lên profile user.address
      const isDefault = savedAddress?.defaultAddress || normalizedAddresses.length === 1;
      if (isDefault) {
        const fullAddr = [savedAddress.address, savedAddress.city].filter(Boolean).join(", ");
        const syncResponse = await profileService.updateProfile({
          name: profile?.name || form.name.trim(),
          phoneNumber: profile?.phoneNumber || savedAddress.phone || form.phoneNumber.trim(),
          address: fullAddr,
          avatar: profile?.avatar || form.avatar.trim(),
        });
        const nextProfile = unwrapApiData(syncResponse);
        setProfile(nextProfile);
        setForm({
          name: nextProfile?.name || "",
          phoneNumber: nextProfile?.phoneNumber || "",
          address: nextProfile?.address || "",
          avatar: nextProfile?.avatar || "",
        });

        // Đồng bộ storage session
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
      }

      setAddressForm(createVietnamAddressForm({ fullName: "", phone: "", defaultAddress: false }));
      setShowAddressForm(false);
      setEditingAddress(null);
      setNotice(editingAddress ? "Đã cập nhật địa chỉ thành công." : "Đã thêm địa chỉ giao hàng mới.");
    } catch (err) {
      setError(err?.message || "Không thể lưu địa chỉ giao hàng.");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleSetDefault(addressId) {
    setError("");
    setNotice("");

    try {
      const response = await shippingAddressService.setDefaultAddress(addressId);
      const nextAddresses = await shippingAddressService.getAddresses();
      const normalizedAddresses = Array.isArray(nextAddresses) ? nextAddresses : [];
      setAddresses(normalizedAddresses);

      // Đồng bộ địa chỉ mặc định mới với profile user
      const defaultAddr = normalizedAddresses.find((a) => a.defaultAddress) || response;
      if (defaultAddr) {
        const fullAddr = [defaultAddr.address, defaultAddr.city].filter(Boolean).join(", ");
        const syncResponse = await profileService.updateProfile({
          name: profile?.name || form.name.trim(),
          phoneNumber: profile?.phoneNumber || defaultAddr.phone || form.phoneNumber.trim(),
          address: fullAddr,
          avatar: profile?.avatar || form.avatar.trim(),
        });
        const nextProfile = unwrapApiData(syncResponse);
        setProfile(nextProfile);
        setForm({
          name: nextProfile?.name || "",
          phoneNumber: nextProfile?.phoneNumber || "",
          address: nextProfile?.address || "",
          avatar: nextProfile?.avatar || "",
        });

        // Đồng bộ storage session
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
      }

      setNotice("Đã đặt làm địa chỉ mặc định thành công.");
    } catch (err) {
      setError(err?.message || "Không thể đặt địa chỉ mặc định.");
    }
  }

  function openDeleteConfirm(addressId) {
    setDeletingAddressId(addressId);
    setIsDeleteConfirmOpen(true);
    setError("");
    setNotice("");
  }

  function closeDeleteConfirm() {
    setIsDeleteConfirmOpen(false);
    setDeletingAddressId(null);
  }

  async function handleDeleteAddress() {
    setIsDeletingAddress(true);
    setError("");
    setNotice("");

    try {
      const addressToDelete = addresses.find((a) => a.id === deletingAddressId);
      await shippingAddressService.deleteAddress(deletingAddressId);

      const nextAddresses = await shippingAddressService.getAddresses();
      const normalizedAddresses = Array.isArray(nextAddresses) ? nextAddresses : [];
      setAddresses(normalizedAddresses);

      // Nếu xóa địa chỉ mặc định, set địa chỉ còn lại làm mặc định mới
      if (addressToDelete?.defaultAddress && normalizedAddresses.length > 0) {
        const newDefaultId = normalizedAddresses[0].id;
        await shippingAddressService.setDefaultAddress(newDefaultId);

        const finalAddresses = await shippingAddressService.getAddresses();
        const finalNormalized = Array.isArray(finalAddresses) ? finalAddresses : [];
        setAddresses(finalNormalized);

        const newDefaultAddr = finalNormalized.find((a) => a.defaultAddress) || finalNormalized[0];
        if (newDefaultAddr) {
          const fullAddr = [newDefaultAddr.address, newDefaultAddr.city].filter(Boolean).join(", ");
          const syncResponse = await profileService.updateProfile({
            name: profile?.name || form.name.trim(),
            phoneNumber: profile?.phoneNumber || newDefaultAddr.phone || form.phoneNumber.trim(),
            address: fullAddr,
            avatar: profile?.avatar || form.avatar.trim(),
          });
          const nextProfile = unwrapApiData(syncResponse);
          setProfile(nextProfile);
          setForm({
            name: nextProfile?.name || "",
            phoneNumber: nextProfile?.phoneNumber || "",
            address: nextProfile?.address || "",
            avatar: nextProfile?.avatar || "",
          });
        }
      } else if (normalizedAddresses.length === 0) {
        // Hết địa chỉ, xóa trắng trong profile user
        const syncResponse = await profileService.updateProfile({
          name: profile?.name || form.name.trim(),
          phoneNumber: profile?.phoneNumber || form.phoneNumber.trim(),
          address: "",
          avatar: profile?.avatar || form.avatar.trim(),
        });
        const nextProfile = unwrapApiData(syncResponse);
        setProfile(nextProfile);
        setForm({
          name: nextProfile?.name || "",
          phoneNumber: nextProfile?.phoneNumber || "",
          address: nextProfile?.address || "",
          avatar: nextProfile?.avatar || "",
        });
      }

      setNotice("Đã xóa địa chỉ thành công.");
      closeDeleteConfirm();
    } catch (err) {
      setError(err.response?.data?.message || err?.message || "Không thể xóa địa chỉ giao hàng.");
    } finally {
      setIsDeletingAddress(false);
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

  function selectReviewImages(productId, fileList) {
    const key = String(productId);
    const files = Array.from(fileList || []);

    if (files.length === 0) {
      return;
    }

    setReviewDrafts((current) => {
      const draft = getReviewDraft(current[key]);
      const remainingSlots = MAX_REVIEW_IMAGES - draft.images.length;

      if (remainingSlots <= 0) {
        toast.error("Chi duoc them toi da 3 anh danh gia.");
        return current;
      }

      const validImages = [];
      for (const file of files.slice(0, remainingSlots)) {
        if (!REVIEW_IMAGE_TYPES.has(file.type)) {
          toast.error("Chi ho tro anh jpg, png, webp hoac gif.");
          continue;
        }

        if (file.size > MAX_REVIEW_IMAGE_SIZE) {
          toast.error(`Anh "${file.name}" vuot qua 5MB.`);
          continue;
        }

        validImages.push({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${file.name}`,
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }

      if (files.length > remainingSlots) {
        toast.warning("Chi giu lai toi da 3 anh dau tien.");
      }

      if (validImages.length === 0) {
        return current;
      }

      return {
        ...current,
        [key]: {
          ...draft,
          images: [...draft.images, ...validImages],
        },
      };
    });
  }

  function removeReviewImage(productId, imageIndex) {
    const key = String(productId);

    setReviewDrafts((current) => {
      const draft = getReviewDraft(current[key]);
      const removedImage = draft.images[imageIndex];
      if (removedImage?.previewUrl) {
        URL.revokeObjectURL(removedImage.previewUrl);
      }

      return {
        ...current,
        [key]: {
          ...draft,
          images: draft.images.filter((_, index) => index !== imageIndex),
        },
      };
    });
  }

  async function uploadDraftReviewImages(images) {
    const uploadedUrls = [];

    for (const image of images) {
      if (typeof image === "string") {
        uploadedUrls.push(image);
        continue;
      }

      if (!image?.file) {
        continue;
      }

      const uploadedImage = await reviewService.uploadReviewImage(image.file);
      const imageUrl = uploadedImage?.path || uploadedImage?.url;

      if (imageUrl) {
        uploadedUrls.push(imageUrl);
      }
    }

    return uploadedUrls.slice(0, MAX_REVIEW_IMAGES);
  }

  async function submitReview(event, item) {
    event.preventDefault();

    const productId = Number(item.productId);

    if (!Number.isFinite(productId)) {
      setOrdersError("Không thể xác định sản phẩm cần đánh giá.");
      return;
    }

    const key = String(productId);
    const draft = getReviewDraft(reviewDrafts[key]);
    const rating = Number(draft.rating || 0);

    if (rating < 1 || rating > 5) {
      setOrdersError("Vui lòng chọn điểm đánh giá từ 1 đến 5 sao.");
      return;
    }

    setReviewSubmittingId(key);
    setOrdersError("");

    try {
      const uploadedImageUrls = await uploadDraftReviewImages(draft.images);
      const createdReview = await reviewService.createReview({
        productId,
        rating,
        comment: String(draft.comment || "").trim(),
        images: uploadedImageUrls,
      });

      setReviews((current) => [createdReview, ...current]);
      setReviewDrafts((current) => {
        draft.images.forEach((image) => {
          if (image?.previewUrl) {
            URL.revokeObjectURL(image.previewUrl);
          }
        });
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
    <main className="min-h-screen bg-background text-foreground">
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
          description="Quản lý thông tin cá nhân, số điện thoại và địa chỉ nhận hàng để cập nhật trạng thái mua sắm của bạn."
          image="/market-assets/fresh-market-hero.png"
          badges={["Thành viên AgriMarket", "Tài khoản hoạt động"]}
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
            <section className="relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-b from-[#f7faf4] to-white p-6 text-emerald-950 shadow-sm min-h-[380px] flex flex-col justify-between">
              {/* Background decorative patterns */}
              <div className="absolute -right-16 -top-16 size-48 rounded-full bg-emerald-100/30 blur-xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 size-40 rounded-full bg-emerald-50/20 blur-xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-100">
                  <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Chương trình ưu đãi
                </div>
                
                <h2 className="text-2xl font-black leading-tight text-emerald-950">
                  Khuyến mãi từ <span className="text-emerald-600">AgriMarket</span>
                </h2>
                
                <p className="text-sm leading-relaxed text-slate-600 max-w-sm">
                  Đăng nhập tài khoản của bạn để dễ dàng mua nông sản sạch hỏa tốc, tích lũy điểm thưởng và áp dụng voucher giảm giá thực tế khi thanh toán.
                </p>
              </div>

              {/* Discount / Advertisement announcements container */}
              <div className="relative z-10 mt-6 space-y-3">
                <div className="rounded-xl border border-emerald-100/80 bg-white p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-800">Mã giảm giá khả dụng</p>
                  
                  {couponsLoading ? (
                    <p className="text-xs text-slate-500 mt-2">Đang tải danh sách ưu đãi...</p>
                  ) : coupons.length > 0 ? (
                    <div className="mt-2 space-y-2 max-h-[140px] overflow-y-auto">
                      {coupons.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              Giảm {c.discountType === "PERCENTAGE" || c.discountPercentage > 0 ? `${c.discountPercentage}%` : `${formatCurrency(c.discountAmount)}`}
                            </p>
                            {c.minOrderValue > 0 && (
                              <p className="text-[10px] text-slate-500">Đơn từ {formatCurrency(c.minOrderValue)}</p>
                            )}
                          </div>
                          <span className="rounded border border-emerald-200 bg-emerald-50/50 px-2 py-0.5 text-xs font-black text-emerald-700 font-mono">
                            {c.code}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800">Giảm 20% tổng giá trị đơn</p>
                          <p className="text-[10px] text-slate-500">Đơn tối thiểu 2.000.000đ</p>
                        </div>
                        <span className="rounded border border-emerald-200 bg-emerald-50/50 px-2 py-0.5 text-xs font-black text-emerald-700 font-mono">
                          GIAM20
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800">Mã giảm giá thành viên mới</p>
                          <p className="text-[10px] text-slate-500">Giảm 5% cho đơn hàng đầu tiên</p>
                        </div>
                        <span className="rounded border border-emerald-200 bg-emerald-50/50 px-2 py-0.5 text-xs font-black text-emerald-700 font-mono">
                          KK
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </section>
            <AuthPanel onAuthenticated={handleAuthenticated} />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Sidebar Cột Trái (Shopee Style) */}
            <aside className="space-y-4">
              <div className="flex items-center gap-3 border-b border-emerald-100/50 pb-4">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-lg font-black text-white shadow-sm">
                  {profileAvatarUrl ? (
                    <span
                      className="size-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${profileAvatarUrl}")` }}
                    />
                  ) : (
                    profileInitial
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{profile?.name || t("Thành viên")}</p>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition"
                  >
                    <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {t("Sửa hồ sơ")}
                  </button>
                </div>
              </div>

              <nav className="space-y-1">
                <div className="px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-400">{t("Tài khoản của tôi")}</div>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition ${
                    activeTab === "profile"
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-600 hover:bg-emerald-50/40 hover:text-emerald-700"
                  }`}
                >
                  <UserRound className="size-4" />
                  {t("Hồ sơ cá nhân")}
                </button>
                <button
                  onClick={() => setActiveTab("addresses")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition ${
                    activeTab === "addresses"
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-600 hover:bg-emerald-50/40 hover:text-emerald-700"
                  }`}
                >
                  <MapPin className="size-4" />
                  {t("Địa chỉ nhận hàng")}
                </button>
                <button
                  onClick={() => setActiveTab("password")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition ${
                    activeTab === "password"
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-600 hover:bg-emerald-50/40 hover:text-emerald-700"
                  }`}
                >
                  <LockKeyhole className="size-4" />
                  {t("Đổi mật khẩu")}
                </button>

                <div className="pt-4 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-400">{t("Quản lý giao dịch")}</div>
                <button
                  onClick={() => {
                    setActiveTab("orders");
                    setOrderFilter("all");
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition ${
                    activeTab === "orders"
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-600 hover:bg-emerald-50/40 hover:text-emerald-700"
                  }`}
                >
                  <ReceiptText className="size-4" />
                  {t("Đơn mua của tôi")}
                </button>
              </nav>
            </aside>

            {/* Content Cột Phải (Shopee Style) */}
            <main className="min-w-0">
              {activeTab === "profile" && (
                <form
                  onSubmit={handleSave}
                  className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{t("Hồ sơ cá nhân")}</h2>
                    <p className="mt-1 text-sm text-slate-500">{t("Thông tin hồ sơ để bảo mật tài khoản tốt nhất")}</p>
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    {profileStats.map((stat, idx) => (
                      <StatCard
                        key={idx}
                        title={stat.title}
                        value={stat.value}
                        description={stat.description}
                        icon={stat.icon}
                        tone={stat.tone}
                      />
                    ))}
                  </div>

                  <div className="grid gap-5 md:grid-cols-[1fr_220px]">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">{t("Họ và tên")}</Label>
                        <Input
                          id="profile-name"
                          value={form.name}
                          onChange={(event) => updateForm("name", event.target.value)}
                          className="h-11 bg-slate-50/50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-email">{t("Địa chỉ email")}</Label>
                        <Input
                          id="profile-email"
                          value={profile?.email || ""}
                          className="h-11 bg-slate-100 text-slate-500 cursor-not-allowed"
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-phone">{t("Số điện thoại")}</Label>
                        <Input
                          id="profile-phone"
                          value={form.phoneNumber}
                          onChange={(event) => {
                            updateForm("phoneNumber", event.target.value);
                            setPhoneError(getVietnamPhoneError(event.target.value));
                          }}
                          className={`h-11 bg-slate-50/50 ${phoneError ? "border-red-500" : ""}`}
                          placeholder="090..."
                        />
                        {phoneError && (
                          <p className="text-xs font-semibold text-red-600">{phoneError}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center border-l border-slate-100 pl-4">
                      <Label className="mb-3 block text-sm font-bold text-slate-600">{t("Ảnh đại diện")}</Label>
                      <AvatarUploadField
                        id="profile-avatar"
                        value={form.avatar}
                        disabled={saving || loading}
                        uploading={uploadingAvatar}
                        onChange={(value) => updateForm("avatar", value)}
                        onUpload={handleAvatarFile}
                        onRemove={handleAvatarRemove}
                        onUploadStart={() => {
                          setUploadingAvatar(true);
                          setError("");
                          setNotice("");
                        }}
                        onUploadEnd={() => setUploadingAvatar(false)}
                        onUploadSuccess={(msg) => setNotice(msg)}
                        onUploadError={(msg) => setError(msg)}
                      />
                    </div>
                  </div>

                  {notice && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                      {notice}
                    </div>
                  )}
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2 border-t border-slate-100 pt-4">
                    <Button
                      type="submit"
                      className="h-10 bg-emerald-600 font-bold hover:bg-emerald-700 px-6"
                      disabled={saving || loading || uploadingAvatar}
                    >
                      <Save className="size-4" />
                      {saving ? t("Đang lưu...") : t("Lưu thay đổi")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 border-emerald-100 bg-white text-emerald-800"
                      onClick={loadProfile}
                      disabled={loading}
                    >
                      {t("Tải lại")}
                    </Button>
                  </div>
                </form>
              )}

              {activeTab === "addresses" && (
                <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">{t("Địa chỉ nhận hàng")}</h2>
                      <p className="mt-1 text-sm text-slate-500">{t("Quản lý các địa chỉ nhận nông sản giao hỏa tốc của bạn")}</p>
                    </div>
                    {!showAddressForm && (
                      <Button
                        type="button"
                        className="h-10 bg-emerald-600 px-4 font-bold hover:bg-emerald-700"
                        onClick={() => openAddressForm(null)}
                      >
                        + {t("Thêm địa chỉ mới")}
                      </Button>
                    )}
                  </div>

                  {notice && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 animate-fade-in">
                      {notice}
                    </div>
                  )}
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 animate-shake">
                      {error}
                    </div>
                  )}

                  {showAddressForm ? (
                    <form onSubmit={handleSaveAddress} className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/20 p-4">
                      <h3 className="font-black text-emerald-950 text-base">
                        {editingAddress ? t("Chỉnh sửa địa chỉ nhận hàng") : t("Thêm địa chỉ giao hàng mới")}
                      </h3>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="address-fullname">{t("Họ tên người nhận")}</Label>
                          <Input
                            id="address-fullname"
                            value={addressForm.fullName || ""}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, fullName: e.target.value }))}
                            className="h-11 bg-white"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address-phone">{t("Số điện thoại nhận hàng")}</Label>
                          <Input
                            id="address-phone"
                            value={addressForm.phone || ""}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="h-11 bg-white"
                            required
                          />
                        </div>

                        <VietnamAddressFields
                          value={addressForm}
                          onChange={setAddressForm}
                          idPrefix="address-book"
                          className="sm:col-span-2"
                          detailLabel="Địa chỉ chi tiết nhận hàng"
                          detailPlaceholder="Số nhà, tên đường, tên toà nhà..."
                          detailRows={3}
                        />

                        <div className="flex items-center gap-2 sm:col-span-2 py-2">
                          <input
                            type="checkbox"
                            id="address-default"
                            checked={Boolean(addressForm.defaultAddress)}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, defaultAddress: e.target.checked }))}
                            disabled={editingAddress?.defaultAddress || addresses.length === 0}
                            className="size-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <label htmlFor="address-default" className="text-sm font-semibold text-emerald-900 cursor-pointer">
                            {t("Đặt làm địa chỉ nhận hàng mặc định")}
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-emerald-100/50">
                        <Button
                          type="submit"
                          className="h-10 bg-emerald-600 font-bold hover:bg-emerald-700"
                          disabled={savingAddress}
                        >
                          {savingAddress ? t("Đang lưu...") : t("Lưu địa chỉ")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 border-emerald-100 bg-white text-emerald-800"
                          onClick={closeAddressForm}
                          disabled={savingAddress}
                        >
                          {t("Hủy bỏ")}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      {addresses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border border-dashed border-emerald-100 rounded-xl bg-emerald-50/5">
                          <MapPin className="size-8 text-emerald-600 mb-2 animate-bounce" />
                          <p className="font-semibold text-sm">{t("Bạn chưa thêm địa chỉ nhận hàng nào.")}</p>
                          <p className="text-xs mt-1">{t("Vui lòng bấm \"+ Thêm địa chỉ mới\" để tiếp tục mua sắm.")}</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {addresses.map((addr) => (
                            <div
                              key={addr.id}
                              className={`rounded-xl border p-4 transition-all duration-300 ${
                                addr.defaultAddress
                                  ? "border-emerald-500 bg-emerald-50/30 shadow-sm"
                                  : "border-emerald-100 bg-white hover:border-emerald-300"
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-black text-emerald-950 text-base">
                                      {addr.fullName}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      | {addr.phone}
                                    </span>
                                    {addr.defaultAddress && (
                                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800">
                                        {t("Mặc định")}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-emerald-900 leading-relaxed pt-1">
                                    {[addr.address, addr.city].filter(Boolean).join(", ")}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-8 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 text-xs px-2"
                                    onClick={() => openAddressForm(addr)}
                                  >
                                    {t("Sửa")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-2"
                                    onClick={() => openDeleteConfirm(addr.id)}
                                  >
                                    {t("Xóa")}
                                  </Button>
                                </div>
                              </div>

                              {!addr.defaultAddress && (
                                <div className="mt-3 pt-3 border-t border-emerald-100/50 flex justify-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 text-xs border-emerald-100 text-emerald-800 bg-white hover:bg-emerald-50"
                                    onClick={() => handleSetDefault(addr.id)}
                                  >
                                    {t("Thiết lập làm mặc định")}
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "password" && (
                <form
                  onSubmit={handleChangePassword}
                  className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm space-y-6 max-w-xl"
                >
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{t("Đổi mật khẩu")}</h2>
                    <p className="mt-1 text-sm text-slate-500">{t("Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác")}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer-current-password">{t("Mật khẩu hiện tại")}</Label>
                      <Input
                        id="customer-current-password"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          updatePasswordForm("currentPassword", event.target.value)
                        }
                        className="h-11 bg-slate-50/50"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-new-password">{t("Mật khẩu mới")}</Label>
                      <Input
                        id="customer-new-password"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(event) =>
                          updatePasswordForm("newPassword", event.target.value)
                        }
                        className="h-11 bg-slate-50/50"
                        minLength={6}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-confirm-password">{t("Xác nhận mật khẩu mới")}</Label>
                      <Input
                        id="customer-confirm-password"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) =>
                          updatePasswordForm("confirmPassword", event.target.value)
                        }
                        className="h-11 bg-slate-50/50"
                        minLength={6}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>

                  {notice && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                      {notice}
                    </div>
                  )}
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <Button
                      type="submit"
                      className="h-10 bg-slate-950 font-bold hover:bg-emerald-700 px-6"
                      disabled={changingPassword}
                    >
                      <LockKeyhole className="size-4" />
                      {changingPassword ? t("Đang đổi...") : t("Cập nhật mật khẩu")}
                    </Button>
                  </div>
                </form>
              )}

              {activeTab === "orders" && (
                <div className="space-y-4">
                  {/* Thanh Phân loại Trạng thái Đơn hàng Shopee Style */}
                  <div className="flex border-b border-slate-200 bg-white rounded-xl shadow-sm overflow-x-auto whitespace-nowrap">
                    {[
                      { value: "all", label: t("Tất cả") },
                      { value: "pending", label: t("Chờ xử lý") },
                      { value: "delivering", label: t("Đang giao") },
                      { value: "completed", label: t("Hoàn tất") },
                      { value: "canceled", label: t("Đã hủy") },
                    ].map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setOrderFilter(tab.value)}
                        className={`flex-1 min-w-[80px] py-4 px-2 text-center text-sm font-bold border-b-2 transition ${
                          orderFilter === tab.value
                            ? "border-emerald-600 text-emerald-700"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <PurchaseHistorySection
                    orders={orders.filter((order) => {
                      if (orderFilter === "all") return true;
                      const status = String(order.status || "").toLowerCase();
                      if (orderFilter === "pending") return ["pending", "processing"].includes(status);
                      if (orderFilter === "delivering") return ["ready_for_delivery", "out_for_delivery"].includes(status);
                      if (orderFilter === "completed") return ["delivered", "completed"].includes(status);
                      if (orderFilter === "canceled") return status === "canceled";
                      return true;
                    })}
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
                    onSelectReviewImages={selectReviewImages}
                    onRemoveReviewImage={removeReviewImage}
                    onSubmitReview={submitReview}
                  />
                </div>
              )}
            </main>
          </div>
        )}
        {/* ── DELETE CONFIRMATION DIALOG ───────────────────────────── */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-xl border border-red-100 bg-white p-6 shadow-xl animate-scale-up">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Trash2 className="size-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-slate-950">
                    {t("Xác nhận xóa địa chỉ")}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {t("Bạn có chắc chắn muốn xóa địa chỉ này? Hành động này không thể hoàn tác.")}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-4 border-slate-100 bg-white text-slate-800 hover:bg-slate-50 font-bold"
                  onClick={closeDeleteConfirm}
                  disabled={isDeletingAddress}
                >
                  {t("Hủy")}
                </Button>
                <Button
                  type="button"
                  className="h-9 px-4 bg-red-600 font-bold hover:bg-red-700 text-white"
                  disabled={isDeletingAddress}
                  onClick={handleDeleteAddress}
                >
                  {isDeletingAddress ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    t("Xóa")
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
