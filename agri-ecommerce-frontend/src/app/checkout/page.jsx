"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgePercent,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Leaf,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Tag,
  TicketPercent,
  X,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
} from "@/lib/auth-storage";
import { cartService } from "@/services/cart.service";
import { orderService } from "@/services/order.service";
import { promotionService } from "@/services/promotion.service";
import { shippingAddressService } from "@/services/shipping-address.service";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const blankAddressForm = {
  fullName: "",
  phone: "",
  city: "",
  address: "",
  defaultAddress: true,
};

function getActiveCustomerSession() {
  const session = getAuthSession(AUTH_SCOPES.customer);
  if (!session?.accessToken || isAuthSessionExpired(session)) {
    if (session?.accessToken) clearAuthSession(AUTH_SCOPES.customer);
    return null;
  }
  return session;
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

/** Derive a display label from the coupon code */
function deriveLabel(code = "") {
  const map = {
    SUMMER: "Ưu đãi mùa hè",
    WINTER: "Ưu đãi mùa đông",
    SPRING: "Ưu đãi mùa xuân",
    AUTUMN: "Ưu đãi mùa thu",
    WELCOME: "Chào khách mới",
    LOYAL: "Khách hàng thân thiết",
    MONDAY: "Chào tuần mới",
    WEEKEND: "Flash Sale cuối tuần",
    COMBO: "Combo tiết kiệm",
    FREE: "Giao hàng miễn phí",
    FLASH: "Flash Sale",
  };
  const upper = code.toUpperCase();
  for (const [key, label] of Object.entries(map)) {
    if (upper.includes(key)) return label;
  }
  return "Mã ưu đãi đặc biệt";
}

/* ─── Coupon Autocomplete widget ──────────────────────────────────────────── */
function CouponPicker({ onApply, appliedCoupon, onRemove, subtotal }) {
  const [inputValue, setInputValue] = useState(appliedCoupon?.code ?? "");
  const [allCoupons, setAllCoupons] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  /* Load all available coupons once */
  useEffect(() => {
    promotionService
      .getPublicCoupons({ size: 50 })
      .then((page) => setAllCoupons(page?.content ?? []))
      .catch(() => {});
  }, []);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Sync input when appliedCoupon is removed externally */
  useEffect(() => {
    if (!appliedCoupon) {
      setInputValue("");
      setCouponError("");
      setCouponSuccess("");
    }
  }, [appliedCoupon]);

  /* Filter coupons by input */
  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return allCoupons;
    return allCoupons.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        deriveLabel(c.code).toLowerCase().includes(q)
    );
  }, [inputValue, allCoupons]);

  async function validateAndApply(code) {
    const trimmed = (code || inputValue).trim();
    if (!trimmed) return;

    setDropdownOpen(false);
    setValidating(true);
    setCouponError("");
    setCouponSuccess("");

    try {
      const apiResp = await promotionService.validateCouponCode(trimmed);

      if (!apiResp.success || !apiResp.data) {
        setCouponError(apiResp.message || "Mã giảm giá không hợp lệ.");
        onApply(null);
      } else {
        const coupon = apiResp.data;
        setInputValue(coupon.code);
        setCouponSuccess(
          `Áp dụng thành công! Giảm ${coupon.discountPercentage}% cho đơn hàng.`
        );
        onApply(coupon);
      }
    } catch (err) {
      setCouponError(
        err?.message || "Mã giảm giá không tồn tại hoặc đã hết hạn."
      );
      onApply(null);
    } finally {
      setValidating(false);
    }
  }

  function handleSelect(coupon) {
    setInputValue(coupon.code);
    setDropdownOpen(false);
    validateAndApply(coupon.code);
  }

  function handleRemove() {
    setInputValue("");
    setCouponError("");
    setCouponSuccess("");
    onRemove();
  }

  const hasApplied = !!appliedCoupon;

  return (
    <div className="space-y-2">
      <Label htmlFor="coupon-code">Mã giảm giá</Label>

      <div ref={containerRef} className="relative">
        {/* Input row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <TicketPercent className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-500" />
            <input
              ref={inputRef}
              id="coupon-code"
              type="text"
              value={inputValue}
              disabled={hasApplied}
              placeholder={hasApplied ? "" : "Nhập hoặc chọn mã giảm giá"}
              className="h-10 w-full rounded-[8px] border border-emerald-100 bg-white pl-9 pr-4 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              onChange={(e) => {
                setInputValue(e.target.value);
                setCouponError("");
                setCouponSuccess("");
                setDropdownOpen(true);
              }}
              onFocus={() => !hasApplied && setDropdownOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  validateAndApply();
                }
                if (e.key === "Escape") setDropdownOpen(false);
              }}
            />
          </div>

          {hasApplied ? (
            <button
              type="button"
              onClick={handleRemove}
              title="Bỏ mã giảm giá"
              className="flex h-10 items-center gap-1.5 rounded-[8px] border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-600 transition hover:bg-red-100"
            >
              <X className="size-3.5" />
              Bỏ mã
            </button>
          ) : (
            <button
              type="button"
              disabled={validating || !inputValue.trim()}
              onClick={() => validateAndApply()}
              className="flex h-10 items-center gap-1.5 rounded-[8px] bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {validating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <BadgePercent className="size-3.5" />
              )}
              Áp dụng
            </button>
          )}
        </div>

        {/* Applied coupon badge */}
        {hasApplied && (
          <div className="mt-2 flex items-center gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span className="flex-1 font-mono text-sm font-black tracking-wider text-emerald-800">
              {appliedCoupon.code}
            </span>
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
              -{appliedCoupon.discountPercentage}%
            </span>
          </div>
        )}

        {/* Dropdown */}
        {dropdownOpen && !hasApplied && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[8px] border border-emerald-100 bg-white shadow-[0_16px_42px_rgba(15,61,38,0.12)]">
            {/* Search hint */}
            <div className="flex items-center gap-2 border-b border-emerald-50 px-3 py-2 text-xs font-semibold text-slate-400">
              <Search className="size-3" />
              {filtered.length} voucher khả dụng
            </div>

            <ul className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm font-semibold text-slate-400">
                  Không tìm thấy voucher phù hợp.
                </li>
              ) : (
                filtered.map((coupon) => {
                  const label = deriveLabel(coupon.code);
                  const discountAmt =
                    subtotal > 0
                      ? Math.round(
                          (subtotal * coupon.discountPercentage) / 100
                        )
                      : null;

                  return (
                    <li key={coupon.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(coupon)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-emerald-50"
                      >
                        {/* Icon */}
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-emerald-100 text-emerald-700">
                          <Tag className="size-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-black text-slate-900">
                              {label}
                            </p>
                            <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                              -{coupon.discountPercentage}%
                            </span>
                          </div>

                          <p className="mt-0.5 font-mono text-xs font-bold tracking-widest text-emerald-700">
                            {coupon.code}
                          </p>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-400">
                            {discountAmt != null && discountAmt > 0 && (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <BadgePercent className="size-3" />
                                Giảm {formatCurrency(discountAmt)}
                              </span>
                            )}
                            {coupon.expiresAt && (
                              <span className="flex items-center gap-1">
                                <CalendarClock className="size-3" />
                                HSD: {formatDate(coupon.expiresAt)}
                              </span>
                            )}
                            {coupon.usageLimit != null && (
                              <span>
                                Còn{" "}
                                {coupon.usageLimit - (coupon.timesUsed ?? 0)}{" "}
                                lượt
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Status messages */}
      {couponError && (
        <p className="flex items-center gap-1.5 text-xs font-bold text-red-600">
          <X className="size-3.5" />
          {couponError}
        </p>
      )}
      {couponSuccess && !couponError && (
        <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="size-3.5" />
          {couponSuccess}
        </p>
      )}
    </div>
  );
}

/* ─── Main checkout page ──────────────────────────────────────────────────── */
export default function CheckoutPage() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState("checking");
  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // CouponResponse | null
  const [addressForm, setAddressForm] = useState(blankAddressForm);
  const [preview, setPreview] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const cartItems = cart?.items || [];
  const cartTotal = Number(cart?.totalAmount || 0);
  const cartQuantity = Number(cart?.totalQuantity || 0);
  const fallbackShippingFee = cartItems.length > 0 ? 25000 : 0;
  const selectedAddress = addresses.find(
    (address) => String(address.id) === String(selectedAddressId)
  );

  /* Live discount calculation — from preview if available, else compute locally */
  const summary = useMemo(() => {
    const subtotal = Number(preview?.subtotal ?? cartTotal);
    const shippingFee = Number(preview?.shippingFee ?? fallbackShippingFee);

    let discountAmount = Number(preview?.discountAmount ?? 0);

    // If we have an applied coupon but no preview yet, show a live estimate
    if (!preview && appliedCoupon?.discountPercentage) {
      discountAmount = Math.round(
        (subtotal * appliedCoupon.discountPercentage) / 100
      );
    }

    const totalPrice = subtotal - discountAmount + shippingFee;

    return { subtotal, discountAmount, shippingFee, totalPrice };
  }, [cartTotal, fallbackShippingFee, preview, appliedCoupon]);

  const couponCode = appliedCoupon?.code ?? "";

  const checkoutPayload = useMemo(
    () => ({
      shippingAddressId: selectedAddressId ? Number(selectedAddressId) : null,
      paymentMethod,
      couponCode: couponCode.trim() || undefined,
    }),
    [couponCode, paymentMethod, selectedAddressId]
  );

  /* Load cart + addresses on mount */
  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutData() {
      await Promise.resolve();
      const session = getActiveCustomerSession();

      if (!session) {
        if (!cancelled) {
          setAuthStatus("unauthenticated");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setAuthStatus("authenticated");
        setLoading(true);
        setError("");
        setNotice("");
      }

      try {
        const [cartResponse, addressResponse] = await Promise.all([
          cartService.getCart(),
          shippingAddressService.getAddresses(),
        ]);
        const nextAddresses = Array.isArray(addressResponse)
          ? addressResponse
          : [];
        const defaultAddress =
          nextAddresses.find((a) => a.defaultAddress) || nextAddresses[0];

        if (!cancelled) {
          setCart(cartResponse);
          setAddresses(nextAddresses);
          setSelectedAddressId(
            defaultAddress?.id ? String(defaultAddress.id) : ""
          );
          setPreview(null);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            getErrorMessage(err, "Không thể tải dữ liệu thanh toán của bạn.")
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCheckoutData();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateAddressForm(field, value) {
    setAddressForm((cur) => ({ ...cur, [field]: value }));
  }

  async function handleSaveAddress(event) {
    event.preventDefault();
    setSavingAddress(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        fullName: addressForm.fullName.trim(),
        phone: addressForm.phone.trim(),
        city: addressForm.city.trim(),
        address: addressForm.address.trim(),
        defaultAddress:
          Boolean(addressForm.defaultAddress) || addresses.length === 0,
      };
      const savedAddress =
        await shippingAddressService.createAddress(payload);
      const nextAddresses = await shippingAddressService.getAddresses();

      setAddresses(Array.isArray(nextAddresses) ? nextAddresses : []);
      setSelectedAddressId(String(savedAddress.id));
      setAddressForm(blankAddressForm);
      setPreview(null);
      setNotice("Đã thêm địa chỉ giao hàng.");
    } catch (err) {
      setError(getErrorMessage(err, "Không thể thêm địa chỉ giao hàng."));
    } finally {
      setSavingAddress(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    setError("");
    setNotice("");

    if (!checkoutPayload.shippingAddressId) {
      setError("Vui lòng chọn hoặc thêm địa chỉ giao hàng.");
      setPreviewing(false);
      return null;
    }

    if (cartItems.length === 0) {
      setError("Giỏ hàng đang trống.");
      setPreviewing(false);
      return null;
    }

    try {
      const response = await orderService.previewCheckout(checkoutPayload);
      setPreview(response);

      if (response?.couponMessage && couponCode.trim()) {
        setNotice(response.couponMessage);
      }

      return response;
    } catch (err) {
      setError(getErrorMessage(err, "Không thể kiểm tra đơn hàng."));
      return null;
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmitOrder(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const currentPreview = await handlePreview();

      if (!currentPreview?.canCheckout) {
        setError(
          "Đơn hàng chưa đủ điều kiện thanh toán. Vui lòng kiểm tra lại."
        );
        return;
      }

      const order = await orderService.checkout(checkoutPayload);
      const nextCart = await cartService.getCart();

      setCreatedOrder(order);
      setCart(nextCart);
      setPreview(null);
      setNotice(`Đã tạo đơn hàng #${order.id}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tạo đơn hàng."));
    } finally {
      setSubmitting(false);
    }
  }

  /* ── render ──────────────────────────────────────────────────────────────── */
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
                Thanh toán đơn hàng
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
            >
              <ArrowLeft className="size-4" />
              Tiếp tục mua
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <AdminPageHeader
          title="Thanh toán"
          description="Kiểm tra giỏ hàng, chọn địa chỉ giao hàng, áp mã giảm giá và tạo đơn hàng thật qua backend."
          image="/market-assets/fresh-market-hero.png"
          badges={["Customer API", "Cart", "Checkout"]}
        />

        {authStatus === "unauthenticated" ? (
          <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <ShieldCheck className="size-8" />
            <h2 className="mt-4 text-xl font-black">
              Vui lòng đăng nhập để thanh toán
            </h2>
            <p className="mt-2 text-sm leading-6">
              Checkout dùng giỏ hàng và địa chỉ giao hàng gắn với tài khoản
              khách hàng.
            </p>
            <Link
              href="/profile"
              className="mt-4 inline-flex h-10 items-center rounded-[8px] bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              Đăng nhập khách hàng
            </Link>
          </section>
        ) : loading ? (
          <section className="rounded-[8px] border border-emerald-100 bg-white p-8 text-center shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
            <Loader2 className="mx-auto size-8 animate-spin text-emerald-700" />
            <p className="mt-4 font-black text-emerald-950">
              Đang tải dữ liệu thanh toán...
            </p>
          </section>
        ) : (
          <form
            onSubmit={handleSubmitOrder}
            className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"
          >
            {/* ── LEFT column ─────────────────────────────────────────── */}
            <div className="space-y-5">
              {createdOrder && (
                <section className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                  <CheckCircle2 className="size-8" />
                  <h2 className="mt-3 text-xl font-black">
                    Đã tạo đơn hàng #{createdOrder.id}
                  </h2>
                  <p className="mt-2 text-sm font-semibold">
                    Trạng thái hiện tại: {createdOrder.status}. Admin có thể xử
                    lý đơn này ở batch tiếp theo.
                  </p>
                  <Button
                    type="button"
                    className="mt-4 bg-emerald-600 font-bold hover:bg-emerald-700"
                    onClick={() => router.push("/")}
                  >
                    Tiếp tục mua hàng
                  </Button>
                </section>
              )}

              {/* Cart items */}
              <section className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-700">
                      Giỏ hàng
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-emerald-950">
                      {formatNumber(cartQuantity)} sản phẩm
                    </h2>
                  </div>
                  <ShoppingBasket className="size-8 text-emerald-700" />
                </div>

                {cartItems.length === 0 ? (
                  <div className="mt-5 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Giỏ hàng đang trống. Hãy quay lại trang mua hàng để thêm
                    sản phẩm trước khi checkout.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-3 rounded-[8px] border border-emerald-100 p-3 sm:grid-cols-[72px_1fr_auto]"
                      >
                        <div
                          className="h-20 rounded-[8px] bg-emerald-50 bg-cover bg-center"
                          style={{
                            backgroundImage: item.thumbnail
                              ? `url("${getAssetUrl(item.thumbnail)}")`
                              : "none",
                          }}
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-black text-slate-950">
                            {item.productName}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {formatCurrency(item.productPrice)} /{" "}
                            {item.unit || "sản phẩm"}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-emerald-700">
                            Tồn kho: {formatNumber(item.stock)}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-semibold text-slate-500">
                            SL: {item.quantity}
                          </p>
                          <p className="mt-1 font-black text-emerald-700">
                            {formatCurrency(item.lineTotal)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Shipping address */}
              <section className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-700">
                      Địa chỉ giao hàng
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-emerald-950">
                      Chọn nơi nhận hàng
                    </h2>
                  </div>
                  <MapPin className="size-8 text-emerald-700" />
                </div>

                {addresses.length > 0 ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {addresses.map((address) => {
                      const active =
                        String(address.id) === String(selectedAddressId);
                      return (
                        <label
                          key={address.id}
                          className={`cursor-pointer rounded-[8px] border p-4 transition ${
                            active
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-emerald-100 bg-white hover:border-emerald-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="shippingAddress"
                            value={address.id}
                            checked={active}
                            onChange={(e) => {
                              setSelectedAddressId(e.target.value);
                              setPreview(null);
                            }}
                            className="sr-only"
                          />
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-black text-slate-950">
                              {address.fullName}
                            </p>
                            {address.defaultAddress && (
                              <span className="rounded-[8px] bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-semibold text-slate-600">
                            {address.phone}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {address.address}, {address.city}
                          </p>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Bạn chưa có địa chỉ giao hàng. Thêm địa chỉ bên dưới để
                    tiếp tục checkout.
                  </div>
                )}

                {/* Add address form */}
                <div className="mt-5 rounded-[8px] border border-emerald-100 bg-[#f6faef] p-4">
                  <div className="mb-4 flex items-center gap-2 font-black text-emerald-950">
                    <Plus className="size-4" />
                    Thêm địa chỉ mới
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="address-full-name">Người nhận</Label>
                      <Input
                        id="address-full-name"
                        value={addressForm.fullName}
                        onChange={(e) =>
                          updateAddressForm("fullName", e.target.value)
                        }
                        required={addresses.length === 0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address-phone">Số điện thoại</Label>
                      <Input
                        id="address-phone"
                        value={addressForm.phone}
                        onChange={(e) =>
                          updateAddressForm("phone", e.target.value)
                        }
                        required={addresses.length === 0}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address-city">Tỉnh/thành phố</Label>
                      <Input
                        id="address-city"
                        value={addressForm.city}
                        onChange={(e) =>
                          updateAddressForm("city", e.target.value)
                        }
                        required={addresses.length === 0}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address-detail">Địa chỉ chi tiết</Label>
                      <Textarea
                        id="address-detail"
                        value={addressForm.address}
                        onChange={(e) =>
                          updateAddressForm("address", e.target.value)
                        }
                        rows={3}
                        required={addresses.length === 0}
                      />
                    </div>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={addressForm.defaultAddress}
                      onChange={(e) =>
                        updateAddressForm("defaultAddress", e.target.checked)
                      }
                      className="size-4 rounded border-emerald-200 text-emerald-600"
                    />
                    Đặt làm địa chỉ mặc định
                  </label>
                  <Button
                    type="button"
                    className="mt-4 bg-slate-950 font-bold hover:bg-emerald-700"
                    disabled={savingAddress}
                    onClick={handleSaveAddress}
                  >
                    {savingAddress ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Thêm địa chỉ
                  </Button>
                </div>
              </section>
            </div>

            {/* ── RIGHT column / order summary ─────────────────────────── */}
            <aside className="space-y-5">
              <section className="sticky top-24 rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-700">
                      Tóm tắt thanh toán
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-emerald-950">
                      {formatCurrency(summary.totalPrice)}
                    </h2>
                  </div>
                  <CreditCard className="size-8 text-emerald-700" />
                </div>

                <div className="mt-5 space-y-4">
                  {/* Payment method */}
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">
                      Phương thức thanh toán
                    </Label>
                    <select
                      id="payment-method"
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        setPreview(null);
                      }}
                      className="h-10 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="cash">Thanh toán khi nhận hàng</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>

                  {/* ── COUPON PICKER ───────────────────────────────────── */}
                  <CouponPicker
                    appliedCoupon={appliedCoupon}
                    subtotal={summary.subtotal}
                    onApply={(coupon) => {
                      setAppliedCoupon(coupon);
                      setPreview(null); // reset preview so totals recalculate
                    }}
                    onRemove={() => {
                      setAppliedCoupon(null);
                      setPreview(null);
                    }}
                  />

                  {/* ── ORDER TOTALS ────────────────────────────────────── */}
                  <div className="rounded-[8px] border border-emerald-100 bg-[#f6faef] p-4">
                    <div className="space-y-2 text-sm font-semibold text-slate-600">
                      <div className="flex justify-between">
                        <span>Tạm tính</span>
                        <span>{formatCurrency(summary.subtotal)}</span>
                      </div>

                      {/* Discount row — highlighted only when nonzero */}
                      <div
                        className={`flex justify-between transition-all duration-300 ${
                          summary.discountAmount > 0
                            ? "font-black text-emerald-700"
                            : ""
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {summary.discountAmount > 0 && (
                            <BadgePercent className="size-3.5" />
                          )}
                          Giảm giá
                          {appliedCoupon && summary.discountAmount > 0 && (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                              {appliedCoupon.discountPercentage}%
                            </span>
                          )}
                        </span>
                        <span
                          className={
                            summary.discountAmount > 0 ? "text-emerald-700" : ""
                          }
                        >
                          -{formatCurrency(summary.discountAmount)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span>Phí giao hàng</span>
                        <span>{formatCurrency(summary.shippingFee)}</span>
                      </div>

                      <div className="flex justify-between border-t border-emerald-100 pt-3 text-base font-black text-slate-950">
                        <span>Tổng thanh toán</span>
                        <span
                          className={
                            summary.discountAmount > 0
                              ? "text-emerald-700"
                              : ""
                          }
                        >
                          {formatCurrency(summary.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery address summary */}
                  {selectedAddress && (
                    <div className="rounded-[8px] border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
                      <p className="font-black">Giao đến</p>
                      <p className="mt-1 font-semibold">
                        {selectedAddress.fullName} - {selectedAddress.phone}
                      </p>
                      <p className="mt-1 leading-6">
                        {selectedAddress.address}, {selectedAddress.city}
                      </p>
                    </div>
                  )}

                  {/* Warnings from preview */}
                  {preview?.warnings?.length > 0 && (
                    <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                      {preview.warnings.map((w) => (
                        <p key={w}>{w}</p>
                      ))}
                    </div>
                  )}

                  {notice && (
                    <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                      {notice}
                    </div>
                  )}

                  {error && (
                    <div className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 border-emerald-100 bg-white font-bold text-emerald-800"
                      disabled={
                        previewing || submitting || cartItems.length === 0
                      }
                      onClick={handlePreview}
                    >
                      {previewing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                      Cập nhật tổng
                    </Button>
                    <Button
                      type="submit"
                      className="h-11 bg-emerald-600 font-black hover:bg-emerald-700"
                      disabled={submitting || cartItems.length === 0}
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <PackageCheck className="size-4" />
                      )}
                      Tạo đơn hàng
                    </Button>
                  </div>

                  <p className="text-xs leading-5 text-slate-500">
                    Đơn PayPal hiện được tạo ở trạng thái chờ thanh toán; bước
                    xác nhận PayPal sẽ nối ở batch sau.
                  </p>
                </div>
              </section>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}
