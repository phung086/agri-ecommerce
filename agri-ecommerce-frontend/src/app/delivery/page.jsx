"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
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
  Save,
  BadgeCheck
} from "lucide-react";

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
import {
  getVietnamPhoneError,
  normalizeVietnamPhone,
} from "@/lib/profile-validation";
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

const blankProfileForm = {
  name: "",
  phoneNumber: "",
  address: "",
  avatar: "",
};

const ORDER_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "waiting", label: "Chờ giao" },
  { value: "delivering", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "failed", label: "Thất bại" },
];

const STATUS_UPDATE_OPTIONS = [
  { value: "picking_up", label: "Đang lấy hàng" },
  { value: "out_for_delivery", label: "Đang giao" },
  { value: "delivered", label: "Giao thành công" },
  { value: "failed", label: "Giao thất bại" },
  { value: "returned", label: "Hoàn hàng" },
];

const FAILURE_REASONS = [
  { value: "cannot_contact", label: "Không liên hệ được khách" },
  { value: "canceled", label: "Khách từ chối nhận hàng" },
  { value: "wrong_address", label: "Sai địa chỉ" },
  { value: "damaged", label: "Hàng bị hỏng" },
  { value: "other", label: "Lý do khác" },
];

const SUPPORTED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const SUPPORTED_AVATAR_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

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

function unwrapApiData(response) {
  return response?.data ?? response;
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function getOrderCode(order) {
  return order?.trackingNumber || `#${order?.id}`;
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

function getOrderStatusGroup(order) {
  const status = normalizeStatus(order?.status);

  if (["ready_for_delivery", "processing", "pending"].includes(status)) {
    return "waiting";
  }

  if (["out_for_delivery", "delivering", "shipping"].includes(status)) {
    return "delivering";
  }

  if (["delivered", "completed"].includes(status)) {
    return "delivered";
  }

  if (["canceled", "failed", "failed_delivery_attempt", "returned"].includes(status)) {
    return "failed";
  }

  return "all";
}

function getOrderSearchValue(order) {
  return [
    order?.id,
    order?.trackingNumber,
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

function getEmptyOrdersTitle(filter, hasAssignedOrders) {
  if (!hasAssignedOrders) {
    return "Chưa có đơn nào được phân công cho tài khoản này.";
  }

  const titles = {
    waiting: "Không có đơn chờ giao được phân công.",
    delivering: "Không có đơn đang giao được phân công.",
    delivered: "Không có đơn đã giao.",
    failed: "Không có đơn giao thất bại.",
  };

  return titles[filter] || "Không có đơn giao hàng phù hợp";
}

function getEmptyOrdersDescription(filter, hasAssignedOrders) {
  if (!hasAssignedOrders) {
    return "Admin cần phân công nhân viên giao hàng cho đơn Sẵn sàng giao trước khi shipper nhìn thấy.";
  }

  if (filter === "waiting") {
    return "Các đơn Sẵn sàng giao ở admin phải được chọn nhân viên Delivery User.";
  }

  return "Thử đổi bộ lọc hoặc từ khóa tìm kiếm.";
}

function createProfileForm(user) {
  return {
    name: user?.name || "",
    phoneNumber: user?.phoneNumber || "",
    address: user?.address || "",
    avatar: user?.avatar || "",
  };
}

function getDeliveryArea(profile, t) {
  const area =
    profile?.operatingAddress ||
    profile?.address ||
    profile?.user?.address ||
    profile?.deliveryProfile?.operatingAddress ||
    "";

  return String(area).trim() || t("Chưa cập nhật");
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
    return "Ảnh đại diện không được vượt quá 5MB.";
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
  const [shiftStarted, setShiftStarted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [settlementConfirmOpen, setSettlementConfirmOpen] = useState(false);
  const [settlementStatus, setSettlementStatus] = useState("");
  
  // Verification states
  const [verifyMode, setVerifyMode] = useState(null); // "status", "success", "failed"
  const [statusDraft, setStatusDraft] = useState("out_for_delivery");
  const [failedReason, setFailedReason] = useState(""); // "rescheduled", "cannot_contact", "canceled"
  const [verificationNote, setVerificationNote] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [proofValidationMessage, setProofValidationMessage] = useState("");
  const [profileForm, setProfileForm] = useState(blankProfileForm);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const avatarInputRef = useRef(null);
  
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
        setCurrentUser(session.currentUser);
        setProfileForm(createProfileForm(session.currentUser));
        setAuthStatus("authenticated");
        setLoading(true);
        setError("");
        setNotice("");
        setOrdersError("");
      }

      const [ordersResult, profileResult] = await Promise.allSettled([
        deliveryService.getAssignedOrders(ORDER_FETCH_PARAMS),
        deliveryService.getProfile(),
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
            setCurrentUser(profile);
            setProfileForm(createProfileForm(profile));
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
    const ready = orders.filter((order) => order.status === "ready_for_delivery").length;
    const delivering = orders.filter((order) => order.status === "out_for_delivery").length;
    const delivered = orders.filter((order) => ["delivered", "completed"].includes(order.status)).length;
    const failed = orders.filter((order) => getOrderStatusGroup(order) === "failed").length;
    const codDelivered = orders.filter(
      (order) => ["delivered", "completed"].includes(order.status) && isCashPayment(order)
    ).length;
    const onlineDelivered = orders.filter(
      (order) => ["delivered", "completed"].includes(order.status) && !isCashPayment(order)
    ).length;
    const totalCod = orders
      .filter((order) => ["delivered", "completed"].includes(order.status) && isCashPayment(order))
      .reduce((sum, order) => sum + getOrderTotal(order), 0);

    return { ready, delivering, delivered, failed, codDelivered, onlineDelivered, totalCod };
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

  const deliveryArea = getDeliveryArea(currentUser, t);

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

  function resetOrderModalState() {
    setSelectedOrder(null);
    setVerifyMode(null);
    setStatusDraft("out_for_delivery");
    setFailedReason("");
    setVerificationNote("");
    setProofImage("");
    setProofValidationMessage("");
    setSignatureSaved(false);
  }

  function syncDeliverySessionUser(user) {
    const session = getAuthSession(AUTH_SCOPES.delivery);
    if (!session?.accessToken || !user) {
      return;
    }

    saveAuthSession(
      {
        accessToken: session.accessToken,
        tokenType: session.tokenType,
        user,
        expiresIn: session.tokenExpiresAt
          ? Math.max(session.tokenExpiresAt - Date.now(), 0)
          : undefined,
      },
      {
        remember: isAuthSessionRemembered(AUTH_SCOPES.delivery),
        scope: AUTH_SCOPES.delivery,
      }
    );
  }

  async function loadDeliveryProfile({ silent = false } = {}) {
    if (!silent) {
      setProfileLoading(true);
      setAvatarMessage("");
    }

    try {
      const response = await deliveryService.getProfile();
      const profile = unwrapApiData(response);
      setCurrentUser(profile);
      setProfileForm(createProfileForm(profile));
      syncDeliverySessionUser(profile);
    } catch (err) {
      if (!silent) {
        setError(getErrorMessage(err, "Không thể tải hồ sơ shipper."));
      }
    } finally {
      if (!silent) {
        setProfileLoading(false);
      }
    }
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
      setCurrentUser(payload.user);
      setProfileForm(createProfileForm(payload.user));
      setLoginForm(blankLoginForm);
      setAuthStatus("authenticated");
      await loadOrders();
      await loadDeliveryProfile({ silent: true });
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
    setProfileForm(blankProfileForm);
    resetOrderModalState();
    setAuthStatus("unauthenticated");
    setNotice("");
    setError("");
    setOrdersError("");
    setShiftStarted(false);
    setSettlementStatus("");
  }

  // Simulated QR/Barcode Scan for Shift Assignment
  const startScanning = () => {
    setScanning(true);
    setScanResult("");
    setTimeout(() => {
      setScanning(false);
      setScanResult("WAREHOUSE-B2-OK");
      setShiftStarted(true);
      setNotice("Quét mã nhận kho thành công! Đã bắt đầu ca giao hàng.");
      toast.success(t("Quét mã nhận kho thành công! Đã bắt đầu ca giao hàng."));
    }, 1500);
  };

  // Automated notification to client
  const sendArrivalNotification = async (order) => {
    setError("");
    setNotice("");
    try {
      await deliveryService.notifyArrival(order.id);
      const message = "Đã gửi thông báo chuẩn bị giao hàng tới khách hàng.";
      setNotice(message);
      toast.success(t(message));
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Không thể gửi thông báo cho khách hàng."
      );
      setError(message);
      toast.error(t(message));
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
  const submitDeliverySuccess = async () => {
    let signatureBase64 = null;
    if (canvasRef.current && signatureSaved) {
      signatureBase64 = canvasRef.current.toDataURL("image/png");
    }

    setActionLoading(`${selectedOrder.id}:complete`);
    setError("");
    setNotice("");
    try {
      const updated = await deliveryService.markDelivered(selectedOrder.id, {
        note: verificationNote || "Đã giao hàng thành công.",
        proofImage: proofImage,
        signature: signatureBase64,
      });
      updateOrderInState(updated);
      setNotice(`Đơn #${selectedOrder.id} đã hoàn thành giao hàng!`);
      toast.success(t("Đã giao hàng thành công."));
      resetOrderModalState();
    } catch (err) {
      setError(getErrorMessage(err, "Không thể hoàn thành đơn giao."));
      toast.error(t(getErrorMessage(err, "Không thể hoàn thành đơn giao.")));
    } finally {
      setActionLoading("");
    }
  };

  // Confirm delivery failure
  const submitDeliveryFailure = async (reasonOverride = failedReason) => {
    if (!reasonOverride) {
      toast.error(t("Vui lòng chọn lý do giao hàng thất bại!"));
      return;
    }

    const backendReason =
      reasonOverride === "cannot_contact" || reasonOverride === "canceled"
        ? reasonOverride
        : "rescheduled";
    const reasonLabel =
      FAILURE_REASONS.find((item) => item.value === reasonOverride)?.label ||
      "Lý do khác";
    const note = [reasonLabel, verificationNote].filter(Boolean).join(" - ");

    setActionLoading(`${selectedOrder.id}:fail`);
    setError("");
    setNotice("");
    try {
      const updated = await deliveryService.markFailedAttempt(selectedOrder.id, {
        reason: backendReason,
        note: note || "Cập nhật thất bại từ shipper.",
      });
      updateOrderInState(updated);
      setNotice(`Đã cập nhật báo cáo thất bại đơn hàng #${selectedOrder.id}.`);
      toast.success(t("Đã cập nhật trạng thái giao đơn."));
      resetOrderModalState();
    } catch (err) {
      setError(getErrorMessage(err, "Không thể báo cáo thất bại đơn."));
      toast.error(t(getErrorMessage(err, "Không thể báo cáo thất bại đơn.")));
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

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setError("");
    setAvatarMessage("");

    const phoneError = profileForm.phoneNumber
      ? getVietnamPhoneError(profileForm.phoneNumber)
      : "";
    if (phoneError) {
      setAvatarMessage(phoneError);
      toast.error(t(phoneError));
      return;
    }

    setProfileSaving(true);
    try {
      const response = await deliveryService.updateProfile({
        name: profileForm.name.trim(),
        phoneNumber: profileForm.phoneNumber
          ? normalizeVietnamPhone(profileForm.phoneNumber)
          : "",
        address: profileForm.address.trim(),
        avatar: profileForm.avatar,
      });
      const profile = {
        ...currentUser,
        ...unwrapApiData(response),
        address: profileForm.address.trim(),
      };
      setCurrentUser(profile);
      setProfileForm(createProfileForm(profile));
      syncDeliverySessionUser(profile);
      setNotice("Đã cập nhật hồ sơ cá nhân thành công.");
      toast.success(t("Đã cập nhật hồ sơ cá nhân thành công."));
    } catch (err) {
      const message = getErrorMessage(err, "Không thể cập nhật hồ sơ cá nhân.");
      setError(message);
      toast.error(t(message));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const validationMessage = validateAvatarFile(file);
    if (validationMessage) {
      setAvatarMessage(validationMessage);
      toast.error(t(validationMessage));
      return;
    }

    setAvatarUploading(true);
    setAvatarMessage("");
    try {
      const response = await deliveryService.uploadAvatar(file);
      const profile = unwrapApiData(response);
      setCurrentUser(profile);
      setProfileForm(createProfileForm(profile));
      syncDeliverySessionUser(profile);
      setAvatarMessage("Đã upload ảnh đại diện.");
      toast.success(t("Đã upload ảnh đại diện."));
    } catch (err) {
      const message = getErrorMessage(err, "Không thể upload ảnh đại diện. Vui lòng thử lại.");
      setAvatarMessage(message);
      toast.error(t(message));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleAvatarRemove() {
    setAvatarUploading(true);
    setAvatarMessage("");
    try {
      const response = await deliveryService.deleteAvatar();
      const profile = unwrapApiData(response);
      setCurrentUser(profile);
      setProfileForm(createProfileForm(profile));
      syncDeliverySessionUser(profile);
      setAvatarMessage("Đã xóa ảnh đại diện.");
      toast.success(t("Đã xóa ảnh đại diện."));
    } catch (err) {
      const message = getErrorMessage(err, "Không thể xóa ảnh. Vui lòng thử lại.");
      setAvatarMessage(message);
      toast.error(t(message));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function submitStatusUpdate() {
    if (!selectedOrder) {
      return;
    }

    if (statusDraft === "out_for_delivery") {
      if (selectedOrder.status === "ready_for_delivery") {
        await handleStartTransit(selectedOrder);
      } else {
        toast.success(t("Đã cập nhật trạng thái giao đơn."));
      }
      return;
    }

    if (statusDraft === "delivered") {
      await submitDeliverySuccess();
      return;
    }

    if (statusDraft === "failed" || statusDraft === "returned") {
      await submitDeliveryFailure(statusDraft === "returned" ? failedReason || "canceled" : failedReason);
      return;
    }

    setNotice("Trạng thái đang lấy hàng đã được ghi nhận trên thiết bị.");
    toast.success(t("Trạng thái đang lấy hàng đã được ghi nhận trên thiết bị."));
    setVerifyMode(null);
  }

  return (
    <main className="min-h-screen bg-[#f3f4f6] pb-28 text-slate-900 md:pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-emerald-600 text-white shadow-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 transition hover:opacity-90"
            title="Trở lại trang mua hàng"
          >
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
          <div className="relative mx-auto max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="absolute right-4 top-4">
              <button
                type="button"
                onClick={() => setShowRoleDropdown((prev) => !prev)}
                className="flex size-9 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700"
                title="Chọn vai trò đăng nhập"
              >
                <UserCheck className="size-4" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5">
                  <button
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-emerald-800"
                  >
                    Khách hàng
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md bg-slate-50 px-3 py-2 text-left text-xs font-bold text-emerald-800"
                  >
                    Giao hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/admin/login")}
                    className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-emerald-800"
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
              <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-4 lg:space-y-0">
                {/* Simulated QR/Barcode Scanner Section */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 sm:p-6">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <QrCode className="size-5 text-emerald-600" />
                    Bàn Giao & Nhận Ca Làm Việc
                  </h3>
                  
                  {!shiftStarted ? (
                    <div className="mt-5 space-y-5 text-center">
                      <div className={`mx-auto flex size-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 relative overflow-hidden ${scanning ? "border-emerald-500" : ""}`}>
                        {scanning ? (
                          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500 animate-bounce" />
                        ) : null}
                        <QrCode className={`size-16 text-slate-400 ${scanning ? "animate-pulse text-emerald-500" : ""}`} />
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed px-4">
                        Quét mã QR Code/Barcode trên phiếu bàn giao tại kho hàng bưu cục để bắt đầu ca nhận đơn ngày hôm nay.
                      </p>
                      <Button
                        onClick={startScanning}
                        disabled={scanning}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl"
                      >
                        {scanning ? "Đang quét mã..." : "Quét Mã Nhận Ca"}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                        <p className="text-xs text-emerald-800 uppercase font-black tracking-wider">Trạng thái ca làm việc</p>
                        <p className="text-2xl font-black text-emerald-950 mt-1">Đang Trong Ca Giao</p>
                        <p className="text-[11px] text-emerald-600 mt-1">Mã nhận kho: <span className="font-mono font-bold">{scanResult}</span></p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-500 font-black uppercase">Giao Hôm Nay</p>
                          <p className="text-2xl font-black text-slate-800 mt-1">{orders.length} đơn</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-500 font-black uppercase">{t("KHU VỰC GIAO")}</p>
                          <p className="text-sm font-black text-slate-800 mt-2 truncate">{deliveryArea}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-[#fef3c7] rounded-xl border border-[#fde68a] text-amber-950 flex items-start gap-3">
                        <AlertCircle className="size-5 shrink-0 mt-0.5 text-amber-700" />
                        <div className="text-sm leading-relaxed">
                          <p className="font-black">Lộ trình AI tối ưu đề xuất:</p>
                          <p className="mt-1 opacity-90">Đi tuyến Trần Hưng Đạo → Cửa Đại → Hai Bà Trưng để rút ngắn 2.5km di chuyển.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* General Stats */}
                <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
                    <p className="text-2xl font-black text-emerald-600">{stats.ready}</p>
                    <p className="text-[11px] text-slate-500 font-bold mt-1">Chờ giao</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
                    <p className="text-2xl font-black text-blue-600">{stats.delivering}</p>
                    <p className="text-[11px] text-slate-500 font-bold mt-1">Đang giao</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
                    <p className="text-2xl font-black text-amber-600">{stats.delivered}</p>
                    <p className="text-[11px] text-slate-500 font-bold mt-1">Đã giao</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ĐƠN HÀNG (Active Deliveries) */}
            {activeTab === "orders" && (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm mã đơn, tên khách, số điện thoại, địa chỉ..."
                    className="pl-10 pr-4 h-11 bg-white border-slate-200 rounded-xl"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
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
                    <p className="mt-3 text-sm font-black text-slate-800">Không thể tải danh sách đơn giao hàng.</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{ordersError}</p>
                    <Button
                      type="button"
                      onClick={loadOrders}
                      className="mt-4 h-10 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      <RefreshCw className="size-4" />
                      Thử lại
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
                    const isCod = isCashPayment(order);
                    const isTransit = order.status === "out_for_delivery";
                    const phone = getCustomerPhone(order);
                    
                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`rounded-2xl bg-white border p-4 shadow-sm transition active:scale-[0.98] cursor-pointer ${
                          isTransit ? "border-blue-400 ring-2 ring-blue-50" : "border-slate-100"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-3">
                          <span className="font-mono text-sm font-black text-slate-800">{getOrderCode(order)}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                            isCod ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                            {isCod ? `COD: ${formatCurrency(getOrderTotal(order))}` : "Đã thanh toán Online"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <User className="size-4 shrink-0 text-slate-400 mt-0.5" />
                            <p className="text-sm font-black text-slate-800">{getCustomerName(order)}</p>
                          </div>
                          {phone && (
                            <div className="flex items-start gap-2">
                              <Phone className="size-4 shrink-0 text-slate-400 mt-0.5" />
                              <p className="text-xs font-semibold text-slate-600">{phone}</p>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <MapPin className="size-4 shrink-0 text-slate-400 mt-0.5" />
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{getShippingAddress(order)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                          <StatusBadge status={order.status} />
                          <div className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* Call Button */}
                            <a
                              href={`tel:${getCustomerPhone(order)}`}
                              aria-label="Gọi khách hàng"
                              className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200"
                            >
                              <Phone className="size-4" />
                            </a>
                            {/* Message Button */}
                            <button
                              onClick={() => sendArrivalNotification(order)}
                              aria-label="Nhắn tin khách hàng"
                              className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200"
                            >
                              <MessageSquare className="size-4" />
                            </button>
                            {/* Map Navigation Link */}
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getShippingAddress(order))}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Chỉ đường"
                              className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200"
                            >
                              <Navigation className="size-4" />
                            </a>
                          </div>
                        </div>

                        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            onClick={() => {
                              if (getOrderStatusGroup(order) === "waiting") {
                                handleStartTransit(order);
                                return;
                              }

                              setSelectedOrder(order);
                              if (getOrderStatusGroup(order) === "delivering") {
                                setStatusDraft("delivered");
                                setVerifyMode("status");
                              } else {
                                setVerifyMode(null);
                              }
                            }}
                            disabled={actionLoading === `${order.id}:transit`}
                            className={`h-11 w-full rounded-xl text-sm font-black text-white ${
                              getOrderStatusGroup(order) === "waiting"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : getOrderStatusGroup(order) === "delivering"
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : "bg-slate-800 hover:bg-slate-900"
                            }`}
                          >
                            {actionLoading === `${order.id}:transit` ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              getPrimaryOrderActionLabel(order)
                            )}
                          </Button>
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

            {activeTab === "settings" && (
              <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      {profileForm.avatar ? (
                        <img
                          src={getAssetUrl(profileForm.avatar)}
                          alt="Ảnh đại diện"
                          className="size-full object-cover"
                          onError={setImageFallback}
                        />
                      ) : (
                        <span className="text-lg font-black">{getInitial(currentUser)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black text-slate-900">
                        {currentUser?.name || "Tài xế AgriMarket"}
                      </p>
                      <p className="truncate text-xs font-semibold text-slate-500">
                        {currentUser?.email}
                      </p>
                    </div>
                    <BadgeCheck className="size-5 text-emerald-600" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    {currentUser?.status && (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <p className="font-black uppercase text-emerald-700">Trạng thái tài khoản</p>
                        <p className="mt-1 font-bold text-emerald-950">{currentUser.status}</p>
                      </div>
                    )}
                    {currentUser?.vehiclePlate && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="font-black uppercase text-slate-500">Biển số xe</p>
                        <p className="mt-1 font-bold text-slate-900">{currentUser.vehiclePlate}</p>
                      </div>
                    )}
                    {currentUser?.vehicleType && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="font-black uppercase text-slate-500">Loại phương tiện</p>
                        <p className="mt-1 font-bold text-slate-900">{currentUser.vehicleType}</p>
                      </div>
                    )}
                    {currentUser?.deliveryArea && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="font-black uppercase text-slate-500">Khu vực giao hàng</p>
                        <p className="mt-1 font-bold text-slate-900">{currentUser.deliveryArea}</p>
                      </div>
                    )}
                  </div>
                </div>

                <form
                  onSubmit={handleProfileSubmit}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900">Cài đặt hồ sơ</h3>
                      <p className="text-xs font-medium text-slate-500">Thông tin shipper đang đăng nhập</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadDeliveryProfile()}
                      className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                      aria-label="Làm mới hồ sơ"
                    >
                      {profileLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Ảnh đại diện</Label>
                      <div className="flex items-center gap-3">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={handleAvatarUpload}
                          disabled={avatarUploading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 border-emerald-100 bg-white text-emerald-800"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                        >
                          {avatarUploading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Camera className="size-4" />
                          )}
                          {profileForm.avatar ? "Chọn ảnh khác" : "Chọn ảnh"}
                        </Button>
                        {profileForm.avatar && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 border-red-100 bg-white text-red-700 hover:bg-red-50"
                            onClick={handleAvatarRemove}
                            disabled={avatarUploading}
                          >
                            Xóa ảnh
                          </Button>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        JPG, JPEG, PNG, WEBP - tối đa 5MB
                      </p>
                      {avatarMessage && (
                        <p className={`text-xs font-bold ${avatarMessage.includes("Không") || avatarMessage.includes("Chỉ") || avatarMessage.includes("vượt") ? "text-red-600" : "text-emerald-700"}`}>
                          {avatarMessage}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="delivery-profile-name">Họ và tên</Label>
                      <Input
                        id="delivery-profile-name"
                        value={profileForm.name}
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="h-11"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="delivery-profile-phone">Số điện thoại</Label>
                      <Input
                        id="delivery-profile-phone"
                        type="tel"
                        value={profileForm.phoneNumber}
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            phoneNumber: event.target.value,
                          }))
                        }
                        placeholder="090xxxxxxxx"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="delivery-profile-address">{t("Địa chỉ vận hành hoặc liên hệ...")}</Label>
                      <Textarea
                        id="delivery-profile-address"
                        value={profileForm.address}
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            address: event.target.value,
                          }))
                        }
                        rows={3}
                        className="bg-white"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={profileSaving}
                      className="h-11 w-full rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                    >
                      {profileSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Lưu hồ sơ
                    </Button>
                  </div>
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
            onClick={() => { setActiveTab("settings"); resetOrderModalState(); }}
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

      {/* Selected Order Fullscreen Detail & Action Modal (Draw style for mobile) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end p-0 md:items-center md:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl md:max-w-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-slate-800">Chi tiết đơn giao {selectedOrder.trackingNumber || '#' + selectedOrder.id}</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(selectedOrder.trackingNumber || String(selectedOrder.id));
                      toast.success("Đã sao chép mã đơn hàng!");
                    }}
                    className="flex size-5 items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-250 hover:text-slate-700 transition"
                    title="Sao chép mã đơn hàng"
                  >
                    <Copy className="size-3" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">Cập nhật kết quả giao hàng và xác thực</p>
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
                /* Mode 1: View details & trigger transit/verify */
                <>
                  {/* Status Indicator banner */}
                  <div className={`p-3 rounded-xl flex items-center gap-2 border ${
                    selectedOrder.status === "out_for_delivery"
                      ? "bg-blue-50 border-blue-100 text-blue-800"
                      : selectedOrder.status === "ready_for_delivery"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                        : "bg-slate-50 border-slate-100 text-slate-700"
                  }`}>
                    <Clock3 className="size-5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold">Trạng thái hiện tại: <StatusBadge status={selectedOrder.status} /></p>
                      <p className="mt-0.5 opacity-90">
                        {selectedOrder.status === "ready_for_delivery"
                          ? "Bấm bắt đầu giao để kích hoạt di chuyển."
                          : selectedOrder.status === "out_for_delivery"
                            ? "Đang trên lộ trình giao cho khách."
                            : "Đơn hàng đã kết thúc giao nhận."}
                      </p>
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
                        className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 active:bg-emerald-100 border border-emerald-100"
                      >
                        <Phone className="size-4" />
                      </a>
                    </div>

                    <div className="text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-2.5">
                      <span className="font-bold text-slate-700 block mb-0.5">Địa chỉ giao:</span>
                      {getShippingAddress(selectedOrder)}
                    </div>
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
                  </div>
                </>
              ) : verifyMode === "status" ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <span className="inline-flex size-12 items-center justify-center bg-emerald-50 text-emerald-600 rounded-full mb-2">
                      <Truck className="size-6" />
                    </span>
                    <h4 className="text-base font-black text-slate-800">Cập nhật trạng thái</h4>
                    <p className="text-xs text-slate-500">Chọn trạng thái mới cho đơn giao hàng</p>
                  </div>

                  <div className="grid gap-2">
                    {STATUS_UPDATE_OPTIONS.map((item) => (
                      <label
                        key={item.value}
                        className={`flex items-center gap-3 rounded-xl border p-3.5 text-sm font-bold transition ${
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
                            if (!["failed", "returned"].includes(item.value)) {
                              setFailedReason("");
                            }
                          }}
                          className="size-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>

                  {(statusDraft === "failed" || statusDraft === "returned") && (
                    <div className="space-y-2.5">
                      <Label className="text-xs font-bold text-slate-600 block">
                        Chọn lý do thất bại*
                      </Label>
                      <div className="grid gap-2">
                        {FAILURE_REASONS.map((item) => (
                          <label
                            key={item.value}
                            className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-semibold transition ${
                              failedReason === item.value
                                ? "border-red-500 bg-red-50 text-slate-900"
                                : "border-slate-100 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="failed-reason"
                              value={item.value}
                              checked={failedReason === item.value}
                              onChange={() => setFailedReason(item.value)}
                              className="size-4 border-slate-300 text-red-600 focus:ring-red-500"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {statusDraft === "delivered" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600 block">
                        Ảnh minh chứng giao hàng
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
                            accept="image/jpeg,image/png,image/webp"
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
                              <p className="text-xs font-bold text-slate-600">Chụp ảnh / Chọn ảnh gói hàng</p>
                              <p className="mt-1 text-[10px] text-slate-400">Ảnh thực tế tại địa điểm giao hàng</p>
                            </>
                          )}
                        </div>
                      )}
                      {proofValidationMessage && (
                        <p className="text-xs font-bold text-red-600">{proofValidationMessage}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="status-note">
                      {statusDraft === "failed" ? "Ghi chú chi tiết*" : "Ghi chú giao hàng (Không bắt buộc)"}
                    </Label>
                    <Textarea
                      id="status-note"
                      placeholder={
                        statusDraft === "failed"
                          ? "Nhập lý do chi tiết (ví dụ: thuê bao gọi 3 cuộc lúc 10h, khách bảo đang đi công tác...)"
                          : "Nhập ghi chú ví dụ: giao cho bảo vệ, người nhận thay..."
                      }
                      value={verificationNote}
                      onChange={(e) => setVerificationNote(e.target.value)}
                      rows={3}
                      className="bg-white"
                    />
                  </div>
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
                    <h4 className="text-base font-bold text-slate-800">Báo Cáo Giao Thất Bại</h4>
                    <p className="text-xs text-slate-500">Cập nhật chính xác lý do để bưu cục lưu trữ</p>
                  </div>

                  {/* Reasons Radio Select */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold text-slate-600 block">Chọn lý do thất bại*</Label>
                    
                    <div className="grid gap-2">
                      {[
                        { value: "rescheduled", label: "Khách hẹn giao lại (đổi ngày/giờ)" },
                        { value: "cannot_contact", label: "Không liên lạc được (thuê bao/không bắt máy)" },
                        { value: "canceled", label: "Khách từ chối nhận hàng (Hủy đơn hàng)" },
                      ].map((item) => (
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
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="space-y-1.5">
                    <Label htmlFor="failed-note">Ghi chú chi tiết*</Label>
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
                /* Primary Actions when viewing details */
                <>
                  {selectedOrder.status === "ready_for_delivery" && (
                    <Button
                      onClick={() => handleStartTransit(selectedOrder)}
                      disabled={actionLoading === `${selectedOrder.id}:transit`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 font-bold text-white rounded-xl text-sm"
                    >
                      {actionLoading === `${selectedOrder.id}:transit` ? (
                        <Loader2 className="size-4 animate-spin mx-auto" />
                      ) : (
                        "Bắt đầu giao"
                      )}
                    </Button>
                  )}
                  {selectedOrder.status === "out_for_delivery" && (
                    <Button
                      onClick={() => {
                        setStatusDraft("delivered");
                        setVerifyMode("status");
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-12 font-bold text-white rounded-xl text-sm"
                    >
                      Cập nhật trạng thái
                    </Button>
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
                      uploadingImage
                    }
                    className={`flex-1 h-12 font-bold text-white rounded-xl text-sm ${
                      verifyMode === "failed" || statusDraft === "failed" || statusDraft === "returned"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {actionLoading.includes(selectedOrder.id) ? (
                      <Loader2 className="size-4 animate-spin mx-auto" />
                    ) : (
                      "Xác Nhận & Gửi"
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
                    Quay Lại
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
