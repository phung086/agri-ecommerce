"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  Copy,
  RefreshCw,
  Search,
  Truck,
  UserCheck,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  Leaf,
  PackageCheck,
  ShieldCheck,
  MapPin,
  Phone,
  MessageSquare,
  Wallet,
  QrCode,
  Camera,
  AlertCircle,
  X,
  User,
  Navigation,
  Check,
  CameraOff,
  Settings,
  UserRound,
  KeyRound
} from "lucide-react";

import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUploadField } from "@/components/profile/avatar-upload-field";
import { VietnamAddressFields } from "@/components/profile/vietnam-address-fields";
import {
  createVietnamAddressForm,
  parseFullVietnamAddress,
  buildProfileAddress,
  getVietnamAddressError
} from "@/lib/vietnam-addresses";
import { getVietnamPhoneError, normalizeVietnamPhone } from "@/lib/profile-validation";
import { profileService } from "@/services/profile.service";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getAssetUrl,
  setImageFallback,
} from "@/lib/admin-utils";
import { useLanguage } from "@/i18n/language-provider";
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

const blankLoginForm = {
  email: "",
  password: "",
};

const ORDER_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "waiting", label: "Chờ lấy hàng" },
  { value: "delivering", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "failed", label: "Giao thất bại" },
  { value: "redelivery", label: "Chờ giao lại" },
  { value: "returning", label: "Đang hoàn" },
  { value: "returned", label: "Đã hoàn" },
  { value: "cancelled", label: "Đã hủy" },
];

const SHIPPING_STATUS_GROUPS = {
  waiting: [
    "pending",
    "confirmed",
    "ready_to_ship",
    "created",
    "waiting_pickup",
    "ready_to_pick",
    "ready_to_deliver",
    "ready_for_delivery",
    "processing",
  ],
  delivering: [
    "picking_up",
    "picking",
    "picked",
    "storing",
    "transporting",
    "sorting",
    "delivering",
    "out_for_delivery",
    "shipping",
    "in_transit",
  ],
  delivered: ["delivered", "completed"],
  failed: [
    "delivery_failed",
    "failed_attempt",
    "failed_delivery_attempt",
    "delivery_fail",
    "failed",
    "return_fail",
  ],
  redelivery: ["redelivery_requested", "redelivery"],
  returning: ["returning", "waiting_to_return", "return"],
  returned: ["returned"],
  cancelled: ["cancelled", "canceled", "cancel"],
};

const SHIPPING_STATUS_META = {
  waiting: {
    label: "Chờ lấy hàng",
    className: "border-amber-100 bg-amber-50 text-amber-700",
  },
  delivering: {
    label: "Đang giao",
    className: "border-blue-100 bg-blue-50 text-blue-700",
  },
  delivered: {
    label: "Đã giao",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  failed: {
    label: "Giao thất bại",
    className: "border-red-100 bg-red-50 text-red-700",
  },
  redelivery: {
    label: "Chờ giao lại",
    className: "border-orange-100 bg-orange-50 text-orange-700",
  },
  returning: {
    label: "Đang hoàn hàng",
    className: "border-purple-100 bg-purple-50 text-purple-700",
  },
  returned: {
    label: "Đã hoàn hàng",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  cancelled: {
    label: "Đã hủy",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  unknown: {
    label: "Chưa cập nhật",
    className: "border-slate-200 bg-white text-slate-600",
  },
};

const STATUS_UPDATE_OPTIONS = [
  {
    value: "picking_up",
    label: "Đang lấy hàng",
    description: "Nhân viên đang đến điểm lấy hàng",
  },
  {
    value: "out_for_delivery",
    label: "Đang giao",
    description: "Đơn hàng đang được giao đến khách",
  },
  {
    value: "redelivery_requested",
    label: "Giao lại",
    description: "Tạo lại lượt giao cho đơn hàng này",
  },
  {
    value: "delivered",
    label: "Giao thành công",
    description: "Khách đã nhận hàng thành công",
  },
  {
    value: "failed_delivery_attempt",
    label: "Giao thất bại",
    description: "Không thể giao hàng cho khách",
  },
  {
    value: "returning",
    label: "Hoàn hàng",
    description: "Đơn hàng cần hoàn về kho hoặc người bán",
  },
];

const FAILURE_REASONS = [
  { value: "cannot_contact", label: "Khách không nghe máy" },
  { value: "wrong_address", label: "Sai địa chỉ" },
  { value: "rescheduled", label: "Khách hẹn giao lại" },
  { value: "canceled", label: "Khách từ chối nhận hàng" },
  { value: "unreachable", label: "Không liên hệ được khách" },
  { value: "other", label: "Khác" },
];

const STATUS_TRANSITIONS = {
  ready_for_delivery: ["picking_up", "returning"],
  waiting_pickup: ["picking_up", "returning"],
  ready_to_pick: ["picking_up", "returning"],
  picking_up: ["out_for_delivery", "failed_delivery_attempt", "returning"],
  picking: ["out_for_delivery", "failed_delivery_attempt", "returning"],
  out_for_delivery: ["delivered", "failed_delivery_attempt", "returning"],
  delivering: ["delivered", "failed_delivery_attempt", "returning"],
  delivery_failed: ["redelivery_requested", "returning"],
  failed_delivery_attempt: ["redelivery_requested", "returning"],
  failed_attempt: ["redelivery_requested", "returning"],
  delivery_fail: ["redelivery_requested", "returning"],
  redelivery_requested: ["out_for_delivery", "returning"],
};

const TERMINAL_STATUS_MESSAGES = {
  delivered: "Đơn hàng đã giao thành công, không thể cập nhật trạng thái.",
  completed: "Đơn hàng đã giao thành công, không thể cập nhật trạng thái.",
  returned: "Đơn hàng đã hoàn hàng, không thể cập nhật trạng thái.",
};

const STATUS_LABELS = {
  pending: "Chờ xác nhận",
  processing: "Đang xử lý",
  ready_for_delivery: "Chờ lấy hàng",
  waiting_pickup: "Chờ lấy hàng",
  ready_to_pick: "Chờ lấy hàng",
  picking_up: "Đang lấy hàng",
  picking: "Đang lấy hàng",
  out_for_delivery: "Đang giao",
  delivering: "Đang giao",
  delivered: "Giao thành công",
  completed: "Hoàn tất",
  delivery_failed: "Giao thất bại",
  failed_delivery_attempt: "Giao thất bại",
  failed_attempt: "Giao thất bại",
  delivery_fail: "Giao thất bại",
  failed: "Giao thất bại",
  redelivery_requested: "Chờ giao lại",
  returning: "Đang hoàn hàng",
  waiting_to_return: "Đang hoàn hàng",
  return: "Đang hoàn hàng",
  returned: "Đã hoàn hàng",
  canceled: "Đã hủy",
  cancelled: "Đã hủy",
  cancel: "Đã hủy",
};

const SUPPORTED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const SUPPORTED_AVATAR_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const HIGH_COD_THRESHOLD = 2_000_000;

const SHIFT_CHECKLIST_ITEMS = [
  {
    id: "new-orders",
    title: "Kiểm tra đơn hàng mới",
    description: "Rà soát đơn mới phát sinh và đơn chờ xác nhận.",
    countKey: "waitingConfirm",
  },
  {
    id: "without-ghn",
    title: "Kiểm tra đơn chưa tạo vận đơn GHN",
    description: "Đảm bảo các đơn đủ thông tin đã có mã vận đơn GHN.",
    countKey: "waitingGhn",
  },
  {
    id: "failed-deliveries",
    title: "Kiểm tra đơn giao thất bại",
    description: "Xem lý do thất bại và quyết định xử lý tiếp theo.",
    countKey: "failed",
  },
  {
    id: "cod-reconciliation",
    title: "Kiểm tra COD cần đối soát",
    description: "Theo dõi tổng COD trong ca để phối hợp đối soát.",
    countKey: "codOrders",
  },
  {
    id: "ghn-webhook",
    title: "Kiểm tra webhook GHN / trạng thái vận chuyển",
    description: "Tìm các đơn thiếu cập nhật trạng thái vận chuyển.",
    countKey: "withoutGhnStatus",
  },
  {
    id: "customer-contact",
    title: "Kiểm tra đơn cần liên hệ khách hàng",
    description: "Ưu tiên đơn thiếu số điện thoại hoặc địa chỉ giao hàng.",
    countKey: "missingDeliveryInfo",
  },
];

const SHIFT_STATUS_META = {
  not_started: {
    label: "Chưa nhận ca",
    actionLabel: "Bắt đầu ca",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  in_shift: {
    label: "Đang trong ca",
    actionLabel: "Kết thúc ca",
    className: "border-emerald-100 bg-emerald-50 text-emerald-800",
  },
  ended: {
    label: "Đã kết thúc ca",
    actionLabel: "Bắt đầu ca mới",
    className: "border-blue-100 bg-blue-50 text-blue-800",
  },
  paused: {
    label: "Tạm dừng",
    actionLabel: "Bắt đầu ca",
    className: "border-amber-100 bg-amber-50 text-amber-800",
  },
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

function firstText(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

function getOrderInternalCode(order) {
  return firstText(order?.orderCode, order?.code) || (order?.id ? `#${order.id}` : "#--");
}

function getGhnTrackingCode(order) {
  return firstText(order?.trackingNumber, order?.ghnOrderCode, order?.shippingCode);
}

function getCustomerName(order) {
  return firstText(
    order?.customerName,
    order?.shippingName,
    order?.recipientName,
    order?.shippingAddress?.fullName
  ) || "Khách hàng";
}

function getCustomerPhone(order) {
  return firstText(
    order?.customerPhone,
    order?.customerPhoneNumber,
    order?.shippingPhone,
    order?.recipientPhone,
    order?.shippingAddress?.phone
  );
}

function getShippingAddress(order) {
  const address = firstText(
    typeof order?.shippingAddress === "string" ? order.shippingAddress : "",
    order?.shippingAddressDetail,
    order?.fullAddress,
    order?.shippingAddress?.address
  );
  const city = firstText(order?.shippingCity, order?.shippingAddress?.city);
  const fullAddress = [address, city].filter(Boolean).join(", ");
  return fullAddress || "Chưa có địa chỉ";
}

function getGhnStatus(order) {
  return firstText(order?.ghnStatus, order?.shippingStatus);
}

function getStatusLabel(status) {
  const normalized = normalizeStatus(status);
  return STATUS_LABELS[normalized] || firstText(status) || "Chưa cập nhật";
}

function getDisplayShippingStatus(order) {
  return getStatusLabel(getGhnStatus(order) || order?.status);
}

function getOrderCode(order) {
  return getGhnTrackingCode(order) || getOrderInternalCode(order);
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function unwrapApiData(response) {
  return response?.data ?? response;
}

function isCashPayment(order) {
  const method = String(order?.payment?.paymentMethod || "").toLowerCase();
  return method === "cash" || method === "cod";
}

function getPaymentMethodLabel(order) {
  if (isCashPayment(order)) {
    return "Tiền mặt (COD)";
  }

  const method = String(order?.payment?.paymentMethod || "").toLowerCase();
  const labels = {
    paypal: "PayPal",
    vnpay: "VNPay",
    bank_transfer: "Chuyển khoản",
  };

  return labels[method] || "Đã thanh toán online";
}

function getOrderSubtotal(order) {
  const subtotal = Number(order?.subtotal);
  if (Number.isFinite(subtotal) && subtotal > 0) {
    return subtotal;
  }

  return (order?.items || []).reduce(
    (sum, item) =>
      sum +
      Number(item.lineTotal ?? Number(item.price || 0) * Number(item.quantity || 0)),
    0
  );
}

function getOrderDiscount(order) {
  return Math.max(0, Number(order?.discountAmount || 0));
}

function getOrderShippingFee(order) {
  return Math.max(0, Number(order?.shippingFee || 0));
}

function getOrderTotal(order) {
  return Number(order?.totalPrice ?? order?.payment?.amount ?? 0);
}

function getOrderCodAmount(order) {
  return isCashPayment(order) ? getOrderTotal(order) : 0;
}

function getStatusGroupFromValue(status) {
  const normalized = normalizeStatus(status);
  if (!normalized) {
    return "";
  }

  return Object.entries(SHIPPING_STATUS_GROUPS).find(([, values]) =>
    values.includes(normalized)
  )?.[0] || "";
}

function getOrderStatusGroup(order) {
  return (
    getStatusGroupFromValue(order?.status) ||
    getStatusGroupFromValue(getGhnStatus(order)) ||
    "unknown"
  );
}

function getStatusMeta(order) {
  return SHIPPING_STATUS_META[getOrderStatusGroup(order)] || SHIPPING_STATUS_META.unknown;
}

function getCanonicalDeliveryStatus(order) {
  const internalStatus = normalizeStatus(order?.status);
  const ghnStatus = normalizeStatus(getGhnStatus(order));
  return internalStatus || ghnStatus;
}

function getCurrentDeliveryStatusMeta(order) {
  const status = getCanonicalDeliveryStatus(order);
  return {
    ...getStatusMeta(order),
    label: getStatusLabel(status),
  };
}

function getValidStatusOptions(order) {
  const currentStatus = getCanonicalDeliveryStatus(order);
  const nextStatuses = STATUS_TRANSITIONS[currentStatus] || [];
  return STATUS_UPDATE_OPTIONS
    .filter((item) => nextStatuses.includes(item.value))
    .map((item) => {
      if (currentStatus === "redelivery_requested" && item.value === "out_for_delivery") {
        return {
          ...item,
          label: "Bắt đầu giao lại",
          description: "Chuyển đơn từ chờ giao lại sang đang giao",
        };
      }

      return item;
    });
}

function getTerminalStatusMessage(order) {
  return TERMINAL_STATUS_MESSAGES[getCanonicalDeliveryStatus(order)] || "";
}

function canStartDelivery(order) {
  return getValidStatusOptions(order).some((item) => item.value === "picking_up");
}

function canCompleteDelivery(order) {
  return getValidStatusOptions(order).some((item) => item.value === "delivered");
}

function canReportFailedDelivery(order) {
  return getValidStatusOptions(order).some((item) =>
    ["failed_delivery_attempt", "redelivery_requested", "returning"].includes(item.value)
  );
}

function canConfirmReturned(order) {
  return ["returning", "return", "waiting_to_return"].includes(getCanonicalDeliveryStatus(order));
}

function getOrderSearchValue(order) {
  return [
    order?.id,
    order?.orderCode,
    order?.code,
    order?.trackingNumber,
    order?.ghnOrderCode,
    order?.shippingCode,
    order?.status,
    getGhnStatus(order),
    getCustomerName(order),
    getCustomerPhone(order),
    getShippingAddress(order),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getPrimaryOrderActionLabel(order) {
  const group = getOrderStatusGroup(order);
  if (group === "waiting") {
    return "Bắt đầu giao";
  }
  if (group === "delivering") {
    return "Cập nhật trạng thái";
  }
  return "Xem chi tiết";
}

function getLastStatusUpdatedAt(order) {
  return firstText(
    order?.shippingStatusUpdatedAt,
    order?.updatedAt,
    order?.deliveredAt,
    order?.createdAt
  );
}

function getOrderHistory(order) {
  return Array.isArray(order?.statusHistory) ? order.statusHistory : [];
}

function getCurrentShiftStatus({ localShiftStatus, profile, user }) {
  return normalizeStatus(
    profile?.shiftStatus ||
    user?.shiftStatus ||
    localShiftStatus ||
    "not_started"
  ) || "not_started";
}

function getShiftStatusMeta(status) {
  return SHIFT_STATUS_META[status] || SHIFT_STATUS_META.not_started;
}

function getOrdersInCurrentShift(orders) {
  return Array.isArray(orders) ? orders : [];
}

function hasGhnWaybill(order) {
  return Boolean(getGhnTrackingCode(order));
}

function hasDeliveryInfo(order) {
  return Boolean(getCustomerPhone(order) && getShippingAddress(order) !== "Chưa có địa chỉ");
}

function hasGhnStatus(order) {
  return Boolean(getGhnStatus(order));
}

function isWaitingConfirmation(order) {
  return ["pending", "confirmed"].includes(normalizeStatus(order?.status));
}

function isHighCodOrder(order) {
  return getOrderCodAmount(order) >= HIGH_COD_THRESHOLD;
}

function getNeedActionOrders(orders) {
  const actionMap = new Map();

  getOrdersInCurrentShift(orders).forEach((order) => {
    if (
      getOrderStatusGroup(order) === "failed" ||
      !hasGhnWaybill(order) ||
      !hasGhnStatus(order) ||
      !hasDeliveryInfo(order) ||
      isHighCodOrder(order) ||
      getOrderStatusGroup(order) === "cancelled"
    ) {
      actionMap.set(order.id || getOrderCode(order), order);
    }
  });

  return Array.from(actionMap.values());
}

function getOrderShiftStats(orders) {
  const shiftOrders = getOrdersInCurrentShift(orders);
  const waitingConfirm = shiftOrders.filter(isWaitingConfirmation).length;
  const waitingGhn = shiftOrders.filter((order) => !hasGhnWaybill(order)).length;
  const createdGhn = shiftOrders.filter(hasGhnWaybill).length;
  const delivering = shiftOrders.filter((order) => getOrderStatusGroup(order) === "delivering").length;
  const delivered = shiftOrders.filter((order) => getOrderStatusGroup(order) === "delivered").length;
  const failed = shiftOrders.filter((order) => getOrderStatusGroup(order) === "failed").length;
  const cancelled = shiftOrders.filter((order) => getOrderStatusGroup(order) === "cancelled").length;
  const withoutGhnStatus = shiftOrders.filter((order) => !hasGhnStatus(order)).length;
  const missingDeliveryInfo = shiftOrders.filter((order) => !hasDeliveryInfo(order)).length;
  const highCod = shiftOrders.filter(isHighCodOrder).length;
  const codOrders = shiftOrders.filter(isCashPayment).length;
  const totalCod = shiftOrders.reduce((sum, order) => sum + getOrderCodAmount(order), 0);
  const totalShippingFee = shiftOrders.reduce((sum, order) => sum + getOrderShippingFee(order), 0);

  return {
    totalOrders: shiftOrders.length,
    waitingConfirm,
    waitingGhn,
    createdGhn,
    delivering,
    delivered,
    failed,
    cancelled,
    withoutGhnStatus,
    missingDeliveryInfo,
    highCod,
    codOrders,
    needAction: getNeedActionOrders(shiftOrders).length,
    totalCod,
    totalShippingFee,
  };
}

function getShiftWarnings(orders) {
  const shiftStats = getOrderShiftStats(orders);
  return [
    {
      id: "without-ghn",
      title: "Đơn chưa tạo vận đơn GHN",
      description: "Cần kiểm tra điều kiện tạo vận đơn và thông tin giao hàng.",
      count: shiftStats.waitingGhn,
      tone: "amber",
    },
    {
      id: "failed",
      title: "Đơn giao thất bại cần xử lý",
      description: "Cần xem lý do thất bại và phương án giao lại/hoàn hàng.",
      count: shiftStats.failed,
      tone: "red",
    },
    {
      id: "without-ghn-status",
      title: "Đơn chưa cập nhật trạng thái GHN",
      description: "Theo dõi webhook GHN hoặc cập nhật trạng thái vận chuyển.",
      count: shiftStats.withoutGhnStatus,
      tone: "amber",
    },
    {
      id: "high-cod",
      title: "Đơn COD cao cần chú ý",
      description: "Ưu tiên theo dõi và đối soát các đơn COD giá trị cao.",
      count: shiftStats.highCod,
      tone: "red",
    },
    {
      id: "cancelled",
      title: "Đơn bị hủy",
      description: "Kiểm tra đơn hủy để tránh tạo vận đơn hoặc đối soát sai.",
      count: shiftStats.cancelled,
      tone: "slate",
    },
    {
      id: "missing-info",
      title: "Đơn thiếu thông tin giao hàng",
      description: "Cần bổ sung số điện thoại hoặc địa chỉ nhận hàng.",
      count: shiftStats.missingDeliveryInfo,
      tone: "amber",
    },
  ].filter((warning) => warning.count > 0);
}

function getEmptyOrdersTitle(filter, hasAssignedOrders) {
  if (!hasAssignedOrders) {
    return "Chưa có đơn hàng vận chuyển nào";
  }

  const titles = {
    waiting: "Không có đơn chờ lấy hàng.",
    delivering: "Không có đơn đang giao.",
    delivered: "Không có đơn đã giao.",
    failed: "Không có đơn giao thất bại.",
    returning: "Không có đơn đang hoàn hàng.",
    returned: "Không có đơn đã hoàn.",
    cancelled: "Không có đơn đã hủy.",
  };

  return titles[filter] || "Không có đơn hàng vận chuyển phù hợp";
}

function getEmptyOrdersDescription(filter, hasAssignedOrders) {
  if (!hasAssignedOrders) {
    return "Các đơn hàng GHN được phân công sẽ hiển thị tại đây.";
  }

  return "Thử đổi bộ lọc hoặc từ khóa tìm kiếm.";
}

function getInitial(user) {
  return (user?.name || user?.email || "S").charAt(0).toUpperCase();
}

function validateAvatarFile(file) {
  if (!file) {
    return "";
  }

  if (
    !SUPPORTED_AVATAR_TYPES.has(file.type) ||
    !SUPPORTED_AVATAR_EXTENSIONS.test(file.name)
  ) {
    return "Chỉ hỗ trợ ảnh JPG, JPEG, PNG hoặc WEBP.";
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return "Ảnh minh chứng không được vượt quá 5MB.";
  }

  return "";
}

export default function DeliveryPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [authStatus, setAuthStatus] = useState("checking");
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState(blankLoginForm);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ordersError, setOrdersError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  
  // Mobile UI state
  const [activeTab, setActiveTab] = useState("orders"); // "shift", "orders", "settlement", "settings"
  const [shiftStatus, setShiftStatus] = useState("not_started");
  const [shiftStartedAt, setShiftStartedAt] = useState("");
  const [shiftUpdatedAt, setShiftUpdatedAt] = useState("");
  const [checkedShiftItems, setCheckedShiftItems] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveredConfirmOrder, setDeliveredConfirmOrder] = useState(null);
  const [returnedConfirmOrder, setReturnedConfirmOrder] = useState(null);
  const [returnCompletionNote, setReturnCompletionNote] = useState("");
  const [settlementConfirmOpen, setSettlementConfirmOpen] = useState(false);
  const [settlementStatus, setSettlementStatus] = useState("");
  
  // Verification states
  const [verifyMode, setVerifyMode] = useState(null); // "status", "success", "failed"
  const [statusDraft, setStatusDraft] = useState("out_for_delivery");
  const [failedReason, setFailedReason] = useState(""); // "rescheduled", "cannot_contact", "canceled"

  // Settings tab states
  const [profileForm, setProfileForm] = useState({ name: "", phoneNumber: "", avatar: "" });
  const [addressForm, setAddressForm] = useState(createVietnamAddressForm());
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const [verificationNote, setVerificationNote] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [proofValidationMessage, setProofValidationMessage] = useState("");
  
  // Canvas Signature pad state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initializeDeliverySession() {
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
        syncStoredDeliveryProfile(session.currentUser);
        setAuthStatus("authenticated");
        setLoading(true);
        setError("");
        setNotice("");
        setOrdersError("");
      }

      const [ordersResult, profileResult] = await Promise.allSettled([
        deliveryService.getAssignedOrders(ORDER_FETCH_PARAMS),
        profileService.getProfile(),
      ]);

      if (!cancelled) {
        if (ordersResult.status === "fulfilled") {
          setOrders(readPageContent(ordersResult.value));
        } else {
          const message = getErrorMessage(
            ordersResult.reason,
            "Không thể tải danh sách đơn giao hàng."
          );
          setOrdersError(message);
          setError(message);
        }

        if (profileResult.status === "fulfilled") {
          const profile = unwrapApiData(profileResult.value);
          if (profile) {
            syncStoredDeliveryProfile(profile);
          }
        }

        setLoading(false);
      }
    }

    initializeDeliverySession();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const byGroup = (group) => orders.filter((order) => getOrderStatusGroup(order) === group);
    const deliveredOrders = byGroup("delivered");
    const codDelivered = orders.filter(
      (order) => getOrderStatusGroup(order) === "delivered" && isCashPayment(order)
    ).length;
    const onlineDelivered = orders.filter(
      (order) => getOrderStatusGroup(order) === "delivered" && !isCashPayment(order)
    ).length;
    const totalCod = orders
      .filter(isCashPayment)
      .reduce((sum, order) => sum + getOrderTotal(order), 0);
    const totalShippingFee = orders.reduce(
      (sum, order) => sum + getOrderShippingFee(order),
      0
    );

    return {
      total: orders.length,
      ready: byGroup("waiting").length,
      waiting: byGroup("waiting").length,
      delivering: byGroup("delivering").length,
      delivered: deliveredOrders.length,
      failed: byGroup("failed").length,
      returned: byGroup("returned").length,
      cancelled: byGroup("cancelled").length,
      codDelivered,
      onlineDelivered,
      totalCod,
      totalShippingFee,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesFilter =
        orderFilter === "all" || getOrderStatusGroup(order) === orderFilter;
      const matchesKeyword =
        !keyword ||
        getOrderSearchValue(order).includes(keyword);
      return matchesFilter && matchesKeyword;
    });
  }, [orders, orderFilter, searchTerm]);

  const currentShiftStatus = useMemo(
    () => getCurrentShiftStatus({ localShiftStatus: shiftStatus, profile: currentUser, user: currentUser }),
    [currentUser, shiftStatus]
  );

  const currentShiftMeta = getShiftStatusMeta(currentShiftStatus);
  const shiftStats = useMemo(() => getOrderShiftStats(orders), [orders]);
  const shiftWarnings = useMemo(() => getShiftWarnings(orders), [orders]);
  const selectedStatusOptions = useMemo(
    () => getValidStatusOptions(selectedOrder),
    [selectedOrder]
  );
  const selectedTerminalStatusMessage = useMemo(
    () => getTerminalStatusMessage(selectedOrder),
    [selectedOrder]
  );

  function updateLoginForm(field, value) {
    setLoginForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function syncStoredDeliveryProfile(nextProfile) {
    const session = getAuthSession(AUTH_SCOPES.delivery);
    if (!session?.accessToken) return;
    saveAuthSession(
      {
        accessToken: session.accessToken,
        tokenType: session.tokenType,
        user: nextProfile,
        expiresIn: session.tokenExpiresAt ? Math.max(session.tokenExpiresAt - Date.now(), 0) : undefined,
      },
      {
        remember: isAuthSessionRemembered(AUTH_SCOPES.delivery),
        scope: AUTH_SCOPES.delivery,
      }
    );
    setCurrentUser(nextProfile);
    setProfileForm({
      name: nextProfile?.name || "",
      phoneNumber: nextProfile?.phoneNumber || "",
      avatar: nextProfile?.avatar || "",
    });
    setAddressForm(parseFullVietnamAddress(nextProfile?.address || ""));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setNotice("");
    setError("");

    try {
      const phoneValidationError = getVietnamPhoneError(profileForm.phoneNumber);
      if (phoneValidationError) {
        setError(phoneValidationError);
        setSavingProfile(false);
        return;
      }

      const addressValidationError = getVietnamAddressError(addressForm, { required: false });
      if (addressValidationError) {
        setError(addressValidationError);
        setSavingProfile(false);
        return;
      }

      const fullAddressStr = buildProfileAddress(addressForm);

      const response = await profileService.updateProfile({
        name: profileForm.name.trim(),
        phoneNumber: normalizeVietnamPhone(profileForm.phoneNumber),
        avatar: profileForm.avatar.trim(),
        address: fullAddressStr,
      });
      const nextProfile = response?.data ?? response;

      syncStoredDeliveryProfile(nextProfile);
      toast.success("Đã cập nhật hồ sơ cá nhân.");
      setNotice("Đã cập nhật hồ sơ cá nhân.");
    } catch (err) {
      toast.error(err?.message || "Có lỗi xảy ra khi lưu hồ sơ.");
      setError(err?.message || "Có lỗi xảy ra khi lưu hồ sơ.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setSavingPassword(true);
    setNotice("");
    setError("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      setSavingPassword(false);
      return;
    }

    try {
      await profileService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Đã đổi mật khẩu thành công.");
      setNotice("Đã đổi mật khẩu thành công.");
    } catch (err) {
      setError(err?.message || "Không thể đổi mật khẩu.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleAvatarFile(file) {
    if (!file) return null;
    setUploadingAvatar(true);
    setError("");
    setNotice("");
    try {
      const response = await profileService.uploadAvatar(file);
      const nextProfile = response?.data ?? response;
      syncStoredDeliveryProfile(nextProfile);
      toast.success("Đã upload ảnh đại diện mới.");
      setNotice("Đã upload ảnh đại diện mới.");
      return nextProfile;
    } catch (err) {
      toast.error(err?.message || "Không thể tải ảnh lên.");
      setError(err?.message || "Không thể tải ảnh lên.");
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleAvatarRemove() {
    setError("");
    setNotice("");
    try {
      const response = await profileService.deleteAvatar();
      const nextProfile = response?.data ?? response;
      syncStoredDeliveryProfile(nextProfile);
      toast.success("Đã xóa ảnh đại diện.");
      setNotice("Đã xóa ảnh đại diện.");
    } catch (err) {
      toast.error(err?.message || "Không thể xóa ảnh đại diện.");
      setError(err?.message || "Không thể xóa ảnh đại diện.");
    }
  }

  function updateOrderInState(updatedOrder) {
    setOrders((current) =>
      current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );
    setSelectedOrder((current) =>
      current?.id === updatedOrder.id ? updatedOrder : current
    );
  }

  function resetOrderModalState() {
    setSelectedOrder(null);
    setReturnedConfirmOrder(null);
    setReturnCompletionNote("");
    setVerifyMode(null);
    setStatusDraft("out_for_delivery");
    setFailedReason("");
    setVerificationNote("");
    setProofImage("");
    setProofValidationMessage("");
    setSignatureSaved(false);
  }

  function openStatusUpdateModal(order) {
    const options = getValidStatusOptions(order);
    setSelectedOrder(order);
    setStatusDraft(options[0]?.value || "");
    setFailedReason("");
    setVerificationNote("");
    setProofImage("");
    setProofValidationMessage("");
    setVerifyMode("status");
  }

  function openReturnedConfirm(order) {
    setReturnedConfirmOrder(order);
    setReturnCompletionNote("");
    setError("");
    setNotice("");
  }

  async function loadOrders() {
    setLoading(true);
    setError("");
    setNotice("");
    setOrdersError("");
    try {
      const response = await deliveryService.getAssignedOrders(ORDER_FETCH_PARAMS);
      setOrders(readPageContent(response));
    } catch (err) {
      const message = getErrorMessage(err, "Không thể tải danh sách đơn giao hàng.");
      setOrdersError(message);
      setError(message);
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
      syncStoredDeliveryProfile(payload.user);
      setLoginForm(blankLoginForm);
      setAuthStatus("authenticated");
      await loadOrders();
    } catch (err) {
      setError(getErrorMessage(err, "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu."));
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    clearAuthSession(AUTH_SCOPES.delivery);
    setCurrentUser(null);
    setOrders([]);
    setProfileForm({ name: "", phoneNumber: "", avatar: "" });
    setAddressForm(createVietnamAddressForm());
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    resetOrderModalState();
    setDeliveredConfirmOrder(null);
    setReturnedConfirmOrder(null);
    setReturnCompletionNote("");
    setAuthStatus("unauthenticated");
    setNotice("");
    setError("");
    setOrdersError("");
    setShiftStatus("not_started");
    setShiftStartedAt("");
    setShiftUpdatedAt("");
    setCheckedShiftItems({});
    setSettlementStatus("");
  }

  function handleShiftAction() {
    // TODO: Connect this action to a real shift start/end API when backend exposes it.
    const now = new Date().toISOString();
    if (currentShiftStatus === "in_shift") {
      setShiftStatus("ended");
      setShiftUpdatedAt(now);
      setNotice(t("Đã kết thúc ca"));
      return;
    }

    setShiftStatus("in_shift");
    setShiftStartedAt(now);
    setShiftUpdatedAt(now);
    setNotice(t("Đang trong ca"));
  }

  function toggleShiftChecklistItem(itemId) {
    setCheckedShiftItems((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
  }

  // Automated email notification to client
  const sendArrivalNotification = async (order) => {
    setError("");
    setNotice("");
    try {
      await deliveryService.notifyArrival(order.id);
      toast.success("Đã gửi email thông báo chuẩn bị giao hàng tới khách hàng!");
      setNotice("Đã gửi email thông báo chuẩn bị giao hàng thành công.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể gửi thông báo cho khách hàng."));
      setError(getErrorMessage(err, "Không thể gửi thông báo cho khách hàng."));
    }
  };

  async function handleStartTransit(order) {
    setActionLoading(`${order.id}:transit`);
    setError("");
    setNotice("");
    try {
      const updated = await deliveryService.markOutForDelivery(order.id, {
        note: "Nhân viên giao hàng bắt đầu di chuyển giao đơn.",
      });
      updateOrderInState(updated);
      setNotice(`Đơn #${order.id} đã chuyển sang Đang giao hàng.`);
      toast.success(t("Nhân viên giao hàng bắt đầu giao."));
      setVerifyMode(null);
      setStatusDraft("out_for_delivery");
    } catch (err) {
      setError(getErrorMessage(err, "Không thể cập nhật trạng thái giao đơn."));
      toast.error(t(getErrorMessage(err, "Không thể cập nhật trạng thái giao đơn.")));
    } finally {
      setActionLoading("");
    }
  }

  // Canvas Signature pad controls
  useEffect(() => {
    if (verifyMode === "success" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      
      // Make it high density/sharp
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      ctx.scale(ratio, ratio);
    }
  }, [verifyMode]);

  const handleTouchStart = (e) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleTouchMove = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseDown = (e) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setSignatureSaved(true);
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureSaved(false);
  };

  // Proof photo simulator
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationMessage = validateAvatarFile(file);
    if (validationMessage) {
      setProofValidationMessage(validationMessage);
      toast.error(t(validationMessage));
      return;
    }
    
    setUploadingImage(true);
    setError("");
    setProofValidationMessage("");
    try {
      const response = await deliveryService.uploadProofImage(file);
      setProofImage(response.url || response.path || response.relativePath);
      setNotice("Đã tải ảnh minh chứng lên hệ thống.");
      toast.success(t("Đã tải ảnh minh chứng lên hệ thống."));
    } catch (err) {
      setError(getErrorMessage(err, "Không thể upload ảnh minh chứng."));
      toast.error(t(getErrorMessage(err, "Không thể upload ảnh minh chứng.")));
    } finally {
      setUploadingImage(false);
    }
  };

  // Confirm delivery success
  const submitDeliverySuccess = async (orderOverride = selectedOrder) => {
    if (!orderOverride) {
      return;
    }

    if (!proofImage) {
      const message = "Vui lòng chụp hoặc chọn ảnh minh chứng giao hàng.";
      setProofValidationMessage(message);
      toast.error(t(message));
      return;
    }

    let signatureBase64 = null;
    if (canvasRef.current && signatureSaved) {
      signatureBase64 = canvasRef.current.toDataURL("image/png");
    }

    setActionLoading(`${orderOverride.id}:complete`);
    setError("");
    setNotice("");
    try {
      const updated = await deliveryService.updateDeliveryStatus(orderOverride.id, {
        status: "delivered",
        note: verificationNote || "Đã giao hàng thành công.",
        proofImageUrl: proofImage,
        proofImage,
        signature: signatureBase64,
        trackingNumber: getGhnTrackingCode(orderOverride),
        ghnOrderCode: orderOverride.ghnOrderCode,
      });
      updateOrderInState(updated);
      await loadOrders();
      setNotice(`Đơn #${orderOverride.id} đã hoàn thành giao hàng!`);
      toast.success(t("Cập nhật trạng thái giao hàng thành công."));
      setDeliveredConfirmOrder(null);
      resetOrderModalState();
    } catch (err) {
      const message = getErrorMessage(err, "Không thể cập nhật trạng thái giao hàng. Vui lòng thử lại.");
      setError(message);
      toast.error(t(message));
    } finally {
      setActionLoading("");
    }
  };

  // Confirm delivery failure
  const submitDeliveryFailure = async (reasonOverride = failedReason, orderOverride = selectedOrder) => {
    if (!orderOverride) {
      return;
    }

    const trimmedNote = verificationNote.trim();
    const effectiveReason = reasonOverride || (trimmedNote ? "other" : "");

    if (!effectiveReason) {
      toast.error(t("Vui lòng nhập lý do giao hàng thất bại."));
      return;
    }

    if (!trimmedNote) {
      toast.error(t("Vui lòng nhập lý do giao hàng thất bại."));
      return;
    }

    const reasonLabel =
      FAILURE_REASONS.find((item) => item.value === effectiveReason)?.label ||
      "Khác";
    const note = [reasonLabel, trimmedNote].filter(Boolean).join(" - ");

    setActionLoading(`${orderOverride.id}:fail`);
    setError("");
    setNotice("");
    try {
      const updated = await deliveryService.updateDeliveryStatus(orderOverride.id, {
        status: "failed_delivery_attempt",
        failureReason: trimmedNote,
        reason: effectiveReason,
        note,
        trackingNumber: getGhnTrackingCode(orderOverride),
        ghnOrderCode: orderOverride.ghnOrderCode,
      });
      updateOrderInState(updated);
      await loadOrders();
      setNotice(`Đã cập nhật báo cáo thất bại đơn hàng #${orderOverride.id}.`);
      toast.success(t("Cập nhật trạng thái giao hàng thành công."));
      resetOrderModalState();
    } catch (err) {
      const message = getErrorMessage(err, "Không thể cập nhật trạng thái giao hàng. Vui lòng thử lại.");
      setError(message);
      toast.error(t(message));
    } finally {
      setActionLoading("");
    }
  };

  const submitReturnDelivery = async () => {
    if (!selectedOrder) {
      return;
    }

    const trimmedNote = verificationNote.trim();
    if (!trimmedNote) {
      toast.error(t("Vui lòng nhập ghi chú hoàn hàng."));
      return;
    }

    setActionLoading(`${selectedOrder.id}:status`);
    setError("");
    setNotice("");
    try {
      const updated = await deliveryService.updateDeliveryStatus(selectedOrder.id, {
        status: "RETURNING",
        note: trimmedNote,
        returnReason: trimmedNote,
        trackingNumber: getGhnTrackingCode(selectedOrder),
        ghnOrderCode: selectedOrder.ghnOrderCode,
      });
      updateOrderInState(updated);
      await loadOrders();
      setNotice(`Đã cập nhật hoàn hàng cho đơn #${selectedOrder.id}.`);
      toast.success(t("Cập nhật trạng thái giao hàng thành công."));
      resetOrderModalState();
    } catch (err) {
      const message = getErrorMessage(err, "Không thể cập nhật trạng thái giao hàng. Vui lòng thử lại.");
      setError(message);
      toast.error(t(message));
    } finally {
      setActionLoading("");
    }
  };

  const submitReturnedDelivery = async (orderOverride = returnedConfirmOrder) => {
    if (!orderOverride) {
      return;
    }

    const trimmedNote = returnCompletionNote.trim();
    const note = trimmedNote || "Đơn hàng đã hoàn về kho/người bán";

    setActionLoading(`${orderOverride.id}:return`);
    setError("");
    setNotice("");
    try {
      const updated = await deliveryService.updateDeliveryStatus(orderOverride.id, {
        status: "RETURNED",
        note,
        returnNote: note,
        trackingNumber: getGhnTrackingCode(orderOverride),
        ghnOrderCode: orderOverride.ghnOrderCode,
      });
      updateOrderInState(updated);
      await loadOrders();
      setNotice(`Đã cập nhật đơn #${orderOverride.id} sang trạng thái đã hoàn.`);
      toast.success(t("Đã cập nhật đơn hàng sang trạng thái đã hoàn."));
      setReturnedConfirmOrder(null);
      setReturnCompletionNote("");
    } catch (err) {
      const message = getErrorMessage(err, "Không thể cập nhật trạng thái đã hoàn. Vui lòng thử lại.");
      setError(message);
      toast.error(t(message));
    } finally {
      setActionLoading("");
    }
  };

  function openSettlementConfirm() {
    if (stats.totalCod <= 0) {
      toast.error(t("Không có số dư COD để chốt ca nộp tiền!"));
      return;
    }
    setSettlementConfirmOpen(true);
  }

  const simulateSettlement = () => {
    setSettlementConfirmOpen(false);
    setSettlementStatus("Đang chờ kế toán xác nhận");
    setNotice("Gửi yêu cầu chốt ca nộp tiền thành công! Đang chờ kế toán xác nhận.");
    toast.success(t("Gửi yêu cầu chốt ca nộp tiền thành công! Đang chờ kế toán xác nhận."));
  };

  async function submitStatusUpdate() {
    if (!selectedOrder) {
      return;
    }

    if (statusDraft === "delivered") {
      await submitDeliverySuccess();
      return;
    }

    if (statusDraft === "failed_delivery_attempt") {
      await submitDeliveryFailure(failedReason);
      return;
    }

    if (statusDraft === "returning") {
      await submitReturnDelivery();
      return;
    }

    setActionLoading(`${selectedOrder.id}:status`);
    setError("");
    setNotice("");
    try {
      const note =
        statusDraft === "redelivery_requested"
          ? verificationNote.trim() || "Tạo lại lượt giao cho đơn hàng"
          : verificationNote;
      const updated = await deliveryService.updateDeliveryStatus(selectedOrder.id, {
        status: statusDraft === "redelivery_requested" ? "REDELIVERY_REQUESTED" : statusDraft,
        note,
        trackingNumber: getGhnTrackingCode(selectedOrder),
        ghnOrderCode: selectedOrder.ghnOrderCode,
      });
      updateOrderInState(updated);
      await loadOrders();
      setNotice(`Đã cập nhật trạng thái giao hàng đơn #${selectedOrder.id}.`);
      toast.success(t("Cập nhật trạng thái giao hàng thành công."));
      resetOrderModalState();
    } catch (err) {
      const message = getErrorMessage(err, "Không thể cập nhật trạng thái giao hàng. Vui lòng thử lại.");
      setError(message);
      toast.error(t(message));
    } finally {
      setActionLoading("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f4f6] pb-28 text-slate-900 md:pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-emerald-600 text-white shadow-md">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition" title="Trở lại trang mua hàng">
            <Truck className="size-6" />
            <h1 className="text-lg font-black tracking-tight">AgriMarket - Shipper</h1>
          </Link>
          {authStatus === "authenticated" && (
            <button
              onClick={handleLogout}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold transition hover:bg-emerald-800"
            >
              Đăng xuất
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-7xl p-4 pb-8 md:p-6 lg:px-8">
        {authStatus === "checking" ? (
          <div className="flex flex-col items-center justify-center py-20 text-emerald-700">
            <Loader2 className="size-10 animate-spin" />
            <p className="mt-4 font-bold">Đang tải phiên làm việc...</p>
          </div>
        ) : authStatus === "unauthenticated" ? (
          /* Login Form */
          <div className="rounded-2xl bg-white p-6 shadow-xl relative">
            <div className="absolute right-4 top-4">
              <button
                type="button"
                onClick={() => setShowRoleDropdown((prev) => !prev)}
                className="flex size-9 items-center justify-center rounded-[8px] bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition border border-slate-100"
                title="Chọn vai trò đăng nhập"
              >
                <UserCheck className="size-4" />
              </button>
              
              {showRoleDropdown && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-40 rounded-[8px] border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-800 rounded-[6px] transition"
                  >
                    Khách hàng
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-xs font-bold bg-slate-50 text-emerald-800 rounded-[6px]"
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

            <div className="mb-6 text-center">
              <span className="inline-block rounded-full bg-emerald-50 p-3 text-emerald-600">
                <Truck className="size-8" />
              </span>
              <h2 className="mt-2 text-2xl font-black text-slate-800">Shipper Đăng Nhập</h2>
              <p className="text-sm text-slate-500">Khu vực kiểm soát và giao nhận đơn hàng</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="del-email">Email tài khoản</Label>
                <Input
                  id="del-email"
                  type="email"
                  placeholder="shipper@example.com"
                  value={loginForm.email}
                  onChange={(e) => updateLoginForm("email", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="del-password">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="del-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mật khẩu của bạn"
                    value={loginForm.password}
                    onChange={(e) => updateLoginForm("password", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                />
                Duy trì đăng nhập
              </label>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loggingIn} className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 font-bold text-white rounded-xl">
                {loggingIn ? <Loader2 className="size-5 animate-spin" /> : "Đăng Nhập Ngay"}
              </Button>
            </form>
          </div>
        ) : (
          /* Logged In Content */
          <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)] md:items-start">
            <aside className="hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:block md:sticky md:top-20">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  {profileForm.avatar ? (
                    <img
                      src={getAssetUrl(profileForm.avatar)}
                      alt="Ảnh đại diện"
                      className="size-full object-cover"
                      onError={setImageFallback}
                    />
                  ) : (
                    <span className="text-base font-black">{getInitial(currentUser)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">
                    {currentUser?.name || "Tài xế AgriMarket"}
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {currentUser?.email}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-emerald-50 p-2">
                  <p className="text-lg font-black text-emerald-700">{stats.ready}</p>
                  <p className="text-[10px] font-bold text-emerald-800">Chờ</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-2">
                  <p className="text-lg font-black text-blue-700">{stats.delivering}</p>
                  <p className="text-[10px] font-bold text-blue-800">Giao</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2">
                  <p className="text-lg font-black text-amber-700">{stats.delivered}</p>
                  <p className="text-[10px] font-bold text-amber-800">Xong</p>
                </div>
              </div>

              <nav className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab("shift"); resetOrderModalState(); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-black transition ${
                    activeTab === "shift"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <UserCheck className="size-4" />
                  Nhận ca
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("orders"); resetOrderModalState(); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-black transition ${
                    activeTab === "orders"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <Truck className="size-4" />
                  Đơn hàng
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("settlement"); resetOrderModalState(); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-black transition ${
                    activeTab === "settlement"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <Wallet className="size-4" />
                  Đối soát
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("settings"); resetOrderModalState(); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-black transition ${
                    activeTab === "settings"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <Settings className="size-4" />
                  Cài đặt
                </button>
              </nav>
            </aside>

            <div className="min-w-0 space-y-4">
            {/* Notices */}
            {(notice || error) && (
              <div
                onClick={() => {
                  setNotice("");
                  setError("");
                }}
                className={`flex items-start gap-2 rounded-xl border p-4 text-sm font-semibold shadow-sm cursor-pointer ${
                  error ? "border-red-100 bg-red-50 text-red-700" : "border-emerald-100 bg-emerald-50 text-emerald-800"
                }`}
              >
                <AlertCircle className="size-5 shrink-0" />
                <p className="flex-1">{error || notice}</p>
                <X className="size-4 opacity-60" />
              </div>
            )}

            {/* TAB 1: NHẬN CA (Shift & Assignment) */}
            {activeTab === "shift" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-5 shadow-sm sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
                        {t("Order Management Shift")}
                      </p>
                      <h2 className="mt-2 text-[28px] font-black leading-tight text-slate-950 sm:text-3xl">
                        {t("Nhận ca quản lý đơn hàng")}
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                        {t("Nhận bàn giao, theo dõi và xử lý các đơn hàng trong ca làm việc.")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={loadOrders}
                      variant="outline"
                      className="h-12 w-full shrink-0 rounded-xl border-emerald-100 bg-white px-4 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50 sm:w-auto"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                      {t("Làm mới")}
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <UserCheck className="size-6" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          {t("Trạng thái ca quản lý đơn hàng")}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-black ${currentShiftMeta.className}`}>
                            {t(currentShiftMeta.label)}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {t("Vai trò")}: {t("Nhân viên quản lý đơn hàng")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        onClick={handleShiftAction}
                        className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700"
                      >
                        {t(currentShiftMeta.actionLabel)}
                      </Button>
                      <Button
                        type="button"
                        onClick={loadOrders}
                        variant="outline"
                        className="h-11 rounded-xl border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        {t("Làm mới")}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "Nhân viên", value: currentUser?.name || currentUser?.email || "--" },
                      { label: "Email", value: currentUser?.email || "--" },
                      { label: "Thời gian bắt đầu ca", value: shiftStartedAt ? formatDate(shiftStartedAt) : "--" },
                      { label: "Cập nhật cuối", value: shiftUpdatedAt ? formatDate(shiftUpdatedAt) : formatDate(new Date().toISOString()) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs font-black uppercase text-slate-500">{t(item.label)}</p>
                        <p className="mt-1 break-words text-sm font-bold text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Tổng đơn trong ca", value: formatNumber(shiftStats.totalOrders), icon: PackageCheck, color: "text-slate-900", bg: "bg-slate-50" },
                    { label: "Chờ xác nhận", value: formatNumber(shiftStats.waitingConfirm), icon: Clock3, color: "text-amber-700", bg: "bg-amber-50" },
                    { label: "Chờ tạo vận đơn GHN", value: formatNumber(shiftStats.waitingGhn), icon: AlertCircle, color: "text-amber-700", bg: "bg-amber-50" },
                    { label: "Đã tạo vận đơn GHN", value: formatNumber(shiftStats.createdGhn), icon: PackageCheck, color: "text-emerald-700", bg: "bg-emerald-50" },
                    { label: "GHN đang giao", value: formatNumber(shiftStats.delivering), icon: Truck, color: "text-blue-700", bg: "bg-blue-50" },
                    { label: "Đã giao", value: formatNumber(shiftStats.delivered), icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
                    { label: "Giao thất bại", value: formatNumber(shiftStats.failed), icon: AlertCircle, color: "text-red-700", bg: "bg-red-50" },
                    { label: "Cần xử lý", value: formatNumber(shiftStats.needAction), icon: ShieldCheck, color: "text-orange-700", bg: "bg-orange-50" },
                    { label: "Tổng COD", value: formatCurrency(shiftStats.totalCod), icon: Wallet, color: "text-red-700", bg: "bg-red-50", money: true },
                    { label: "Tổng phí ship", value: formatCurrency(shiftStats.totalShippingFee), icon: CircleDollarSign, color: "text-emerald-700", bg: "bg-emerald-50", money: true },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="min-h-[112px] rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="flex h-full items-center gap-4">
                          <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                            <Icon className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-black uppercase leading-5 text-slate-500">{t(item.label)}</p>
                            <p className={`mt-2 break-words font-black leading-tight ${item.money ? "text-xl sm:text-[21px]" : "text-2xl"} ${item.color}`}>
                              {item.value}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                          {t("Bàn giao đầu ca")}
                        </p>
                        <h3 className="mt-1 text-lg font-black text-slate-900">
                          {t("Bàn giao đầu ca")}
                        </h3>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                        {Object.values(checkedShiftItems).filter(Boolean).length}/{SHIFT_CHECKLIST_ITEMS.length}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {SHIFT_CHECKLIST_ITEMS.map((item) => (
                        <label
                          key={item.id}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-emerald-100 hover:bg-emerald-50/40"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(checkedShiftItems[item.id])}
                            onChange={() => toggleShiftChecklistItem(item.id)}
                            className="mt-1 size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black text-slate-900">
                              {t(item.title)} - {formatNumber(shiftStats[item.countKey] || 0)} {t("đơn")}
                            </span>
                            <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">
                              {t(item.description)}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <AlertCircle className="size-5" />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                          {t("Cảnh báo cần xử lý")}
                        </p>
                        <h3 className="mt-1 text-lg font-black text-slate-900">
                          {t("Cảnh báo cần xử lý")}
                        </h3>
                      </div>
                    </div>

                    {shiftWarnings.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {shiftWarnings.map((warning) => (
                          <div
                            key={warning.id}
                            className={`rounded-xl border p-4 ${
                              warning.tone === "red"
                                ? "border-red-100 bg-red-50 text-red-800"
                                : warning.tone === "slate"
                                  ? "border-slate-200 bg-slate-50 text-slate-700"
                                  : "border-amber-100 bg-amber-50 text-amber-800"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black">{t(warning.title)}</p>
                                <p className="mt-1 text-xs font-medium leading-5 opacity-80">{t(warning.description)}</p>
                              </div>
                              <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-black">
                                {formatNumber(warning.count)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-center text-emerald-800">
                        <CheckCircle2 className="mx-auto size-8" />
                        <p className="mt-2 text-sm font-black">
                          {t("Không có cảnh báo trong ca hiện tại")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GHN SHIPPING ORDER MANAGEMENT */}
            {activeTab === "orders" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-5 shadow-sm sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
                        {t("Order Management & Delivery")}
                      </p>
                      <h2 className="mt-2 text-[28px] font-black leading-tight text-slate-950 sm:text-3xl">
                        {t("Quản lý & Giao hàng")}
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                        {t("Theo dõi vận đơn GHN, quản lý COD và thao tác giao hàng cho các đơn được phân công.")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={loadOrders}
                      variant="outline"
                      className="h-12 w-full shrink-0 rounded-xl border-emerald-100 bg-white px-4 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50 sm:w-auto"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                      {t("Làm mới")}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Tổng đơn", value: formatNumber(stats.total), icon: PackageCheck, color: "text-slate-900", bg: "bg-slate-50", money: false },
                    { label: "Chờ lấy hàng", value: formatNumber(stats.waiting), icon: Clock3, color: "text-amber-700", bg: "bg-amber-50", money: false },
                    { label: "Đang giao", value: formatNumber(stats.delivering), icon: Truck, color: "text-blue-700", bg: "bg-blue-50", money: false },
                    { label: "Đã giao", value: formatNumber(stats.delivered), icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", money: false },
                    { label: "Giao thất bại", value: formatNumber(stats.failed), icon: AlertCircle, color: "text-red-700", bg: "bg-red-50", money: false },
                    { label: "Đã hoàn", value: formatNumber(stats.returned), icon: RefreshCw, color: "text-orange-700", bg: "bg-orange-50", money: false },
                    { label: "Đã hủy", value: formatNumber(stats.cancelled), icon: X, color: "text-slate-600", bg: "bg-slate-100", money: false },
                    { label: "Tổng COD", value: formatCurrency(stats.totalCod), icon: Wallet, color: "text-red-700", bg: "bg-red-50", money: true },
                    { label: "Tổng phí ship", value: formatCurrency(stats.totalShippingFee), icon: CircleDollarSign, color: "text-emerald-700", bg: "bg-emerald-50", money: true },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="min-h-[112px] rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex h-full items-center gap-4">
                          <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                            <Icon className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-black uppercase leading-5 text-slate-500">
                              {t(item.label)}
                            </p>
                            <p className={`mt-2 break-words font-black leading-tight ${item.money ? "text-xl sm:text-[21px]" : "text-2xl"} ${item.color}`}>
                              {item.value}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t("Tìm theo mã đơn, mã vận đơn GHN, tên khách, số điện thoại, địa chỉ...")}
                        className="h-11 rounded-xl border-slate-200 bg-white pl-10 pr-10 text-sm font-medium"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label="Xóa tìm kiếm"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:justify-end lg:overflow-visible lg:pb-0">
                      {ORDER_FILTERS.map((filter) => (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() => setOrderFilter(filter.value)}
                          className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition ${
                            orderFilter === filter.value
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Order List */}
                {loading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                          <div className="h-6 w-28 animate-pulse rounded-full bg-slate-100" />
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                          <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                        </div>
                        <div className="mt-4 h-10 animate-pulse rounded-xl bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : ordersError ? (
                  <div className="rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
                    <AlertCircle className="mx-auto size-10 text-red-500" />
                    <p className="mt-3 text-sm font-black text-slate-800">{t("Không tải được danh sách đơn hàng. Vui lòng thử lại.")}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{ordersError}</p>
                    <Button
                      type="button"
                      onClick={loadOrders}
                      className="mt-4 h-10 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      <RefreshCw className="size-4" />
                      {t("Thử lại")}
                    </Button>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-slate-100 text-center text-slate-400">
                    <PackageCheck className="size-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-black text-slate-700">
                      {getEmptyOrdersTitle(orderFilter, orders.length > 0)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {getEmptyOrdersDescription(orderFilter, orders.length > 0)}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {filteredOrders.map((order) => {
                    const statusMeta = getStatusMeta(order);
                    const trackingCode = getGhnTrackingCode(order);
                    const phone = getCustomerPhone(order);
                    const address = getShippingAddress(order);
                    const history = getOrderHistory(order);
                    const canShowTracking = Boolean(trackingCode || history.length);
                    const lastUpdatedAt = getLastStatusUpdatedAt(order);
                    const isCompleting = actionLoading === `${order.id}:complete`;
                    const isStarting = actionLoading === `${order.id}:transit`;
                    const isReturningCompleted = actionLoading === `${order.id}:return`;

                    return (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <p className="font-mono text-sm font-black text-slate-900">{getOrderInternalCode(order)}</p>
                            <p className="mt-1 text-xs font-bold text-emerald-700">
                              {t("Mã vận đơn GHN")}: {trackingCode || t("Chưa có mã GHN")}
                            </p>
                            {getGhnStatus(order) && (
                              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                {t("Trạng thái GHN")}: {getStatusLabel(getGhnStatus(order))}
                              </p>
                            )}
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${statusMeta.className}`}>
                            {t(statusMeta.label)}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm">
                          <div className="flex items-start gap-2">
                            <User className="mt-0.5 size-4 shrink-0 text-slate-400" />
                            <div>
                              <p className="font-black text-slate-800">{getCustomerName(order)}</p>
                              {phone && <p className="text-xs font-semibold text-slate-500">{phone}</p>}
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                            <p className="line-clamp-2 text-xs leading-5 text-slate-600">{address}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Clock3 className="mt-0.5 size-4 shrink-0 text-slate-400" />
                            <p className="text-xs font-semibold text-slate-500">
                              {lastUpdatedAt ? formatDate(lastUpdatedAt) : t("Chưa cập nhật")}
                            </p>
                          </div>
                          {getOrderStatusGroup(order) === "failed" && order.deliveryFailureReason && (
                            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                              {t("Lý do thất bại")}: {order.deliveryFailureReason}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-red-50 p-3 text-red-700">
                            <p className="font-black uppercase">COD</p>
                            <p className="mt-1 text-sm font-black">{formatCurrency(getOrderCodAmount(order))}</p>
                          </div>
                          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                            <p className="font-black uppercase">Phí ship</p>
                            <p className="mt-1 text-sm font-black">{formatCurrency(getOrderShippingFee(order))}</p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              onClick={() => { setSelectedOrder(order); setVerifyMode(null); }}
                              className="h-9 rounded-xl bg-slate-900 px-3 text-xs font-black text-white hover:bg-slate-800"
                            >
                              {t("Xem chi tiết")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => { setSelectedOrder(order); setVerifyMode(null); }}
                              disabled={!canShowTracking}
                              className="h-9 rounded-xl border-emerald-100 bg-white px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                              title={!canShowTracking ? t("Chưa có lịch sử trạng thái") : undefined}
                            >
                              {t("Xem hành trình")}
                            </Button>
                            {canConfirmReturned(order) && (
                              <Button
                                type="button"
                                onClick={() => openReturnedConfirm(order)}
                                disabled={isReturningCompleted}
                                className="h-9 rounded-xl bg-purple-600 px-3 text-xs font-black text-white hover:bg-purple-700"
                              >
                                {isReturningCompleted ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <PackageCheck className="size-3.5" />
                                )}
                                {t("Xác nhận đã hoàn")}
                              </Button>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {phone && (
                              <a
                                href={`tel:${phone}`}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200"
                              >
                                <Phone className="size-3.5" /> {t("Gọi khách")}
                              </a>
                            )}
                            {phone && (
                              <a
                                href={`sms:${phone}`}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200"
                              >
                                <MessageSquare className="size-3.5" /> {t("Nhắn tin")}
                              </a>
                            )}
                            {address && address !== "Chưa có địa chỉ" && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200"
                              >
                                <Navigation className="size-3.5" /> {t("Mở chỉ đường")}
                              </a>
                            )}
                          </div>

                          {(canStartDelivery(order) || canCompleteDelivery(order) || canReportFailedDelivery(order)) && (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                onClick={() => openStatusUpdateModal(order)}
                                disabled={isStarting || isCompleting || isReturningCompleted}
                                className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700"
                              >
                                {isStarting || isCompleting ? <Loader2 className="size-3.5 animate-spin" /> : <Truck className="size-3.5" />}
                                {t("Cập nhật trạng thái")}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ĐỐI SOÁT & KẾT CA (Settlement) */}
            {activeTab === "settlement" && (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
                {/* Wallet Balance & Settlement card */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Wallet className="size-5 text-emerald-600" />
                    <h3 className="text-base font-bold">Ví Tiền Mặt COD</h3>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tiền mặt cần nộp về công ty</p>
                    <p className="text-3xl font-black text-red-600 mt-1">{formatCurrency(stats.totalCod)}</p>
                    {settlementStatus && (
                      <p className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase text-amber-700 ring-1 ring-amber-100">
                        {settlementStatus}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex justify-between text-xs py-2 border-b border-slate-50 text-slate-600">
                      <span>Đơn giao thành công (COD)</span>
                      <span className="font-bold text-slate-800">{stats.codDelivered} đơn</span>
                    </div>
                    <div className="flex justify-between text-xs py-2 border-b border-slate-50 text-slate-600">
                      <span>Đơn giao thành công (Online)</span>
                      <span className="font-bold text-slate-800">{stats.onlineDelivered} đơn</span>
                    </div>
                    <div className="flex justify-between text-xs py-2 text-slate-600">
                      <span>Tổng đơn hàng giao thành công</span>
                      <span className="font-bold text-emerald-700">{stats.delivered} đơn</span>
                    </div>
                  </div>

                  <Button
                    onClick={openSettlementConfirm}
                    className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700 h-11 text-white font-bold rounded-xl"
                  >
                    Chốt Ca & Nộp Tiền COD
                  </Button>
                </div>

                {/* Simulated Settlement QR Code */}
                {stats.totalCod > 0 && (
                  <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 text-center">
                    <p className="text-sm font-bold text-slate-800">Chuyển khoản nhanh qua QR</p>
                    <p className="text-xs text-slate-500 mt-1">Quét mã để chuyển khoản nhanh số tiền COD hôm nay</p>
                    <div className="mx-auto mt-4 flex size-44 items-center justify-center bg-slate-50 rounded-xl border border-slate-100 p-2">
                      {/* Placeholder QR */}
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <QrCode className="size-20" />
                        <span className="text-[10px] font-bold mt-1 text-slate-500">VIETQR - AGRIMARKET</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: CÀI ĐẶT HỒ SƠ */}
            {activeTab === "settings" && (
              <div className="space-y-4 pb-10">
                {/* Profile Card & Info */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-600 text-xl font-black text-white shadow-sm">
                    {profileForm.avatar ? (
                      <span
                        className="size-full bg-cover bg-center"
                        style={{ backgroundImage: `url("${getAssetUrl(profileForm.avatar)}")` }}
                      />
                    ) : (
                      (profileForm.name || currentUser?.email || "S").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase text-emerald-700">Tài khoản Shipper</p>
                    <h3 className="text-lg font-black text-slate-800 truncate">{profileForm.name || "Shipper"}</h3>
                    <p className="text-xs font-semibold text-slate-500 truncate">{currentUser?.email}</p>
                  </div>
                </div>

                {/* Edit Profile Form */}
                <form onSubmit={handleSaveProfile} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                      <UserRound className="size-4 text-emerald-600" />
                      Thông tin cá nhân
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="shipper-name">Họ tên shipper</Label>
                      <Input
                        id="shipper-name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Họ tên của bạn"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="shipper-phone">Số điện thoại</Label>
                      <Input
                        id="shipper-phone"
                        type="tel"
                        value={profileForm.phoneNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProfileForm(p => ({ ...p, phoneNumber: val }));
                          setPhoneError(getVietnamPhoneError(val));
                        }}
                        className={phoneError ? "border-red-500" : ""}
                        placeholder="Ví dụ: 0999999999"
                      />
                      {phoneError && (
                        <p className="text-xs font-semibold text-red-600">{phoneError}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="shipper-avatar">Ảnh đại diện</Label>
                      <AvatarUploadField
                        id="shipper-avatar"
                        value={profileForm.avatar}
                        disabled={savingProfile}
                        uploading={uploadingAvatar}
                        onChange={(val) => setProfileForm(p => ({ ...p, avatar: val }))}
                        onUpload={handleAvatarFile}
                        onRemove={handleAvatarRemove}
                        onUploadStart={() => setUploadingAvatar(true)}
                        onUploadEnd={() => setUploadingAvatar(false)}
                        onUploadSuccess={(msg) => toast.success(msg)}
                        onUploadError={(msg) => toast.error(msg)}
                      />
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-3 mt-1">
                      <h4 className="text-xs font-black uppercase text-slate-500">Địa chỉ liên hệ</h4>
                      <VietnamAddressFields
                        value={addressForm}
                        onChange={setAddressForm}
                        idPrefix="shipper-addr"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl mt-2"
                    disabled={savingProfile || uploadingAvatar}
                  >
                    {savingProfile ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Lưu Thay Đổi"}
                  </Button>
                </form>

                {/* Change Password Form */}
                <form onSubmit={handleChangePassword} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                      <KeyRound className="size-4 text-emerald-600" />
                      Đổi mật khẩu
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="del-curr-pass">Mật khẩu hiện tại</Label>
                      <Input
                        id="del-curr-pass"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                        placeholder="Nhập mật khẩu cũ"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="del-new-pass">Mật khẩu mới</Label>
                      <Input
                        id="del-new-pass"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                        placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                        minLength={6}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="del-conf-pass">Xác nhận mật khẩu</Label>
                      <Input
                        id="del-conf-pass"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        placeholder="Nhập lại mật khẩu mới"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 rounded-xl mt-2"
                    disabled={savingPassword}
                  >
                    {savingPassword ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Cập Nhật Mật Khẩu"}
                  </Button>
                </form>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tab Bar for Mobile Devices */}
      {authStatus === "authenticated" && (
        <nav className="fixed bottom-0 inset-x-0 z-40 mx-auto flex h-16 w-full max-w-[480px] items-center border-t border-slate-200 bg-white shadow-lg md:hidden">
          <button
            onClick={() => { setActiveTab("shift"); resetOrderModalState(); }}
            className={`flex-1 flex flex-col items-center justify-center h-full transition ${
              activeTab === "shift" ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <UserCheck className="size-5" />
            <span className="text-[10px] font-black mt-1">Nhận ca</span>
          </button>
          <button
            onClick={() => { setActiveTab("orders"); resetOrderModalState(); }}
            className={`flex-1 flex flex-col items-center justify-center h-full transition ${
              activeTab === "orders" ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Truck className="size-5" />
            <span className="text-[10px] font-black mt-1">Đơn hàng</span>
          </button>
          <button
            onClick={() => { setActiveTab("settlement"); resetOrderModalState(); }}
            className={`flex-1 flex flex-col items-center justify-center h-full transition ${
              activeTab === "settlement" ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Wallet className="size-5" />
            <span className="text-[10px] font-black mt-1">Đối soát</span>
          </button>
          <button
            onClick={() => { setActiveTab("settings"); setSelectedOrder(null); setVerifyMode(null); }}
            className={`flex-1 flex flex-col items-center justify-center h-full transition ${
              activeTab === "settings" ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Settings className="size-5" />
            <span className="text-[10px] font-black mt-1">Cài đặt</span>
          </button>
        </nav>
      )}

      {settlementConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm md:items-center md:p-4">
          <div className="w-full max-w-[480px] rounded-t-3xl bg-white p-5 shadow-2xl md:max-w-md md:rounded-3xl">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Wallet className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Xác nhận chốt ca</h3>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                  Bạn xác nhận đã nộp số tiền COD về công ty?
                </p>
                <p className="mt-2 text-xl font-black text-red-600">
                  {formatCurrency(stats.totalCod)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-700"
                onClick={() => setSettlementConfirmOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                onClick={simulateSettlement}
              >
                Xác nhận chốt ca
              </Button>
            </div>
          </div>
        </div>
      )}

      {deliveredConfirmOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm md:items-center md:p-4">
          <div className="w-full max-w-[480px] rounded-t-3xl bg-white p-5 shadow-2xl md:max-w-md md:rounded-3xl">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {t("Xác nhận đơn hàng đã giao thành công?")}
                </h3>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                  {getOrderInternalCode(deliveredConfirmOrder)} - {getCustomerName(deliveredConfirmOrder)}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-700">
                  COD: <span className="text-red-600">{formatCurrency(getOrderCodAmount(deliveredConfirmOrder))}</span>
                </p>
                {getOrderCodAmount(deliveredConfirmOrder) > 0 && (
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    Vui lòng kiểm tra tiền thu trước khi xác nhận.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-700"
                onClick={() => setDeliveredConfirmOrder(null)}
              >
                {t("Hủy")}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                disabled={actionLoading === `${deliveredConfirmOrder.id}:complete`}
                onClick={() => submitDeliverySuccess(deliveredConfirmOrder)}
              >
                {actionLoading === `${deliveredConfirmOrder.id}:complete` ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t("Xác nhận đã giao")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {returnedConfirmOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm md:items-center md:p-4">
          <div className="w-full max-w-[560px] rounded-t-3xl bg-white p-5 shadow-2xl md:rounded-3xl">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <PackageCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {t("Xác nhận đã hoàn hàng")}
                </h3>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                  {t("Bạn có chắc chắn đơn hàng này đã được hoàn về kho/người bán không?")}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm">
              {[
                ["Mã đơn", getOrderInternalCode(returnedConfirmOrder)],
                ["Mã vận đơn GHN", getGhnTrackingCode(returnedConfirmOrder) || "Chưa có mã GHN"],
                ["Khách hàng", getCustomerName(returnedConfirmOrder)],
                ["Số điện thoại", getCustomerPhone(returnedConfirmOrder) || "Chưa có số điện thoại"],
                ["Địa chỉ", getShippingAddress(returnedConfirmOrder)],
                ["COD", formatCurrency(getOrderCodAmount(returnedConfirmOrder))],
                ["Phí ship", formatCurrency(getOrderShippingFee(returnedConfirmOrder))],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-xs font-bold text-slate-500">{t(label)}</span>
                  <span className="min-w-0 break-words text-right text-xs font-black text-slate-800">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1.5">
              <Label htmlFor="return-completion-note">
                {t("Ghi chú hoàn hàng")}
              </Label>
              <Textarea
                id="return-completion-note"
                value={returnCompletionNote}
                onChange={(event) => setReturnCompletionNote(event.target.value)}
                placeholder={t("Ví dụ: Hàng đã hoàn về kho, nhân viên kho đã nhận...")}
                className="min-h-[96px] rounded-2xl border-slate-200 text-sm"
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-700"
                onClick={() => {
                  setReturnedConfirmOrder(null);
                  setReturnCompletionNote("");
                }}
              >
                {t("Hủy")}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl bg-purple-600 font-black text-white hover:bg-purple-700"
                disabled={actionLoading === `${returnedConfirmOrder.id}:return`}
                onClick={() => submitReturnedDelivery(returnedConfirmOrder)}
              >
                {actionLoading === `${returnedConfirmOrder.id}:return` ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t("Xác nhận đã hoàn")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Order Fullscreen Detail & Action Modal (Draw style for mobile) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end p-0 md:items-center md:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl md:max-w-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-slate-800">
                    Chi tiết đơn hàng {getOrderInternalCode(selectedOrder)}
                  </h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(getOrderCode(selectedOrder));
                      toast.success("Đã sao chép mã đơn hàng!");
                    }}
                    className="flex size-5 items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-250 hover:text-slate-700 transition"
                    title="Sao chép mã đơn hàng"
                  >
                    <Copy className="size-3" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  GHN: {getGhnTrackingCode(selectedOrder) || "Chưa có mã GHN"}
                </p>
              </div>
              <button
                onClick={resetOrderModalState}
                className="size-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {verifyMode === null ? (
                /* Mode 1: View GHN shipping order detail */
                <>
                  {/* Status Indicator banner */}
                  <div className={`p-3 rounded-xl flex items-center gap-2 border ${getStatusMeta(selectedOrder).className}`}>
                    <Clock3 className="size-5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold">Trạng thái GHN: {getStatusMeta(selectedOrder).label}</p>
                      <p className="mt-0.5 opacity-90">
                        {getDisplayShippingStatus(selectedOrder)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">Thông tin đơn hàng</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Mã đơn</span>
                          <span className="font-black text-slate-900">{getOrderInternalCode(selectedOrder)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Mã vận đơn GHN</span>
                          <span className="font-black text-emerald-700">{getGhnTrackingCode(selectedOrder) || "Chưa có mã GHN"}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Trạng thái hệ thống</span>
                          <span className="font-bold text-slate-900">{getStatusLabel(selectedOrder.status)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Cập nhật cuối</span>
                          <span className="font-bold text-slate-900">
                            {getLastStatusUpdatedAt(selectedOrder) ? formatDate(getLastStatusUpdatedAt(selectedOrder)) : "Chưa cập nhật"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">Thông tin vận chuyển GHN</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Đơn vị vận chuyển</span>
                          <span className="font-bold text-slate-900">{selectedOrder.shippingProvider || "GHN"}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Trạng thái GHN</span>
                          <span className="font-bold text-slate-900">{getStatusLabel(getGhnStatus(selectedOrder))}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Phí ship</span>
                          <span className="font-black text-emerald-700">{formatCurrency(getOrderShippingFee(selectedOrder))}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">COD</span>
                          <span className="font-black text-red-600">{formatCurrency(getOrderCodAmount(selectedOrder))}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info Card */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Thông tin khách hàng</p>
                    
                    <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                      <div>
                        <p className="text-sm font-black text-slate-800">{getCustomerName(selectedOrder)}</p>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">{getCustomerPhone(selectedOrder)}</p>
                      </div>
                      <a
                        href={`tel:${getCustomerPhone(selectedOrder)}`}
                        aria-label="Gọi khách hàng"
                        className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 active:bg-emerald-100 border border-emerald-100"
                      >
                        <Phone className="size-4" />
                      </a>
                    </div>

                    <div className="text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-2.5">
                      <span className="font-bold text-slate-700 block mb-0.5">Địa chỉ giao:</span>
                      {getShippingAddress(selectedOrder)}
                    </div>
                    {getShippingAddress(selectedOrder) !== "Chưa có địa chỉ" && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getShippingAddress(selectedOrder))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                      >
                        <Navigation className="size-3.5" /> Mở chỉ đường
                      </a>
                    )}
                  </div>

                  {/* Payment Summary */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Thông tin thanh toán</p>
                    <div className="flex justify-between items-center gap-3 text-sm">
                      <span className="text-slate-600">Phương thức thanh toán</span>
                      <span className="text-right font-bold text-slate-800">
                        {getPaymentMethodLabel(selectedOrder)}
                      </span>
                    </div>
                    <div className="space-y-2 border-t border-slate-200/60 pt-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-600">Tổng sản phẩm</span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(getOrderSubtotal(selectedOrder))}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-600">Phí ship</span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(getOrderShippingFee(selectedOrder))}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-600">Giảm giá</span>
                        <span className="font-bold text-emerald-700">
                          -{formatCurrency(getOrderDiscount(selectedOrder))}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 border-t border-slate-200/60 pt-2">
                        <span className="font-black text-slate-800">Tổng tiền</span>
                        <span className="text-base font-black text-slate-950">
                          {formatCurrency(getOrderTotal(selectedOrder))}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-600">Tổng tiền thu hộ (COD):</span>
                        <span className="font-black text-red-600">
                          {isCashPayment(selectedOrder) ? formatCurrency(getOrderTotal(selectedOrder)) : "0 đ"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Product List */}
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Danh sách sản phẩm</p>
                    <div className="rounded-xl border border-slate-100 overflow-hidden text-xs">
                      <div className="bg-slate-50 px-3 py-2 font-bold grid grid-cols-[1fr_2.5rem_5.5rem] text-slate-600 border-b border-slate-100">
                        <span>Tên sản phẩm</span>
                        <span className="text-center">SL</span>
                        <span className="text-right">Thành tiền</span>
                      </div>
                      {(selectedOrder.items || []).map((item) => (
                        <div key={item.id} className="bg-white px-3 py-2.5 grid grid-cols-[1fr_2.5rem_5.5rem] text-slate-700 border-b border-slate-50 last:border-0">
                          <span className="font-medium truncate">{item.productName}</span>
                          <span className="text-center font-bold text-slate-900">{item.quantity}</span>
                          <span className="text-right font-semibold">
                            {formatCurrency(item.lineTotal ?? Number(item.price || 0) * Number(item.quantity || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Lịch sử trạng thái</p>
                    {getOrderHistory(selectedOrder).length > 0 ? (
                      <div className="space-y-3">
                        {getOrderHistory(selectedOrder).map((historyItem) => (
                          <div key={historyItem.id || `${historyItem.status}-${historyItem.createdAt}`} className="border-l-2 border-emerald-200 pl-3">
                            <p className="text-sm font-black text-slate-800">
                              {getStatusLabel(historyItem.status || historyItem.shippingStatus)}
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              {historyItem.createdAt ? formatDate(historyItem.createdAt) : "Chưa có thời gian"}
                            </p>
                            {historyItem.note && (
                              <p className="mt-1 text-xs leading-5 text-slate-600">{historyItem.note}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-500">Chưa có lịch sử trạng thái</p>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Ghi chú giao hàng</p>
                    <p className="text-sm font-medium leading-relaxed text-slate-700">
                      {selectedOrder.deliveryNote || selectedOrder.note || "Không có ghi chú"}
                    </p>
                    {selectedOrder.deliveryFailureReason && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                        {selectedOrder.deliveryFailureReason}
                      </p>
                    )}
                    {(selectedOrder.returnReason || selectedOrder.returnNote) && (
                      <div className="rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700">
                        {selectedOrder.returnReason && (
                          <p>Lý do hoàn hàng: {selectedOrder.returnReason}</p>
                        )}
                        {selectedOrder.returnNote && selectedOrder.returnNote !== selectedOrder.returnReason && (
                          <p className="mt-1">Ghi chú hoàn hàng: {selectedOrder.returnNote}</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : verifyMode === "status" ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <span className="inline-flex size-12 items-center justify-center bg-emerald-50 text-emerald-600 rounded-full mb-2">
                      <Truck className="size-6" />
                    </span>
                    <h4 className="text-base font-black text-slate-800">
                      Chi tiết đơn giao {getGhnTrackingCode(selectedOrder) || getOrderInternalCode(selectedOrder)}
                    </h4>
                    <p className="text-xs text-slate-500">Cập nhật kết quả giao hàng và xác thực</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-xs font-bold text-slate-500">Trạng thái hiện tại:</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${getStatusMeta(selectedOrder).className}`}>
                      {getCurrentDeliveryStatusMeta(selectedOrder).label}
                    </span>
                  </div>

                  {selectedTerminalStatusMessage ? (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                      {selectedTerminalStatusMessage}
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {selectedStatusOptions.map((item) => (
                      <label
                        key={item.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                          statusDraft === item.value
                            ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                            : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="radio"
                          name="delivery-status"
                          value={item.value}
                          checked={statusDraft === item.value}
                          onChange={() => {
                            setStatusDraft(item.value);
                            setProofValidationMessage("");
                            if (item.value !== "failed_delivery_attempt") {
                              setFailedReason("");
                            }
                          }}
                          className="mt-0.5 size-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>
                          <span className="block font-black">{item.label}</span>
                          <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                            {item.description}
                          </span>
                        </span>
                      </label>
                      ))}
                    </div>
                  )}

                  {statusDraft === "failed_delivery_attempt" && !selectedTerminalStatusMessage && (
                    <div className="space-y-2.5">
                      <Label className="text-xs font-bold text-slate-600 block">
                        Chọn nhanh lý do
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {FAILURE_REASONS.map((item) => (
                          <button
                            type="button"
                            key={item.value}
                            onClick={() => {
                              setFailedReason(item.value);
                              setVerificationNote(item.label);
                            }}
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                              failedReason === item.value
                                ? "border-red-500 bg-red-50 text-red-700"
                                : "border-slate-100 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {statusDraft === "delivered" && !selectedTerminalStatusMessage && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600 block">
                        Ảnh minh chứng giao hàng*
                      </Label>
                      {proofImage ? (
                        <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                          <img
                            src={getAssetUrl(proofImage)}
                            alt="POD"
                            className="size-full object-cover"
                            onError={setImageFallback}
                          />
                          <button
                            type="button"
                            onClick={() => setProofImage("")}
                            className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white shadow-md hover:bg-red-700"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-emerald-500">
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            capture="environment"
                            onChange={handlePhotoUpload}
                            className="absolute inset-0 cursor-pointer opacity-0"
                            disabled={uploadingImage}
                          />
                          {uploadingImage ? (
                            <>
                              <Loader2 className="mb-2 size-8 animate-spin text-emerald-600" />
                              <p className="text-xs font-bold text-slate-600">Đang tải ảnh lên...</p>
                            </>
                          ) : (
                            <>
                              <Camera className="mb-2 size-8 text-slate-400" />
                              <p className="text-xs font-bold text-slate-600">Chụp ảnh / Chọn ảnh minh chứng</p>
                              <p className="mt-1 text-[10px] text-slate-400">JPG, JPEG, PNG, WEBP. Tối đa 5MB.</p>
                            </>
                          )}
                        </div>
                      )}
                      {proofValidationMessage && (
                        <p className="text-xs font-bold text-red-600">{proofValidationMessage}</p>
                      )}
                    </div>
                  )}

                  {!selectedTerminalStatusMessage && (
                  <div className="space-y-1.5">
                    <Label htmlFor="status-note">
                      {statusDraft === "failed_delivery_attempt"
                        ? "Lý do giao thất bại*"
                        : statusDraft === "returning"
                          ? "Ghi chú hoàn hàng*"
                          : "Ghi chú giao hàng (Không bắt buộc)"}
                    </Label>
                    <Textarea
                      id="status-note"
                      placeholder={
                        statusDraft === "failed_delivery_attempt"
                          ? "Ví dụ: Khách không nghe máy, sai địa chỉ, khách hẹn giao lại..."
                          : statusDraft === "returning"
                            ? "Nhập lý do hoặc thông tin cần lưu khi hoàn hàng..."
                            : "Nhập ghi chú ví dụ: giao cho bảo vệ, người nhận thay..."
                      }
                      value={verificationNote}
                      onChange={(e) => setVerificationNote(e.target.value)}
                      rows={3}
                      className="bg-white"
                    />
                  </div>
                  )}
                </div>
              ) : verifyMode === "success" ? (
                /* Mode 2: Verification SUCCESS form */
                <div className="space-y-4">
                  <div className="text-center">
                    <span className="inline-flex size-12 items-center justify-center bg-emerald-50 text-emerald-600 rounded-full mb-2">
                      <Check className="size-6" />
                    </span>
                    <h4 className="text-base font-bold text-slate-800">Xác Nhận Giao Thành Công</h4>
                    <p className="text-xs text-slate-500">Chụp ảnh gói hàng tại cửa & lấy chữ ký của khách</p>
                  </div>

                  {/* Proof Photo Upload (Simulated Camera upload) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600 block">Ảnh minh chứng giao hàng (POD)*</Label>
                    
                    {proofImage ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                        <img
                          src={getAssetUrl(proofImage)}
                          alt="POD"
                          className="object-cover size-full"
                          onError={setImageFallback}
                        />
                        <button
                          onClick={() => setProofImage("")}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-md hover:bg-red-700 transition"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative aspect-video rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center cursor-pointer p-4 hover:border-emerald-500 hover:bg-emerald-50/10 transition">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={uploadingImage}
                        />
                        {uploadingImage ? (
                          <>
                            <Loader2 className="size-8 animate-spin text-emerald-600 mb-2" />
                            <p className="text-xs font-bold text-slate-600">Đang tải ảnh lên...</p>
                          </>
                        ) : (
                          <>
                            <Camera className="size-8 text-slate-400 mb-2" />
                            <p className="text-xs font-bold text-slate-600">Chụp ảnh / Chọn ảnh gói hàng</p>
                            <p className="text-[10px] text-slate-400 mt-1">Ảnh thực tế tại địa điểm giao hàng</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Signature Pad */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-slate-600">Chữ ký khách nhận hàng (Ký tay trực tiếp)</Label>
                      {signatureSaved && (
                        <button
                          onClick={clearSignature}
                          className="text-[10px] text-emerald-600 font-bold hover:underline"
                        >
                          Ký lại
                        </button>
                      )}
                    </div>
                    
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleMouseUp}
                        className="w-full h-32 touch-none cursor-crosshair bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="space-y-1.5">
                    <Label htmlFor="success-note">Ghi chú giao hàng (Không bắt buộc)</Label>
                    <Textarea
                      id="success-note"
                      placeholder="Nhập ghi chú ví dụ: giao cho bảo vệ, người nhận thay..."
                      value={verificationNote}
                      onChange={(e) => setVerificationNote(e.target.value)}
                      rows={2}
                      className="bg-white"
                    />
                  </div>
                </div>
              ) : (
                /* Mode 3: Verification FAILED form */
                <div className="space-y-4">
                  <div className="text-center">
                    <span className="inline-flex size-12 items-center justify-center bg-red-50 text-red-600 rounded-full mb-2">
                      <AlertCircle className="size-6" />
                    </span>
                    <h4 className="text-base font-bold text-slate-800">{t("Báo giao hàng thất bại")}</h4>
                    <p className="text-xs text-slate-500">
                      {getOrderInternalCode(selectedOrder)} - {getCustomerName(selectedOrder)}
                    </p>
                  </div>

                  {/* Reasons Radio Select */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold text-slate-600 block">{t("Lý do thất bại")}*</Label>
                    
                    <div className="grid gap-2">
                      {FAILURE_REASONS.map((item) => (
                        <label
                          key={item.value}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-semibold cursor-pointer transition ${
                            failedReason === item.value
                              ? "border-red-500 bg-red-50/30 text-slate-900"
                              : "border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="failed-reason"
                            value={item.value}
                            checked={failedReason === item.value}
                            onChange={() => setFailedReason(item.value)}
                            className="size-4 text-red-600 focus:ring-red-500 border-slate-300"
                          />
                          {t(item.label)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="space-y-1.5">
                    <Label htmlFor="failed-note">{t("Lý do thất bại")}*</Label>
                    <Textarea
                      id="failed-note"
                      placeholder="Nhập lý do chi tiết (ví dụ: thuê bao gọi 3 cuộc lúc 10h, khách bảo đang đi công tác...)"
                      value={verificationNote}
                      onChange={(e) => setVerificationNote(e.target.value)}
                      rows={3}
                      className="bg-white border-slate-200"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
              {verifyMode === null ? (
                /* Detail actions */
                <>
                  {!selectedTerminalStatusMessage && selectedStatusOptions.length > 0 && (
                    <Button
                      type="button"
                      onClick={() => openStatusUpdateModal(selectedOrder)}
                      className="h-12 flex-1 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700"
                    >
                      <Truck className="size-4" /> Cập nhật
                    </Button>
                  )}
                  {getCustomerPhone(selectedOrder) && (
                    <a
                      href={`tel:${getCustomerPhone(selectedOrder)}`}
                      className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      <Phone className="size-4" /> Gọi khách
                    </a>
                  )}
                  {getShippingAddress(selectedOrder) !== "Chưa có địa chỉ" && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getShippingAddress(selectedOrder))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      <Navigation className="size-4" /> Chỉ đường
                    </a>
                  )}
                  <Button
                    onClick={resetOrderModalState}
                    variant="outline"
                    className="border-slate-200 bg-white text-slate-700 h-12 font-bold rounded-xl text-xs px-4"
                  >
                    Đóng
                  </Button>
                </>
              ) : (
                /* Action buttons in forms */
                <>
                  <Button
                    onClick={
                      verifyMode === "status"
                        ? submitStatusUpdate
                        : verifyMode === "success"
                          ? submitDeliverySuccess
                          : () => submitDeliveryFailure()
                    }
                    disabled={
                      actionLoading === `${selectedOrder.id}:complete` ||
                      actionLoading === `${selectedOrder.id}:fail` ||
                      actionLoading === `${selectedOrder.id}:status` ||
                      Boolean(selectedTerminalStatusMessage) ||
                      !statusDraft ||
                      uploadingImage
                    }
                    className={`flex-1 h-12 font-bold text-white rounded-xl text-sm ${
                      verifyMode === "failed" || statusDraft === "failed_delivery_attempt" || statusDraft === "returning"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {actionLoading.includes(String(selectedOrder.id)) ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {t("Đang cập nhật...")}
                      </>
                    ) : statusDraft === "failed_delivery_attempt" ? (
                      t("Xác nhận & Gửi")
                    ) : verifyMode === "success" || statusDraft === "delivered" ? (
                      t("Xác nhận & Gửi")
                    ) : (
                      t("Xác nhận & Gửi")
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setVerifyMode(null);
                      setFailedReason("");
                      setProofImage("");
                      setVerificationNote("");
                      setProofValidationMessage("");
                    }}
                    variant="outline"
                    className="border-slate-200 bg-white text-slate-700 h-12 font-bold rounded-xl text-sm px-4"
                  >
                    {t("Quay lại")}
                  </Button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
