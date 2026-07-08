"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Coins,
  Truck,
  TriangleAlert,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getImageBackground,
} from "@/lib/admin-utils";
import {
  AUTH_SCOPES,
  clearAuthSession,
  getAuthSession,
  isAuthSessionExpired,
} from "@/lib/auth-storage";
import {
  PHONE_PATTERN_SOURCE,
  isValidPhoneNumber,
} from "@/lib/phone-utils";
import { cartService } from "@/services/cart.service";
import { orderService } from "@/services/order.service";
import { promotionService } from "@/services/promotion.service";
import { shippingAddressService } from "@/services/shipping-address.service";
import { profileService } from "@/services/profile.service";
import vietnamAddresses from "@/data/vietnam-addresses.json";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const VIETNAM_PROVINCES = vietnamAddresses;

function createBlankAddressForm(defaultAddress = false) {
  return {
    fullName: "",
    phone: "",
    provinceCode: "",
    provinceName: "",
    districtCode: "",
    districtName: "",
    wardCode: "",
    wardName: "",
    address: "",
    defaultAddress,
  };
}

function getProvinceLabel(province) {
  return province.name.replace(/^(Tỉnh|Thành phố)\s+/i, "");
}

function findAddressOption(options = [], code) {
  return options.find((option) => String(option.code) === String(code));
}

function normalizeAddressName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/^(tinh|thanh pho|quan|huyen|thi xa|phuong|xa|thi tran)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findAddressByName(options = [], name, getLabel = (option) => option.name) {
  const normalizedName = normalizeAddressName(name);
  if (!normalizedName) return null;

  return (
    options.find((option) => normalizeAddressName(option.name) === normalizedName) ||
    options.find((option) => normalizeAddressName(getLabel(option)) === normalizedName) ||
    null
  );
}

function parseSavedAddress(address = "") {
  const parts = String(address)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 3) {
    return {
      address: address || "",
      wardName: "",
      districtName: "",
    };
  }

  return {
    address: parts.slice(0, -2).join(", "),
    wardName: parts.at(-2) || "",
    districtName: parts.at(-1) || "",
  };
}

function buildDetailedAddress(form) {
  return [form.address.trim(), form.wardName, form.districtName]
    .filter(Boolean)
    .join(", ");
}

const PHONE_REGEX = /^0\d{9}$/;
const PHONE_ERROR_MESSAGE =
  "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.";

function getPhoneError(phone) {
  if (!phone) return "Vui lòng nhập số điện thoại.";
  return PHONE_REGEX.test(phone) ? "" : PHONE_ERROR_MESSAGE;
}

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
    BRONZE5: "Đặc quyền thành viên Đồng",
    SILVER10: "Đặc quyền thành viên Bạc",
    GOLD25: "Đặc quyền thành viên Vàng",
    PLATINUM50: "Đặc quyền thành viên Kim cương",
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
    TUOI_NGON: "Ưu đãi tươi ngon",
    BEP_NHA: "Ưu đãi bếp nhà",
    MON_NGON: "Ưu đãi món ngon",
  };
  const upper = code.toUpperCase();
  for (const [key, label] of Object.entries(map)) {
    if (upper.includes(key)) return label;
  }
  return "Mã ưu đãi đặc biệt";
}

function isFreeshipCoupon(coupon) {
  return (
    coupon?.couponType === "FREESHIP" ||
    String(coupon?.code || "").trim().toUpperCase() === "FREESHIP"
  );
}

function getCouponBadgeText(coupon) {
  if (isFreeshipCoupon(coupon)) {
    return "Freeship";
  }

  if (coupon?.discountType === "FIXED_AMOUNT") {
    return `-${formatCurrency(coupon.discountAmount || 0)}`;
  }

  return `-${coupon?.discountPercentage || 0}%`;
}

function getCouponStackKey(coupon) {
  const type = coupon?.couponType || "ORDER_DISCOUNT";

  if (type === "PRODUCT_DISCOUNT") {
    return `${type}:${coupon?.productId || coupon?.code || coupon?.id}`;
  }

  return type;
}

function getCouponSuccessMessage(coupon) {
  if (isFreeshipCoupon(coupon)) {
    return "Áp dụng thành công! Miễn phí vận chuyển cho đơn hàng.";
  }

  if (coupon?.discountType === "FIXED_AMOUNT") {
    return `Áp dụng thành công! Giảm ${formatCurrency(
      coupon.discountAmount || 0
    )} cho đơn hàng.`;
  }

  return `Áp dụng thành công! Giảm ${coupon?.discountPercentage || 0}% cho đơn hàng.`;
}

function getEstimatedDiscountAmount(coupon, subtotal) {
  if (!coupon || isFreeshipCoupon(coupon)) {
    return 0;
  }

  if (coupon.discountType === "FIXED_AMOUNT") {
    return Math.min(Number(coupon.discountAmount || 0), subtotal);
  }

  return Math.round((subtotal * Number(coupon.discountPercentage || 0)) / 100);
}

function checkCouponTierAllowed(couponCode = "", userTier = "BRONZE") {
  const code = couponCode.trim().toUpperCase();
  const tier = (userTier || "BRONZE").trim().toUpperCase();

  if (code === "SILVER10") {
    return ["SILVER", "GOLD", "PLATINUM"].includes(tier);
  }
  if (code === "GOLD25") {
    return ["GOLD", "PLATINUM"].includes(tier);
  }
  if (code === "PLATINUM50" || code === "PLATINUM10") {
    return ["PLATINUM"].includes(tier);
  }
  if (code === "GOLD5") {
    return ["GOLD", "PLATINUM"].includes(tier);
  }
  return true;
}

/* ─── Coupon Autocomplete widget ──────────────────────────────────────────── */
function CouponPicker({ onApply, appliedCoupons = [], subtotal, membershipTier, cartItems = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [allCoupons, setAllCoupons] = useState([]);
  const [selectedCoupons, setSelectedCoupons] = useState([]);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");
  const [validating, setValidating] = useState(false);

  /* Load all available coupons once */
  useEffect(() => {
    promotionService
      .getPublicCoupons({ size: 50 })
      .then((page) => setAllCoupons(page?.content ?? []))
      .catch(() => {});
  }, []);

  // Khi mở dialog, clone appliedCoupons sang selectedCoupons
  function openCouponPicker() {
    setSelectedCoupons([...appliedCoupons]);
    setManualCode("");
    setManualError("");
    setManualSuccess("");
    setIsOpen(true);
  }

  function handleCouponPickerOpenChange(nextOpen) {
    if (nextOpen) {
      openCouponPicker();
      return;
    }

    setIsOpen(false);
  }

  // Phân loại các coupon có trong hệ thống
  const { freeshipCoupons, orderCoupons, productCoupons } = useMemo(() => {
    const freeship = [];
    const order = [];
    const product = [];

    allCoupons.forEach((c) => {
      const type = c.couponType || "ORDER_DISCOUNT";
      if (type === "FREESHIP" || isFreeshipCoupon(c)) {
        freeship.push(c);
      } else if (type === "PRODUCT_DISCOUNT") {
        product.push(c);
      } else {
        order.push(c);
      }
    });

    return { freeshipCoupons: freeship, orderCoupons: order, productCoupons: product };
  }, [allCoupons]);

  // Kiểm tra trạng thái hợp lệ và lý do vô hiệu hóa của coupon
  function getCouponStatusInfo(coupon) {
    // 1. Kiểm tra hạng thành viên
    if (!checkCouponTierAllowed(coupon.code, membershipTier)) {
      const required = coupon.code.startsWith("SILVER") ? "Bạc" : coupon.code.startsWith("GOLD") ? "Vàng" : "Kim Cương";
      return { disabled: true, reason: `Yêu cầu hạng: ${required} trở lên` };
    }
    // 2. Kiểm tra giá trị đơn tối thiểu
    if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) {
      return { disabled: true, reason: `Chưa đạt đơn tối thiểu ${formatNumber(coupon.minOrderValue)}đ` };
    }
    // 3. Kiểm tra sản phẩm trong giỏ hàng (với PRODUCT_DISCOUNT)
    if (coupon.couponType === "PRODUCT_DISCOUNT" && coupon.productId != null) {
      const hasProduct = cartItems.some(item => Number(item.product?.id) === Number(coupon.productId));
      if (!hasProduct) {
        return { disabled: true, reason: "Giỏ hàng không chứa sản phẩm áp dụng mã" };
      }
    }
    return { disabled: false, reason: null };
  }

  // Toggle tick chọn coupon
  function handleToggleCoupon(coupon) {
    const info = getCouponStatusInfo(coupon);
    if (info.disabled) return;

    const isSelected = selectedCoupons.some(c => c.id === coupon.id);
    if (isSelected) {
      // Bỏ chọn
      setSelectedCoupons(selectedCoupons.filter(c => c.id !== coupon.id));
    } else {
      // Chọn mã mới: Lọc bỏ các mã cùng loại/slot rồi push mã mới
      const newKey = getCouponStackKey(coupon);
      let next = selectedCoupons.filter(c => getCouponStackKey(c) !== newKey);
      next.push(coupon);
      setSelectedCoupons(next);
    }
  }

  // Nhập mã thủ công và tự động tick chọn
  async function handleApplyManual() {
    const code = manualCode.trim();
    if (!code) return;

    setValidating(true);
    setManualError("");
    setManualSuccess("");

    try {
      const apiResp = await promotionService.validateCouponCode(code);
      if (!apiResp.success || !apiResp.data) {
        setManualError(apiResp.message || "Mã giảm giá không hợp lệ.");
      } else {
        const coupon = apiResp.data;
        const info = getCouponStatusInfo(coupon);
        if (info.disabled) {
          setManualError(`Không thể áp dụng: ${info.reason}`);
          return;
        }

        // Tự động add vào danh sách allCoupons nếu chưa có để hiển thị
        if (!allCoupons.some(c => c.id === coupon.id)) {
          setAllCoupons(prev => [coupon, ...prev]);
        }

        // Tick chọn
        const newKey = getCouponStackKey(coupon);
        const next = selectedCoupons.filter(c => getCouponStackKey(c) !== newKey);
        next.push(coupon);
        setSelectedCoupons(next);

        setManualCode("");
        setManualSuccess(`Đã áp dụng mã ${coupon.code} thành công.`);
      }
    } catch (err) {
      setManualError(err?.message || "Mã giảm giá không hợp lệ hoặc đã hết hạn.");
    } finally {
      setValidating(false);
    }
  }

  function handleConfirm() {
    onApply(selectedCoupons);
    setIsOpen(false);
  }

  function handleRemoveCoupon(couponToRemove) {
    const nextCoupons = appliedCoupons.filter(c => c.id !== couponToRemove.id);
    onApply(nextCoupons);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-black text-slate-800">Mã giảm giá</Label>
        <button
          type="button"
          onClick={openCouponPicker}
          className="text-xs font-black text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1.5"
        >
          <TicketPercent className="size-4" />
          Chọn hoặc nhập mã
        </button>
      </div>

      {/* Applied coupons badges list */}
      {appliedCoupons.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {appliedCoupons.map((coupon) => (
            <div
              key={coupon.id}
              className="flex items-center gap-1.5 rounded-[8px] border border-emerald-200 bg-emerald-50 pl-2.5 pr-1.5 py-1.5 shadow-sm"
            >
              <div className="flex flex-col">
                <span className="font-mono text-xs font-black text-emerald-800 tracking-wider">
                  {coupon.code}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                  {coupon.couponType === "FREESHIP" ? "Miễn phí vận chuyển" :
                    coupon.couponType === "PRODUCT_DISCOUNT" ? "Giảm giá sản phẩm" : "Giảm giá đơn hàng"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveCoupon(coupon)}
                title={`Gỡ mã ${coupon.code}`}
                className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-emerald-100 hover:text-emerald-800 transition"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div
          onClick={openCouponPicker}
          className="cursor-pointer border border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/20 rounded-[8px] p-3 text-center transition-all"
        >
          <p className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5">
            <TicketPercent className="size-4 text-emerald-500" />
            Nhấn vào đây để chọn mã giảm giá & freeship!
          </p>
        </div>
      )}

      {/* Coupon Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={handleCouponPickerOpenChange}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-slate-50">
          <div className="p-5 bg-white border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <TicketPercent className="size-5 text-emerald-500" />
                AgriMarket Voucher
              </DialogTitle>
            </DialogHeader>

            {/* Manual input code */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={manualCode}
                placeholder="Nhập mã giảm giá..."
                className="h-10 flex-1 rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setManualError("");
                  setManualSuccess("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyManual();
                  }
                }}
              />
              <button
                type="button"
                disabled={validating || !manualCode.trim()}
                onClick={handleApplyManual}
                className="h-10 px-4 rounded-[8px] bg-slate-950 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {validating ? <Loader2 className="size-3.5 animate-spin" /> : "Áp dụng"}
              </button>
            </div>
            {manualError && (
              <p className="mt-1.5 text-xs font-bold text-rose-600 flex items-center gap-1">
                <TriangleAlert className="size-3.5" />
                {manualError}
              </p>
            )}
            {manualSuccess && (
              <p className="mt-1.5 text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="size-3.5" />
                {manualSuccess}
              </p>
            )}
          </div>

          {/* Voucher list wrapper */}
          <div className="max-h-[350px] overflow-y-auto p-5 space-y-5">
            {/* Freeship Section */}
            {freeshipCoupons.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Mã vận chuyển (Chọn tối đa 1)</p>
                <div className="grid gap-2.5">
                  {freeshipCoupons.map((coupon) => {
                    const status = getCouponStatusInfo(coupon);
                    const isSelected = selectedCoupons.some(c => c.id === coupon.id);
                    return (
                      <CouponCard
                        key={coupon.id}
                        coupon={coupon}
                        isSelected={isSelected}
                        disabled={status.disabled}
                        disabledReason={status.reason}
                        onToggle={() => handleToggleCoupon(coupon)}
                        icon={<Truck className="size-5" />}
                        themeColor="bg-sky-500"
                        subtotal={subtotal}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order discount Section */}
            {orderCoupons.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Mã đơn hàng & VIP (Chọn tối đa 1)</p>
                <div className="grid gap-2.5">
                  {orderCoupons.map((coupon) => {
                    const status = getCouponStatusInfo(coupon);
                    const isSelected = selectedCoupons.some(c => c.id === coupon.id);
                    return (
                      <CouponCard
                        key={coupon.id}
                        coupon={coupon}
                        isSelected={isSelected}
                        disabled={status.disabled}
                        disabledReason={status.reason}
                        onToggle={() => handleToggleCoupon(coupon)}
                        icon={<TicketPercent className="size-5" />}
                        themeColor="bg-amber-500"
                        subtotal={subtotal}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product discount Section */}
            {productCoupons.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Mã sản phẩm (Chọn chồng nhiều mã khác sản phẩm)</p>
                <div className="grid gap-2.5">
                  {productCoupons.map((coupon) => {
                    const status = getCouponStatusInfo(coupon);
                    const isSelected = selectedCoupons.some(c => c.id === coupon.id);
                    return (
                      <CouponCard
                        key={coupon.id}
                        coupon={coupon}
                        isSelected={isSelected}
                        disabled={status.disabled}
                        disabledReason={status.reason}
                        onToggle={() => handleToggleCoupon(coupon)}
                        icon={<Tag className="size-5" />}
                        themeColor="bg-emerald-500"
                        subtotal={subtotal}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {allCoupons.length === 0 && (
              <div className="text-center py-6">
                <TicketPercent className="size-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-400 mt-2">Hiện tại không có voucher nào khả dụng.</p>
              </div>
            )}
          </div>

          {/* Footer controls */}
          <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              Đã chọn <span className="text-emerald-600 font-black">{selectedCoupons.length}</span> mã
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-9 px-4 rounded-[8px] border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition"
              >
                Trở lại
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="h-9 px-5 rounded-[8px] bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Thẻ card render voucher cực kỳ đẹp mắt
function CouponCard({ coupon, isSelected, disabled, disabledReason, onToggle, icon, themeColor, subtotal }) {
  const label = deriveLabel(coupon.code);
  const discountAmt = subtotal > 0 ? getEstimatedDiscountAmount(coupon, subtotal) : 0;

  return (
    <div
      onClick={() => !disabled && onToggle()}
      className={`relative flex rounded-[12px] border bg-white overflow-hidden min-h-[90px] shadow-sm select-none transition-all duration-200 ${
        disabled
          ? "opacity-50 cursor-not-allowed border-slate-100 bg-slate-50"
          : isSelected
          ? "border-emerald-500 ring-2 ring-emerald-500/10 cursor-pointer"
          : "border-slate-100 hover:border-slate-200 cursor-pointer"
      }`}
    >
      {/* Left side ticket style */}
      <div className={`w-20 shrink-0 flex flex-col items-center justify-center text-white ${disabled ? "bg-slate-400" : themeColor} px-2`}>
        {icon}
        <span className="text-[10px] font-black tracking-widest mt-1 uppercase">{coupon.couponType === "FREESHIP" ? "Ship" : "Save"}</span>
      </div>

      {/* Ticket circle hole effect */}
      <div className="absolute left-[76px] top-1/2 -translate-y-1/2 flex flex-col justify-between h-5 w-2 z-10">
        <div className="w-2 h-2.5 rounded-r-full bg-slate-50 border-r border-t border-b border-slate-100"></div>
        <div className="w-2 h-2.5 rounded-r-full bg-slate-50 border-r border-t border-b border-slate-100"></div>
      </div>

      {/* Right Content */}
      <div className="flex-1 p-3 pl-5 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-black text-slate-800 truncate">{label}</h4>
            <input
              type="checkbox"
              checked={isSelected}
              disabled={disabled}
              onChange={() => {}} // Div handle click
              className="size-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
          </div>
          <p className="font-mono text-xs font-black text-emerald-600 mt-0.5 tracking-wider uppercase">{coupon.code}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400">
          {disabledReason ? (
            <span className="text-rose-500 flex items-center gap-1 font-black">
              <TriangleAlert className="size-3" />
              {disabledReason}
            </span>
          ) : (
            <>
              {coupon.minOrderValue > 0 ? (
                <span>Đơn tối thiểu {formatNumber(coupon.minOrderValue)}đ</span>
              ) : (
                <span>Mọi giá trị đơn hàng</span>
              )}
              {discountAmt > 0 && (
                <span className="text-emerald-700 font-black">Giảm ~{formatNumber(discountAmt)}đ</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main checkout page ──────────────────────────────────────────────────── */
export default function CheckoutPage() {
  const router = useRouter();
  const phoneInputRef = useRef(null);
  const previewRequestSeqRef = useRef(0);
  const [authStatus, setAuthStatus] = useState("checking");
  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressBookVersion, setAddressBookVersion] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [appliedCoupons, setAppliedCoupons] = useState([]); // CouponResponse[]
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [membershipTier, setMembershipTier] = useState("BRONZE");
  const [usePoints, setUsePoints] = useState(false);
  const [addressForm, setAddressForm] = useState(() =>
    createBlankAddressForm()
  );
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [preview, setPreview] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editAddressForm, setEditAddressForm] = useState(() =>
    createBlankAddressForm()
  );
  const [editPhoneError, setEditPhoneError] = useState("");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);

  const cartItems = cart?.items || [];
  const cartTotal = Number(cart?.totalAmount || 0);
  const cartQuantity = Number(cart?.totalQuantity || 0);
  const previewShippingAddress = preview?.shippingAddress || null;

  const selectedProvinceForForm = useMemo(
    () => findAddressOption(VIETNAM_PROVINCES, addressForm.provinceCode),
    [addressForm.provinceCode]
  );
  const selectedDistrictForForm = useMemo(
    () =>
      findAddressOption(
        selectedProvinceForForm?.districts,
        addressForm.districtCode
      ),
    [addressForm.districtCode, selectedProvinceForForm]
  );
  const districtOptions = selectedProvinceForForm?.districts ?? [];
  const wardOptions = selectedDistrictForForm?.wards ?? [];
  const selectedProvinceForEditForm = useMemo(
    () => findAddressOption(VIETNAM_PROVINCES, editAddressForm.provinceCode),
    [editAddressForm.provinceCode]
  );
  const editDistrictOptions = useMemo(
    () => selectedProvinceForEditForm?.districts ?? [],
    [selectedProvinceForEditForm]
  );
  const selectedDistrictForEditForm = useMemo(
    () =>
      findAddressOption(
        editDistrictOptions,
        editAddressForm.districtCode
      ),
    [editAddressForm.districtCode, editDistrictOptions]
  );
  const editWardOptions = useMemo(
    () => selectedDistrictForEditForm?.wards ?? [],
    [selectedDistrictForEditForm]
  );

  /* Totals are server-authoritative; before preview returns, only cart subtotal is known. */
  const summary = useMemo(() => {
    const subtotal = Number(preview?.subtotal ?? cartTotal);
    const discountAmount = Number(preview?.discountAmount ?? 0);
    const couponDiscountAmount = Number(
      preview?.couponDiscountAmount ?? discountAmount
    );
    const pointsDiscount = Number(preview?.pointsDiscount ?? 0);
    const pointsUsed = Number(preview?.pointsUsed ?? 0);
    const shippingFee = Number(preview?.shippingFee ?? 0);
    const totalPrice = Number(
      preview?.totalPrice ?? subtotal - discountAmount + shippingFee
    );

    return {
      subtotal,
      discountAmount,
      couponDiscountAmount,
      pointsDiscount,
      pointsUsed,
      shippingFee,
      totalPrice,
    };
  }, [cartTotal, preview]);

  const couponCode = appliedCoupons.map((c) => c.code).join(",");

  const checkoutPayload = useMemo(
    () => ({
      shippingAddressId: selectedAddressId ? Number(selectedAddressId) : null,
      paymentMethod,
      couponCode: couponCode.trim() || undefined,
      usePoints,
    }),
    [couponCode, paymentMethod, selectedAddressId, usePoints]
  );
  const checkoutQuoteReady =
    Boolean(preview) &&
    String(previewShippingAddress?.id || "") ===
    String(checkoutPayload.shippingAddressId || "");
  const hasServerDiscount = checkoutQuoteReady && summary.discountAmount > 0;
  const hasServerFreeShipping =
    checkoutQuoteReady && cartItems.length > 0 && summary.shippingFee === 0;
  const pendingAmountLabel = previewing ? "Đang tính..." : "Đang tính toán...";
  const totalAmountLabel = checkoutQuoteReady
    ? formatCurrency(summary.totalPrice)
    : pendingAmountLabel;

  const requestCheckoutPreview = useCallback(
    async ({ showErrors = true, clearMessages = false } = {}) => {
      if (!checkoutPayload.shippingAddressId) {
        setPreview(null);
        if (showErrors) {
          setError("Vui lòng chọn hoặc thêm địa chỉ giao hàng.");
        }
        return null;
      }

      if (cartItems.length === 0) {
        setPreview(null);
        if (showErrors) {
          setError("Giỏ hàng đang trống.");
        }
        return null;
      }

      const requestSeq = previewRequestSeqRef.current + 1;
      previewRequestSeqRef.current = requestSeq;

      setPreviewing(true);
      if (clearMessages) {
        setError("");
        setNotice("");
      }

      try {
        const response = await orderService.previewCheckout(checkoutPayload);

        if (previewRequestSeqRef.current !== requestSeq) {
          return null;
        }

        setPreview(response);
        setError("");

        if (response?.couponMessage && couponCode.trim()) {
          setNotice(response.couponMessage);
        }

        return response;
      } catch (err) {
        if (previewRequestSeqRef.current === requestSeq) {
          setPreview(null);
          if (showErrors) {
            setError(getErrorMessage(err, "Không thể kiểm tra đơn hàng."));
          }
        }
        return null;
      } finally {
        if (previewRequestSeqRef.current === requestSeq) {
          setPreviewing(false);
        }
      }
    },
    [cartItems.length, checkoutPayload, couponCode]
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
        const [cartResponse, addressResponse, profileResponse] = await Promise.all([
          cartService.getCart(),
          shippingAddressService.getAddresses(),
          profileService.getProfile(),
        ]);
        const nextAddresses = Array.isArray(addressResponse)
          ? addressResponse
          : [];
        const defaultAddress =
          nextAddresses.find((a) => a.defaultAddress) || nextAddresses[0];
        const profileData = profileResponse?.data ?? profileResponse;

        if (!cancelled) {
          setCart(cartResponse);
          setAddresses(nextAddresses);
          setSelectedAddressId(
            defaultAddress?.id ? String(defaultAddress.id) : ""
          );
          setLoyaltyPoints(profileData?.loyaltyPoints || 0);
          setMembershipTier(profileData?.membershipTier || "BRONZE");
          setShowAddressForm(nextAddresses.length === 0);
          setAddressForm(createBlankAddressForm());
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

  useEffect(() => {
    if (
      authStatus !== "authenticated" ||
      loading ||
      !checkoutPayload.shippingAddressId ||
      cartItems.length === 0
    ) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      requestCheckoutPreview({ showErrors: true });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [
    addressBookVersion,
    authStatus,
    cartItems.length,
    checkoutPayload,
    loading,
    requestCheckoutPreview,
  ]);


  function updateAddressForm(field, value) {
    setAddressForm((cur) => ({ ...cur, [field]: value }));
  }

  function handlePhoneChange(value) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    updateAddressForm("phone", digitsOnly);
    setPhoneError(digitsOnly ? getPhoneError(digitsOnly) : "");
  }

  function validateAddress() {
    const nextPhoneError = getPhoneError(addressForm.phone.trim());
    setPhoneError(nextPhoneError);

    if (nextPhoneError) {
      phoneInputRef.current?.focus();
      return false;
    }

    return true;
  }

  function handleProvinceChange(code) {
    const province = findAddressOption(VIETNAM_PROVINCES, code);
    setAddressForm((cur) => ({
      ...cur,
      provinceCode: code,
      provinceName: province ? getProvinceLabel(province) : "",
      districtCode: "",
      districtName: "",
      wardCode: "",
      wardName: "",
    }));
  }

  function handleDistrictChange(code) {
    const district = findAddressOption(selectedProvinceForForm?.districts, code);
    setAddressForm((cur) => ({
      ...cur,
      districtCode: code,
      districtName: district?.name ?? "",
      wardCode: "",
      wardName: "",
    }));
  }

  function handleWardChange(code) {
    const ward = findAddressOption(selectedDistrictForForm?.wards, code);
    setAddressForm((cur) => ({
      ...cur,
      wardCode: code,
      wardName: ward?.name ?? "",
    }));
  }

  function openAddressForm() {
    setPhoneError("");
    setAddressForm(createBlankAddressForm());
    setShowAddressForm(true);
  }

  function closeAddressForm() {
    if (addresses.length === 0) return;
    setPhoneError("");
    setAddressForm(createBlankAddressForm(false));
    setShowAddressForm(false);
  }

  async function handleSaveAddress(event) {
    event.preventDefault();
    if (!validateAddress()) return;

    setSavingAddress(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        fullName: addressForm.fullName.trim(),
        phone: addressForm.phone.trim(),
        city: addressForm.provinceName.trim(),
        address: buildDetailedAddress(addressForm),
        defaultAddress: Boolean(addressForm.defaultAddress),
      };
      if (
        !payload.fullName ||
        !payload.phone ||
        !payload.city ||
        !addressForm.districtCode ||
        !addressForm.wardCode ||
        !payload.address
      ) {
        throw new Error("Vui lòng nhập đầy đủ thông tin địa chỉ giao hàng.");
      }
      if (!isValidPhoneNumber(payload.phone, { required: true })) {
        throw new Error(PHONE_ERROR_MESSAGE);
      }

      const savedAddress =
        await shippingAddressService.createAddress(payload);
      const nextAddresses = await shippingAddressService.getAddresses();
      const normalizedAddresses = Array.isArray(nextAddresses)
        ? nextAddresses
        : [];

      setAddresses(normalizedAddresses);
      setAddressBookVersion((version) => version + 1);
      setSelectedAddressId(
        String(savedAddress?.id ?? normalizedAddresses[0]?.id ?? "")
      );
      setPhoneError("");
      setAddressForm(createBlankAddressForm(false));
      setShowAddressForm(false);
      setPreview(null);
      setNotice("Đã thêm địa chỉ giao hàng.");
    } catch (err) {
      setError(getErrorMessage(err, "Không thể thêm địa chỉ giao hàng."));
    } finally {
      setSavingAddress(false);
    }
  }

  function openEditDialog(address) {
    const savedAddress = parseSavedAddress(address.address);
    const province = findAddressByName(
      VIETNAM_PROVINCES,
      address.city,
      getProvinceLabel
    );
    const district = findAddressByName(
      province?.districts,
      savedAddress.districtName
    );
    const ward = findAddressByName(district?.wards, savedAddress.wardName);

    setEditingAddressId(address.id);
    setEditAddressForm({
      fullName: address.fullName || "",
      phone: address.phone || "",
      provinceCode: province ? String(province.code) : "",
      provinceName: province ? getProvinceLabel(province) : address.city || "",
      districtCode: district ? String(district.code) : "",
      districtName: district?.name ?? savedAddress.districtName,
      wardCode: ward ? String(ward.code) : "",
      wardName: ward?.name ?? savedAddress.wardName,
      address: savedAddress.address,
      defaultAddress: address.defaultAddress || false,
    });
    setEditPhoneError("");
    setIsEditDialogOpen(true);
  }

  function closeEditDialog() {
    setIsEditDialogOpen(false);
    setEditingAddressId(null);
    setEditAddressForm(createBlankAddressForm());
    setEditPhoneError("");
  }

  function handleEditPhoneChange(value) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setEditAddressForm((cur) => ({
      ...cur,
      phone: digitsOnly,
    }));
    setEditPhoneError(digitsOnly ? getPhoneError(digitsOnly) : "");
  }

  function validateEditAddress() {
    const nextPhoneError = getPhoneError(editAddressForm.phone.trim());
    setEditPhoneError(nextPhoneError);

    if (nextPhoneError) {
      return false;
    }

    return true;
  }

  async function handleUpdateAddress(event) {
    event.preventDefault();
    if (!validateEditAddress()) return;

    setIsEditingAddress(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        fullName: editAddressForm.fullName.trim(),
        phone: editAddressForm.phone.trim(),
        city: editAddressForm.provinceName.trim(),
        address: buildDetailedAddress(editAddressForm),
        defaultAddress: Boolean(editAddressForm.defaultAddress),
      };

      if (
        !payload.fullName ||
        !payload.phone ||
        !payload.city ||
        !editAddressForm.districtCode ||
        !editAddressForm.wardCode ||
        !payload.address
      ) {
        throw new Error("Vui lòng nhập đầy đủ thông tin địa chỉ giao hàng.");
      }

      await shippingAddressService.updateAddress(editingAddressId, payload);
      const nextAddresses = await shippingAddressService.getAddresses();
      const normalizedAddresses = Array.isArray(nextAddresses)
        ? nextAddresses
        : [];

      setAddresses(normalizedAddresses);
      setAddressBookVersion((version) => version + 1);
      setNotice("Cập nhật địa chỉ thành công!");
      closeEditDialog();
      setPreview(null);
    } catch (err) {
      const errorMsg = err.response?.data?.message || getErrorMessage(err, "Không thể cập nhật địa chỉ.");
      setError(errorMsg);
    } finally {
      setIsEditingAddress(false);
    }
  }

  function openDeleteConfirm(addressId) {
    setDeletingAddressId(addressId);
    setIsDeleteConfirmOpen(true);
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
      await shippingAddressService.deleteAddress(deletingAddressId);
      const nextAddresses = await shippingAddressService.getAddresses();
      const normalizedAddresses = Array.isArray(nextAddresses)
        ? nextAddresses
        : [];

      setAddresses(normalizedAddresses);
      setAddressBookVersion((version) => version + 1);

      // If deleted address was selected, select another address
      if (String(deletingAddressId) === String(selectedAddressId)) {
        if (normalizedAddresses.length > 0) {
          const defaultAddress = normalizedAddresses.find((a) => a.defaultAddress);
          setSelectedAddressId(
            String(defaultAddress?.id ?? normalizedAddresses[0]?.id ?? "")
          );
        } else {
          setSelectedAddressId("");
        }
      }

      setNotice("Xóa địa chỉ thành công!");
      closeDeleteConfirm();
      setPreview(null);
    } catch (err) {
      const errorMsg = err.response?.data?.message || getErrorMessage(err, "Không thể xóa địa chỉ.");
      setError(errorMsg);
    } finally {
      setIsDeletingAddress(false);
    }
  }

  function updateEditAddressForm(key, value) {
    setEditAddressForm((cur) => ({
      ...cur,
      [key]: value,
    }));
  }

  function handleEditProvinceChange(code) {
    const province = findAddressOption(VIETNAM_PROVINCES, code);
    setEditAddressForm((cur) => ({
      ...cur,
      provinceCode: code,
      provinceName: province ? getProvinceLabel(province) : "",
      districtCode: "",
      districtName: "",
      wardCode: "",
      wardName: "",
    }));
  }

  function handleEditDistrictChange(code) {
    const district = findAddressOption(editDistrictOptions, code);
    setEditAddressForm((cur) => ({
      ...cur,
      districtCode: code,
      districtName: district?.name ?? "",
      wardCode: "",
      wardName: "",
    }));
  }

  function handleEditWardChange(code) {
    const ward = findAddressOption(editWardOptions, code);
    setEditAddressForm((cur) => ({
      ...cur,
      wardCode: code,
      wardName: ward?.name ?? "",
    }));
  }

  async function handlePreview() {
    return requestCheckoutPreview({ showErrors: true, clearMessages: true });
  }

  async function handleSubmitOrder(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const currentPreview = await handlePreview();

      if (!currentPreview) {
        return;
      }

      if (
        String(currentPreview.shippingAddress?.id || "") !==
        String(checkoutPayload.shippingAddressId || "")
      ) {
        setError("Địa chỉ nhận hàng chưa được đồng bộ từ API. Vui lòng thử lại.");
        return;
      }

      if (!currentPreview.canCheckout) {
        setError(
          "Đơn hàng chưa đủ điều kiện thanh toán. Vui lòng kiểm tra lại."
        );
        return;
      }

      const order = await orderService.checkout(checkoutPayload);

      setCreatedOrder(order);
      setPreview(null);

      if (paymentMethod === "vnpay") {
        setNotice(`Đã tạo đơn hàng ${order.trackingNumber || '#' + order.id}. Đang chuyển sang VNPay...`);
        const payment = await orderService.createVnpayPaymentUrl(order.id);
        window.location.assign(payment.paymentUrl);
        return;
      }

      const nextCart = await cartService.getCart();
      setCart(nextCart);
      setNotice(`Đã tạo đơn hàng ${order.trackingNumber || '#' + order.id}.`);
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
                    Đã tạo đơn hàng {createdOrder.trackingNumber || '#' + createdOrder.id}
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
                            backgroundImage: getImageBackground(item.thumbnail),
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
                          className={`cursor-pointer rounded-[8px] border p-4 transition ${active
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
                            <div className="flex-1">
                              <p className="font-black text-slate-950">
                                {address.fullName}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {address.defaultAddress && (
                                <span className="rounded-[8px] bg-emerald-600 px-2 py-1 text-xs font-bold text-white whitespace-nowrap">
                                  Mặc định
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openEditDialog(address);
                                }}
                                className="inline-flex items-center justify-center rounded-[6px] p-1.5 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
                                title="Chỉnh sửa"
                              >
                                <svg
                                  className="size-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openDeleteConfirm(address.id);
                                }}
                                className="inline-flex items-center justify-center rounded-[6px] p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-700 transition"
                                title="Xóa"
                              >
                                <svg
                                  className="size-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
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

                {addresses.length > 0 && !showAddressForm && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 h-11 border-emerald-200 bg-white font-bold text-emerald-800 hover:bg-emerald-50"
                    onClick={openAddressForm}
                  >
                    <Plus className="size-4" />
                    Thêm địa chỉ mới
                  </Button>
                )}

                {/* Add address form */}
                {showAddressForm && (
                  <div className="mt-5 rounded-[8px] border border-emerald-100 bg-[#f6faef] p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-black text-emerald-950">
                        <Plus className="size-4" />
                        Thêm địa chỉ mới
                      </div>
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          className="flex size-8 items-center justify-center rounded-[8px] border border-emerald-100 bg-white text-emerald-800 transition hover:bg-emerald-50"
                          onClick={closeAddressForm}
                          title="Đóng form thêm địa chỉ"
                        >
                          <X className="size-4" />
                        </button>
                      )}
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
                          required={showAddressForm}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address-phone">Số điện thoại</Label>
                        <Input
                          id="address-phone"
                          ref={phoneInputRef}
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={addressForm.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          aria-invalid={Boolean(phoneError)}
                          aria-describedby="address-phone-helper"
                          className={
                            phoneError
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : undefined
                          }
                          pattern={PHONE_PATTERN_SOURCE}
                          title={PHONE_ERROR_MESSAGE}
                          placeholder="0987654321"
                          required={showAddressForm}
                        />
                        <p
                          id="address-phone-helper"
                          className={`text-xs font-semibold ${phoneError ? "text-red-600" : "text-slate-500"
                            }`}
                        >
                          {phoneError ||
                            "Nhập 10 chữ số, bắt đầu bằng số 0."}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address-province">Tỉnh/thành phố</Label>
                        <select
                          id="address-province"
                          value={addressForm.provinceCode}
                          onChange={(e) => handleProvinceChange(e.target.value)}
                          required={showAddressForm}
                          className="h-10 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        >
                          <option value="">Chọn tỉnh/thành phố</option>
                          {VIETNAM_PROVINCES.map((province) => (
                            <option key={province.code} value={province.code}>
                              {getProvinceLabel(province)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address-district">Quận/huyện</Label>
                        <select
                          id="address-district"
                          value={addressForm.districtCode}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                          disabled={!selectedProvinceForForm}
                          required={showAddressForm}
                          className="h-10 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="">Chọn quận/huyện</option>
                          {districtOptions.map((district) => (
                            <option key={district.code} value={district.code}>
                              {district.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="address-ward">Phường/xã</Label>
                        <select
                          id="address-ward"
                          value={addressForm.wardCode}
                          onChange={(e) => handleWardChange(e.target.value)}
                          disabled={!selectedDistrictForForm}
                          required={showAddressForm}
                          className="h-10 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="">Chọn phường/xã</option>
                          {wardOptions.map((ward) => (
                            <option key={ward.code} value={ward.code}>
                              {ward.name}
                            </option>
                          ))}
                        </select>
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
                          required={showAddressForm}
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
                )}
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
                      {totalAmountLabel}
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
                      <option value="vnpay">VNPay Sandbox</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>

                  {/* ── COUPON PICKER ───────────────────────────────────── */}
                  <CouponPicker
                    appliedCoupons={appliedCoupons}
                    subtotal={summary.subtotal}
                    membershipTier={membershipTier}
                    cartItems={cartItems}
                    onApply={(nextCoupons) => {
                      setAppliedCoupons(nextCoupons);
                      setPreview(null); // reset preview so totals recalculate
                    }}
                  />

                  {/* ── POINTS REDEMPTION ───────────────────────────────── */}
                  {loyaltyPoints > 0 && (
                    <div className="flex items-center justify-between rounded-[8px] border border-amber-200 bg-amber-50/50 p-3 shadow-sm transition-all duration-350 hover:border-amber-300">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                          <Coins className="size-4.5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-amber-900 uppercase tracking-wider">Dùng xu tích lũy</p>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            Sử dụng <span className="font-bold text-amber-700">{formatNumber(loyaltyPoints)} Xu</span> giảm trừ trực tiếp
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={usePoints}
                          onChange={(e) => {
                            setUsePoints(e.target.checked);
                            setPreview(null); // Reset preview to recalculate totals
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  )}

                  {/* ── ORDER TOTALS ────────────────────────────────────── */}
                  <div className="rounded-[8px] border border-emerald-100 bg-[#f6faef] p-4">
                    <div className="space-y-2 text-sm font-semibold text-slate-600">
                      <div className="flex justify-between">
                        <span>Tạm tính</span>
                        <span>{formatCurrency(summary.subtotal)}</span>
                      </div>

                      {/* Coupon Discount row */}
                      {(() => {
                        const couponDiscountEst = checkoutQuoteReady
                          ? summary.couponDiscountAmount
                          : 0;
                        const pointsDiscountEst = checkoutQuoteReady
                          ? summary.pointsDiscount
                          : 0;

                        return (
                          <>
                            {couponDiscountEst > 0 && (
                              <div className="flex justify-between font-black text-emerald-700">
                                <span className="flex items-center gap-1.5">
                                  <BadgePercent className="size-3.5" />
                                  Mã giảm giá
                                  {appliedCoupons.map((coupon) => (
                                    <span key={coupon.id} className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                      {coupon.code}
                                    </span>
                                  ))}
                                </span>
                                <span>-{formatCurrency(couponDiscountEst)}</span>
                              </div>
                            )}

                            {/* Loyalty Points Discount row */}
                            {usePoints && pointsDiscountEst > 0 && (
                              <div className="flex justify-between text-amber-700 font-black">
                                <span className="flex items-center gap-1.5">
                                  <Coins className="size-3.5 text-amber-500" />
                                  Dùng {formatNumber(summary.pointsUsed)} xu tích lũy
                                </span>
                                <span>-{formatCurrency(pointsDiscountEst)}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      <div className="flex justify-between">
                        <span>Phí giao hàng</span>
                        <span>
                          {!checkoutQuoteReady
                            ? pendingAmountLabel
                            : summary.shippingFee === 0 && cartItems.length > 0
                              ? "Miễn phí"
                              : formatCurrency(summary.shippingFee)}
                        </span>
                      </div>

                      <div className="flex justify-between border-t border-emerald-100 pt-3 text-base font-black text-slate-950">
                        <span>Tổng thanh toán</span>
                        <span
                          className={
                            hasServerDiscount || hasServerFreeShipping
                              ? "text-emerald-700"
                              : ""
                          }
                        >
                          {totalAmountLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery address summary */}
                  {previewShippingAddress ? (
                    <div className="rounded-[8px] border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
                      <p className="font-black">Giao đến</p>
                      <p className="mt-1 font-semibold">
                        {previewShippingAddress.fullName} - {previewShippingAddress.phone}
                      </p>
                      <p className="mt-1 leading-6">
                        {previewShippingAddress.address}, {previewShippingAddress.city}
                      </p>
                    </div>
                  ) : selectedAddressId ? (
                    <div className="rounded-[8px] border border-sky-100 bg-sky-50 p-3 text-sm font-semibold text-sky-900">
                      {previewing
                        ? "Đang đồng bộ địa chỉ nhận hàng từ API..."
                        : "Chọn địa chỉ để hệ thống kiểm tra lại từ API."}
                    </div>
                  ) : null}

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
                      disabled={
                        submitting ||
                        previewing ||
                        cartItems.length === 0 ||
                        !checkoutQuoteReady ||
                        !preview?.canCheckout
                      }
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
                    Với VNPay, đơn hàng sẽ được tạo trước rồi chuyển sang cổng
                    thanh toán; hệ thống chỉ cập nhật đã thanh toán sau khi IPN
                    hợp lệ từ VNPay gửi về.
                  </p>
                </div>
              </section>
            </aside>
          </form>
        )}

        {/* ── EDIT ADDRESS DIALOG ──────────────────────────────────── */}
        {isEditDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
            <div className="w-full max-w-2xl rounded-[8px] border border-emerald-100 bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-950">
                  Chỉnh sửa địa chỉ giao hàng
                </h3>
                <button
                  type="button"
                  onClick={closeEditDialog}
                  className="flex size-8 items-center justify-center rounded-[6px] text-slate-600 hover:bg-slate-100"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="edit-address-full-name">Người nhận</Label>
                  <Input
                    id="edit-address-full-name"
                    value={editAddressForm.fullName}
                    onChange={(e) =>
                      updateEditAddressForm("fullName", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address-phone">Số điện thoại</Label>
                  <Input
                    id="edit-address-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={editAddressForm.phone}
                    onChange={(e) => handleEditPhoneChange(e.target.value)}
                    aria-invalid={Boolean(editPhoneError)}
                    aria-describedby="edit-address-phone-helper"
                    className={
                      editPhoneError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : undefined
                    }
                  />
                  <p
                    id="edit-address-phone-helper"
                    className={`text-xs font-semibold ${editPhoneError ? "text-red-600" : "text-slate-500"
                      }`}
                  >
                    {editPhoneError ||
                      "Nhập 10 chữ số, bắt đầu bằng số 0."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address-province">Tỉnh/thành phố</Label>
                  <select
                    id="edit-address-province"
                    value={editAddressForm.provinceCode}
                    onChange={(e) => handleEditProvinceChange(e.target.value)}
                    className="h-10 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">Chọn tỉnh/thành phố</option>
                    {VIETNAM_PROVINCES.map((province) => (
                      <option key={province.code} value={province.code}>
                        {getProvinceLabel(province)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address-district">Quận/huyện</Label>
                  <select
                    id="edit-address-district"
                    value={editAddressForm.districtCode}
                    onChange={(e) => handleEditDistrictChange(e.target.value)}
                    disabled={!editAddressForm.provinceCode}
                    className="h-10 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Chọn quận/huyện</option>
                    {editDistrictOptions.map((district) => (
                      <option key={district.code} value={district.code}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-address-ward">Phường/xã</Label>
                  <select
                    id="edit-address-ward"
                    value={editAddressForm.wardCode}
                    onChange={(e) => handleEditWardChange(e.target.value)}
                    disabled={!editAddressForm.districtCode}
                    className="h-10 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Chọn phường/xã</option>
                    {editWardOptions.map((ward) => (
                      <option key={ward.code} value={ward.code}>
                        {ward.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-address-detail">Địa chỉ chi tiết</Label>
                  <Textarea
                    id="edit-address-detail"
                    value={editAddressForm.address}
                    onChange={(e) =>
                      updateEditAddressForm("address", e.target.value)
                    }
                    rows={3}
                  />
                </div>
              </div>

              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={editAddressForm.defaultAddress}
                  onChange={(e) =>
                    updateEditAddressForm("defaultAddress", e.target.checked)
                  }
                  className="size-4 rounded border-emerald-200 text-emerald-600"
                />
                Đặt làm địa chỉ mặc định
              </label>

              <div className="mt-6 flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditDialog}
                  disabled={isEditingAddress}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-600 font-bold hover:bg-emerald-700"
                  disabled={isEditingAddress}
                  onClick={handleUpdateAddress}
                >
                  {isEditingAddress ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Cập nhật"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── DELETE CONFIRMATION DIALOG ───────────────────────────── */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
            <div className="w-full max-w-sm rounded-[8px] border border-red-200 bg-white p-6 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
                  <svg
                    className="size-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 0v-2m0 4a2 2 0 110-4 2 2 0 010 4z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-slate-950">
                    Xác nhận xóa địa chỉ
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Bạn chắc chắn muốn xóa địa chỉ này? Hành động này không thể hoàn tác.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDeleteConfirm}
                  disabled={isDeletingAddress}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 font-bold hover:bg-red-700"
                  disabled={isDeletingAddress}
                  onClick={handleDeleteAddress}
                >
                  {isDeletingAddress ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Xóa"
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
