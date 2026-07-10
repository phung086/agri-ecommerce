"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  ShoppingBasket,
} from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/admin-utils";
import { orderService } from "@/services/order.service";
import { useSearchParams } from "next/navigation";

const MAX_PENDING_RECHECKS = 5;

function getInvoiceNumber(orderId) {
  return `INV-${String(orderId || "0").padStart(6, "0")}`;
}

function getShippingAddressText(order) {
  const shippingAddress = order?.shippingAddress;

  if (!shippingAddress) {
    return "Chưa có địa chỉ giao hàng";
  }

  return [shippingAddress.address, shippingAddress.city]
    .filter(Boolean)
    .join(", ");
}

function getCustomerName(order) {
  return (
    order?.shippingAddress?.fullName ||
    order?.customerName ||
    "Khách hàng AgriMarket"
  );
}

function getCustomerPhone(order) {
  return order?.shippingAddress?.phone || order?.customerPhoneNumber || "-";
}

function formatVnpayPayDate(value) {
  if (!value || String(value).length !== 14) {
    return "";
  }

  const text = String(value);
  const date = new Date(
    Number(text.slice(0, 4)),
    Number(text.slice(4, 6)) - 1,
    Number(text.slice(6, 8)),
    Number(text.slice(8, 10)),
    Number(text.slice(10, 12)),
    Number(text.slice(12, 14))
  );

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getPaymentPaidAt(order, params) {
  return (
    order?.payment?.paidAt ||
    formatVnpayPayDate(params?.vnp_PayDate) ||
    order?.updatedAt ||
    order?.createdAt
  );
}

function PaymentInvoicePanel({ order, result, params, orderLoading, orderError }) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const invoiceNumber = getInvoiceNumber(result?.orderId);
  const totalAmount = Number(order?.totalPrice ?? result?.amount ?? 0);
  const transactionNo = result?.transactionNo || params?.vnp_TransactionNo || "-";
  const subtotal = Number(order?.subtotal ?? totalAmount);
  const discountAmount = Number(order?.discountAmount ?? 0);
  const shippingFee = Number(order?.shippingFee ?? 0);
  const paidAt = getPaymentPaidAt(order, params);
  const hasPriceBreakdown =
    order?.subtotal != null || order?.discountAmount != null || order?.shippingFee != null;

  return (
    <section
      id="payment-invoice"
      className="mt-6 rounded-[8px] border border-slate-200 bg-white p-5 text-slate-950 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-emerald-700">AgriMarket</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Hóa đơn thanh toán
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Cảm ơn bạn đã mua hàng tại AgriMarket.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:text-right">
          <div>
            <dt className="font-bold text-slate-500">Số hóa đơn</dt>
            <dd className="mt-0.5 font-black">{invoiceNumber}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Mã đơn hàng</dt>
            <dd className="mt-0.5 font-black">#{result?.orderId || "-"}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Ngày thanh toán</dt>
            <dd className="mt-0.5 font-black">{formatDate(paidAt)}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Trạng thái</dt>
            <dd className="mt-0.5 font-black text-emerald-700">Đã thanh toán</dd>
          </div>
        </dl>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-[8px] bg-slate-50 p-4">
          <p className="font-black text-slate-950">Thông tin khách hàng</p>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="font-bold text-slate-500">Tên khách hàng</dt>
              <dd className="font-semibold">{getCustomerName(order)}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">Số điện thoại</dt>
              <dd className="font-semibold">{getCustomerPhone(order)}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">Địa chỉ giao hàng</dt>
              <dd className="font-semibold leading-5">{getShippingAddressText(order)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[8px] bg-slate-50 p-4">
          <p className="font-black text-slate-950">Thông tin thanh toán</p>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="font-bold text-slate-500">Phương thức</dt>
              <dd className="font-semibold">VNPay</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">Mã giao dịch</dt>
              <dd className="font-semibold">{transactionNo}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">Người bán</dt>
              <dd className="font-semibold">AgriMarket</dd>
            </div>
          </dl>
        </div>
      </div>

      {orderLoading && (
        <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          <Loader2 className="size-4 animate-spin" />
          Đang tải chi tiết đơn hàng để lập hóa đơn...
        </div>
      )}

      {orderError && (
        <div className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          {orderError}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-[8px] border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-white">
            <tr>
              <th className="px-3 py-3 font-black">Sản phẩm</th>
              <th className="px-3 py-3 text-right font-black">SL</th>
              <th className="px-3 py-3 text-right font-black">Đơn giá</th>
              <th className="px-3 py-3 text-right font-black">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id || item.productId} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-semibold text-slate-800">
                    {item.productName || "Sản phẩm"}
                    {item.unit && (
                      <span className="ml-1 text-xs text-slate-500">
                        /{item.unit}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {item.quantity || 0}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {formatCurrency(
                      item.lineTotal ??
                        Number(item.price || 0) * Number(item.quantity || 0)
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-4 font-semibold text-slate-600" colSpan={4}>
                  Thanh toán cho đơn hàng #{result?.orderId || "-"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-end">
        <dl className="w-full max-w-sm space-y-2 text-sm">
          {hasPriceBreakdown && (
            <>
              <div className="flex justify-between gap-4 text-slate-600">
                <dt>Tạm tính</dt>
                <dd className="font-semibold">{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-slate-600">
                <dt>Giảm giá</dt>
                <dd className="font-semibold">-{formatCurrency(discountAmount)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-slate-600">
                <dt>Phí giao hàng</dt>
                <dd className="font-semibold">{formatCurrency(shippingFee)}</dd>
              </div>
            </>
          )}
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base font-black text-slate-950">
            <dt>Tổng thanh toán</dt>
            <dd>{formatCurrency(totalAmount)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-5 rounded-[8px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
        <p>
          Hóa đơn đã được thanh toán qua VNPay. Vui lòng giữ mã giao dịch{" "}
          <span className="font-black">{transactionNo}</span> để đối soát khi cần.
        </p>
      </div>
    </section>
  );
}

function VnpayReturnContent() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const params = useMemo(
    () => Object.fromEntries(new URLSearchParams(queryString).entries()),
    [queryString]
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [pendingRechecks, setPendingRechecks] = useState(0);
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function verifyReturn() {
      if (!params.vnp_TxnRef) {
        setError("Thiếu dữ liệu trả về từ VNPay.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await orderService.verifyVnpayReturn(params);
        if (!cancelled) {
          setResult(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Không thể xác thực kết quả VNPay.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    verifyReturn();

    return () => {
      cancelled = true;
    };
  }, [params, refreshNonce]);

  const gatewaySuccess =
    result?.validSignature &&
    result?.responseCode === "00" &&
    result?.transactionStatus === "00";
  const paymentCompleted = result?.paymentStatus === "completed";
  const pendingIpn = gatewaySuccess && !paymentCompleted;

  const statusTone = gatewaySuccess
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : "border-red-200 bg-red-50 text-red-900";

  const StatusIcon = gatewaySuccess ? CheckCircle2 : AlertTriangle;

  useEffect(() => {
    if (!pendingIpn || pendingRechecks >= MAX_PENDING_RECHECKS) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPendingRechecks((count) => count + 1);
      setRefreshNonce((nonce) => nonce + 1);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [pendingIpn, pendingRechecks]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrderDetail() {
      if (!gatewaySuccess || !result?.orderId) {
        setOrderDetail(null);
        setOrderError("");
        return;
      }

      setOrderLoading(true);
      setOrderError("");

      try {
        const response = await orderService.getOrder(result.orderId);
        if (!cancelled) {
          setOrderDetail(response);
        }
      } catch (err) {
        if (!cancelled) {
          setOrderDetail(null);
          setOrderError(
            err?.message ||
              "Thanh toán đã thành công nhưng chưa tải được chi tiết đơn hàng. Hóa đơn tạm sẽ dùng dữ liệu giao dịch VNPay."
          );
        }
      } finally {
        if (!cancelled) {
          setOrderLoading(false);
        }
      }
    }

    loadOrderDetail();

    return () => {
      cancelled = true;
    };
  }, [gatewaySuccess, result?.orderId]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <section className="mx-auto w-full max-w-3xl rounded-[8px] border border-emerald-100 bg-white p-6 shadow-[0_16px_42px_rgba(15,61,38,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-[8px] bg-emerald-600 text-white">
            <CreditCard className="size-5" />
          </div>
          <div>
            <p className="text-sm font-black uppercase text-emerald-700">
              VNPay
            </p>
            <h1 className="text-2xl font-black text-emerald-950">
              Kết quả thanh toán
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-3 rounded-[8px] border border-emerald-100 bg-emerald-50 p-4 font-semibold text-emerald-800">
            <Loader2 className="size-5 animate-spin" />
            Đang xác thực giao dịch...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-[8px] border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
            {error}
          </div>
        ) : (
          <>
            <div className={`mt-6 rounded-[8px] border p-4 ${statusTone}`}>
              <div className="flex items-start gap-3">
                <StatusIcon className="mt-0.5 size-6 shrink-0" />
                <div>
                  <p className="font-black">
                    {gatewaySuccess
                      ? "Thanh toán VNPay thành công"
                      : "Thanh toán chưa thành công"}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {gatewaySuccess
                      ? "VNPay đã ghi nhận giao dịch thành công. Hóa đơn thanh toán được hiển thị bên dưới."
                      : result?.message}
                  </p>
                </div>
              </div>
            </div>

            {pendingIpn && (
              <div className="mt-4 flex flex-col gap-3 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Hóa đơn đã được lập từ kết quả VNPay. Hệ thống vẫn đang đồng
                  bộ trạng thái payment nội bộ trong nền.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPendingRechecks(0);
                    setRefreshNonce((nonce) => nonce + 1);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-emerald-200 bg-white px-3 font-bold text-emerald-900 transition hover:bg-emerald-100"
                >
                  <RefreshCw className="size-4" />
                  Kiểm tra lại
                </button>
              </div>
            )}

            {gatewaySuccess && (
              <PaymentInvoicePanel
                order={orderDetail}
                result={result}
                params={params}
                orderLoading={orderLoading}
                orderError={orderError}
              />
            )}
          </>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            <ShoppingBasket className="size-4" />
            Xem đơn hàng
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-[8px] border border-emerald-100 bg-white px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
          >
            Tiếp tục mua hàng
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function VnpayReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-10 text-foreground">
          <section className="mx-auto w-full max-w-3xl rounded-[8px] border border-emerald-100 bg-white p-6">
            <div className="flex items-center gap-3 font-semibold text-emerald-800">
              <Loader2 className="size-5 animate-spin" />
              Đang tải kết quả thanh toán...
            </div>
          </section>
        </main>
      }
    >
      <VnpayReturnContent />
    </Suspense>
  );
}
