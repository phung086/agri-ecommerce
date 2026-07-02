"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
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
  CameraOff
} from "lucide-react";

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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Mobile UI state
  const [activeTab, setActiveTab] = useState("orders"); // "shift", "orders", "settlement"
  const [shiftStarted, setShiftStarted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Verification states
  const [verifyMode, setVerifyMode] = useState(null); // "success", "failed"
  const [failedReason, setFailedReason] = useState(""); // "rescheduled", "cannot_contact", "canceled"
  const [verificationNote, setVerificationNote] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  
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
        setAuthStatus("authenticated");
        setLoading(true);
        setError("");
        setNotice("");
      }

      try {
        const response = await deliveryService.getAssignedOrders(ORDER_FETCH_PARAMS);
        if (!cancelled) {
          setOrders(readPageContent(response));
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Không thể tải danh sách đơn giao hàng."));
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

  const stats = useMemo(() => {
    const ready = orders.filter((order) => order.status === "ready_for_delivery").length;
    const delivering = orders.filter((order) => order.status === "out_for_delivery").length;
    const delivered = orders.filter((order) => ["delivered", "completed"].includes(order.status)).length;
    const totalCod = orders
      .filter((order) => ["delivered", "completed"].includes(order.status) && order.payment?.paymentMethod?.toLowerCase() === "cash")
      .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);

    return { ready, delivering, delivered, totalCod };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesKeyword =
        !keyword ||
        String(order.id).includes(keyword) ||
        getCustomerName(order).toLowerCase().includes(keyword) ||
        getShippingAddress(order).toLowerCase().includes(keyword);
      return matchesKeyword;
    });
  }, [orders, searchTerm]);

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
      const response = await deliveryService.getAssignedOrders(ORDER_FETCH_PARAMS);
      setOrders(readPageContent(response));
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải danh sách đơn giao hàng."));
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
      setError(getErrorMessage(err, "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu."));
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
    setShiftStarted(false);
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
    }, 1500);
  };

  // Automated SMS notification to client
  const sendArrivalNotification = (order) => {
    const phone = getCustomerPhone(order);
    if (!phone) {
      alert("Khách hàng không có số điện thoại!");
      return;
    }
    const message = `Xin chào ${getCustomerName(order)}, tôi là nhân viên giao hàng từ AgriMarket. Tôi đang trên đường giao đơn hàng #${order.id} trị giá ${formatCurrency(order.totalPrice)} cho quý khách. Vui lòng giữ liên lạc điện thoại nhé!`;
    
    // Simulate SMS sending
    alert(`Đã gửi tin nhắn thông báo tự động tới số ${phone}:\n\n"${message}"`);
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
    } catch (err) {
      setError(getErrorMessage(err, "Không thể cập nhật trạng thái giao đơn."));
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
    if (!file) return;
    
    setUploadingImage(true);
    setError("");
    try {
      const response = await deliveryService.uploadProofImage(file);
      setProofImage(response.url || response.relativePath);
      setNotice("Đã tải ảnh minh chứng lên hệ thống.");
    } catch (err) {
      setError(getErrorMessage(err, "Không thể upload ảnh minh chứng."));
    } finally {
      setUploadingImage(false);
    }
  };

  // Confirm delivery success
  const submitDeliverySuccess = async () => {
    if (!proofImage) {
      alert("Vui lòng tải lên hoặc chụp ảnh minh chứng!");
      return;
    }
    
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
      setSelectedOrder(null);
      setVerifyMode(null);
      setProofImage("");
      setVerificationNote("");
      setSignatureSaved(false);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể hoàn thành đơn giao."));
    } finally {
      setActionLoading("");
    }
  };

  // Confirm delivery failure
  const submitDeliveryFailure = async () => {
    if (!failedReason) {
      alert("Vui lòng chọn lý do giao hàng thất bại!");
      return;
    }

    setActionLoading(`${selectedOrder.id}:fail`);
    setError("");
    setNotice("");
    try {
      const updated = await deliveryService.markFailedAttempt(selectedOrder.id, {
        reason: failedReason,
        note: verificationNote || "Cập nhật thất bại từ shipper.",
      });
      updateOrderInState(updated);
      setNotice(`Đã cập nhật báo cáo thất bại đơn hàng #${selectedOrder.id}.`);
      setSelectedOrder(null);
      setVerifyMode(null);
      setFailedReason("");
      setVerificationNote("");
    } catch (err) {
      setError(getErrorMessage(err, "Không thể báo cáo thất bại đơn."));
    } finally {
      setActionLoading("");
    }
  };

  const simulateSettlement = () => {
    if (stats.totalCod <= 0) {
      alert("Không có số dư COD để chốt ca nộp tiền!");
      return;
    }
    alert(`Đã gửi yêu cầu đối soát số tiền ${formatCurrency(stats.totalCod)} COD thu được. Vui lòng quét mã QR chuyển khoản hoặc nộp tiền mặt tại bưu cục.`);
    setNotice("Gửi yêu cầu chốt ca nộp tiền thành công! Đang chờ Quản trị viên duyệt.");
  };

  return (
    <main className="min-h-screen bg-[#f3f4f6] pb-20 text-slate-900 md:pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-emerald-600 text-white shadow-md">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Truck className="size-6" />
            <h1 className="text-lg font-black tracking-tight">AgriMarket - Shipper</h1>
          </div>
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
      <div className="mx-auto w-full max-w-lg p-4">
        {authStatus === "checking" ? (
          <div className="flex flex-col items-center justify-center py-20 text-emerald-700">
            <Loader2 className="size-10 animate-spin" />
            <p className="mt-4 font-bold">Đang tải phiên làm việc...</p>
          </div>
        ) : authStatus === "unauthenticated" ? (
          /* Login Form */
          <div className="rounded-2xl bg-white p-6 shadow-xl">
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
          <div className="space-y-4">
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
              <div className="space-y-4">
                {/* Simulated QR/Barcode Scanner Section */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <QrCode className="size-5 text-emerald-600" />
                    Bàn Giao & Nhận Ca Làm Việc
                  </h3>
                  
                  {!shiftStarted ? (
                    <div className="mt-4 space-y-4 text-center">
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
                    <div className="mt-4 space-y-3">
                      <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3.5 text-center">
                        <p className="text-xs text-emerald-800 uppercase font-black tracking-wider">Trạng thái ca làm việc</p>
                        <p className="text-xl font-black text-emerald-950 mt-1">Đang Trong Ca Giao</p>
                        <p className="text-[11px] text-emerald-600 mt-1">Mã nhận kho: <span className="font-mono font-bold">{scanResult}</span></p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-500 font-bold">Giao Hôm Nay</p>
                          <p className="text-2xl font-black text-slate-800 mt-1">{orders.length} đơn</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-500 font-bold">Khu Vực Giao</p>
                          <p className="text-sm font-black text-slate-800 mt-2 truncate">Hội An / Đà Nẵng</p>
                        </div>
                      </div>

                      <div className="p-3 bg-[#fef3c7] rounded-xl border border-[#fde68a] text-amber-950 flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-700" />
                        <div className="text-xs">
                          <p className="font-bold">Lộ trình AI tối ưu đề xuất:</p>
                          <p className="mt-0.5 opacity-90">Đi tuyến Trần Hưng Đạo $\rightarrow$ Cửa Đại $\rightarrow$ Hai Bà Trưng để rút ngắn 2.5km di chuyển.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* General Stats */}
                <div className="grid grid-cols-3 gap-3">
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
                    placeholder="Tìm mã đơn, tên khách, địa chỉ..."
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

                {/* Order List */}
                {loading ? (
                  <div className="text-center py-10">
                    <Loader2 className="size-8 animate-spin mx-auto text-emerald-600" />
                    <p className="text-xs text-slate-500 font-bold mt-2">Đang cập nhật danh sách đơn...</p>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-slate-100 text-center text-slate-400">
                    <PackageCheck className="size-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold">Không tìm thấy đơn hàng nào</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => {
                    const isCod = order.payment?.paymentMethod?.toLowerCase() === "cash";
                    const isTransit = order.status === "out_for_delivery";
                    
                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`rounded-2xl bg-white border p-4 shadow-sm transition active:scale-[0.98] cursor-pointer ${
                          isTransit ? "border-blue-400 ring-2 ring-blue-50" : "border-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                          <span className="font-mono text-sm font-black text-slate-800">#{order.id}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                            isCod ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                            {isCod ? `COD: ${formatCurrency(order.totalPrice)}` : "Đã thanh toán Online"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <User className="size-4 shrink-0 text-slate-400 mt-0.5" />
                            <p className="text-sm font-black text-slate-800">{getCustomerName(order)}</p>
                          </div>
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
                              className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200"
                            >
                              <Phone className="size-4" />
                            </a>
                            {/* Message Button */}
                            <button
                              onClick={() => sendArrivalNotification(order)}
                              className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200"
                            >
                              <MessageSquare className="size-4" />
                            </button>
                            {/* Map Navigation Link */}
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getShippingAddress(order))}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200"
                            >
                              <Navigation className="size-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: ĐỐI SOÁT & KẾT CA (Settlement) */}
            {activeTab === "settlement" && (
              <div className="space-y-4">
                {/* Wallet Balance & Settlement card */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Wallet className="size-5 text-emerald-600" />
                    <h3 className="text-base font-bold">Ví Tiền Mặt COD</h3>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tiền mặt cần nộp về công ty</p>
                    <p className="text-3xl font-black text-red-600 mt-1">{formatCurrency(stats.totalCod)}</p>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex justify-between text-xs py-2 border-b border-slate-50 text-slate-600">
                      <span>Đơn giao thành công (COD)</span>
                      <span className="font-bold text-slate-800">
                        {orders.filter(o => ["delivered", "completed"].includes(o.status) && o.payment?.paymentMethod?.toLowerCase() === "cash").length} đơn
                      </span>
                    </div>
                    <div className="flex justify-between text-xs py-2 border-b border-slate-50 text-slate-600">
                      <span>Đơn giao thành công (Online)</span>
                      <span className="font-bold text-slate-800">
                        {orders.filter(o => ["delivered", "completed"].includes(o.status) && o.payment?.paymentMethod?.toLowerCase() !== "cash").length} đơn
                      </span>
                    </div>
                    <div className="flex justify-between text-xs py-2 text-slate-600">
                      <span>Tổng đơn hàng giao thành công</span>
                      <span className="font-bold text-emerald-700">{stats.delivered} đơn</span>
                    </div>
                  </div>

                  <Button
                    onClick={simulateSettlement}
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
          </div>
        )}
      </div>

      {/* Navigation Tab Bar for Mobile Devices */}
      {authStatus === "authenticated" && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 h-14 flex items-center shadow-lg max-w-lg mx-auto">
          <button
            onClick={() => { setActiveTab("shift"); setSelectedOrder(null); setVerifyMode(null); }}
            className={`flex-1 flex flex-col items-center justify-center h-full transition ${
              activeTab === "shift" ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <UserCheck className="size-5" />
            <span className="text-[10px] font-black mt-1">Nhận ca</span>
          </button>
          <button
            onClick={() => { setActiveTab("orders"); setSelectedOrder(null); setVerifyMode(null); }}
            className={`flex-1 flex flex-col items-center justify-center h-full transition ${
              activeTab === "orders" ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Truck className="size-5" />
            <span className="text-[10px] font-black mt-1">Đơn hàng</span>
          </button>
          <button
            onClick={() => { setActiveTab("settlement"); setSelectedOrder(null); setVerifyMode(null); }}
            className={`flex-1 flex flex-col items-center justify-center h-full transition ${
              activeTab === "settlement" ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Wallet className="size-5" />
            <span className="text-[10px] font-black mt-1">Đối soát</span>
          </button>
        </nav>
      )}

      {/* Selected Order Fullscreen Detail & Action Modal (Draw style for mobile) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end p-0 md:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-800">Chi tiết đơn giao #{selectedOrder.id}</h3>
                <p className="text-xs text-slate-500">Cập nhật kết quả giao hàng và xác thực</p>
              </div>
              <button
                onClick={() => { setSelectedOrder(null); setVerifyMode(null); }}
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
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Hình thức thanh toán:</span>
                      <span className="font-bold text-slate-800">
                        {selectedOrder.payment?.paymentMethod?.toLowerCase() === "cash" ? "Tiền mặt (COD)" : "Trực tuyến (PayPal/VNPay)"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-slate-200/60 pt-2 mb-1">
                      <span className="text-slate-600">Tổng tiền thu hộ (COD):</span>
                      <span className="text-base font-black text-red-600">
                        {selectedOrder.payment?.paymentMethod?.toLowerCase() === "cash" ? formatCurrency(selectedOrder.totalPrice) : "0 đ"}
                      </span>
                    </div>
                  </div>

                  {/* Product List */}
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Danh sách sản phẩm</p>
                    <div className="rounded-xl border border-slate-100 overflow-hidden text-xs">
                      <div className="bg-slate-50 px-3 py-2 font-bold grid grid-cols-[1fr_2.5rem_5rem] text-slate-600 border-b border-slate-100">
                        <span>Tên sản phẩm</span>
                        <span className="text-center">SL</span>
                        <span className="text-right">Đơn giá</span>
                      </div>
                      {(selectedOrder.items || []).map((item) => (
                        <div key={item.id} className="bg-white px-3 py-2.5 grid grid-cols-[1fr_2.5rem_5rem] text-slate-700 border-b border-slate-50 last:border-0">
                          <span className="font-medium truncate">{item.productName}</span>
                          <span className="text-center font-bold text-slate-900">{item.quantity}</span>
                          <span className="text-right font-semibold">{formatCurrency(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
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
                        <img src={proofImage} alt="POD" className="object-cover size-full" />
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
                        "Bắt Đầu Giao (Transit)"
                      )}
                    </Button>
                  )}
                  {selectedOrder.status === "out_for_delivery" && (
                    <>
                      <Button
                        onClick={() => setVerifyMode("success")}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-12 font-bold text-white rounded-xl text-sm"
                      >
                        Giao Thành Công
                      </Button>
                      <Button
                        onClick={() => setVerifyMode("failed")}
                        variant="outline"
                        className="flex-1 border-red-200 bg-white text-red-700 hover:bg-red-50 h-12 font-bold rounded-xl text-sm"
                      >
                        Giao Thất Bại
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => setSelectedOrder(null)}
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
                    onClick={verifyMode === "success" ? submitDeliverySuccess : submitDeliveryFailure}
                    disabled={
                      actionLoading === `${selectedOrder.id}:complete` ||
                      actionLoading === `${selectedOrder.id}:fail` ||
                      uploadingImage
                    }
                    className={`flex-1 h-12 font-bold text-white rounded-xl text-sm ${
                      verifyMode === "success" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {actionLoading.includes(selectedOrder.id) ? (
                      <Loader2 className="size-4 animate-spin mx-auto" />
                    ) : (
                      "Xác Nhận & Gửi"
                    )}
                  </Button>
                  <Button
                    onClick={() => { setVerifyMode(null); setFailedReason(""); setProofImage(""); setVerificationNote(""); }}
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
