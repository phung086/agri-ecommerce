"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Printer,
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

  return (
    <section
      id="payment-invoice"
      className="mt-6 rounded-[8px] border border-slate-200 bg-white p-6 text-slate-950 shadow-sm print:border-0 print:shadow-none"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase leading-5 text-emerald-800">
            AgriMarket
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Fresh agricultural ecommerce
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold uppercase text-slate-500">
            No. {invoiceNumber}
          </p>
          <h2 className="mt-1 text-4xl font-black tracking-wide text-slate-950 sm:text-5xl">
            INVOICE
          </h2>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="print:hidden hidden h-9 items-center justify-center gap-2 rounded-[8px] border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50 sm:inline-flex"
        >
          <Printer className="size-4" />
          In hóa đơn
        </button>
      </div>

      <div className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <p className="font-black">Billed to:</p>
          <p className="mt-1 font-semibold">{getCustomerName(order)}</p>
          <p className="text-slate-600">{getShippingAddressText(order)}</p>
          <p className="text-slate-600">{getCustomerPhone(order)}</p>
        </div>

        <div className="sm:text-right">
          <p>
            <span className="font-black">Date:</span>{" "}
            <span className="text-slate-700">
              {formatDate(getPaymentPaidAt(order, params))}
            </span>
          </p>
          <div className="mt-5 sm:inline-block sm:text-left">
            <p className="font-black">From:</p>
            <p className="mt-1 font-semibold">AgriMarket</p>
            <p className="text-slate-600">Thanh toán qua VNPay</p>
            <p className="text-slate-600">Mã GD: {transactionNo}</p>
          </div>
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

      <div className="hidden">
        <div className="rounded-[8px] border border-emerald-100 p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Mã đơn hàng
          </p>
          <p className="mt-1 font-black text-slate-950">
            #{result?.orderId || "-"}
          </p>
        </div>
        <div className="rounded-[8px] border border-emerald-100 p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Mã giao dịch
          </p>
          <p className="mt-1 font-black text-slate-950">
            {result?.transactionNo || params?.vnp_TransactionNo || "-"}
          </p>
        </div>
        <div className="rounded-[8px] border border-emerald-100 p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Số tiền
          </p>
          <p className="mt-1 font-black text-emerald-700">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="rounded-[8px] border border-emerald-100 p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Phương thức
          </p>
          <p className="mt-1 font-black text-slate-950">VNPay</p>
        </div>
        <div className="rounded-[8px] border border-emerald-100 p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Thời gian thanh toán
          </p>
          <p className="mt-1 font-black text-slate-950">
            {formatDate(getPaymentPaidAt(order, params))}
          </p>
        </div>
        <div className="rounded-[8px] border border-emerald-100 p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Trạng thái
          </p>
          <p className="mt-1 font-black text-emerald-700">
            Đã thanh toán qua VNPay
          </p>
        </div>
      </div>

      <div className="hidden">
        <div className="rounded-[8px] bg-[#f6faef] p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Khách hàng
          </p>
          <p className="mt-1 font-black text-slate-950">
            {getCustomerName(order)}
          </p>
          <p className="mt-1 font-semibold text-slate-600">
            {getCustomerPhone(order)}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {getShippingAddressText(order)}
          </p>
        </div>

        <div className="rounded-[8px] bg-[#f6faef] p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Thanh toán
          </p>
          <p className="mt-1 font-black text-slate-950">VNPay</p>
          <p className="mt-1 font-semibold text-slate-600">
            Mã giao dịch: {result?.transactionNo || params?.vnp_TransactionNo || "-"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Ngày thanh toán: {formatDate(getPaymentPaidAt(order, params))}
          </p>
        </div>
      </div>

      <div className="mt-10 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-white">
            <tr>
              <th className="px-3 py-3 font-black">Item</th>
              <th className="px-3 py-3 text-right font-black">Quantity</th>
              <th className="px-3 py-3 text-right font-black">Price</th>
              <th className="px-3 py-3 text-right font-black">Amount</th>
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

      <div className="mt-10 border-y border-slate-950 py-3">
        <div className="hidden justify-between text-slate-600">
          <span>Tạm tính</span>
          <span>{formatCurrency(order?.subtotal ?? totalAmount)}</span>
        </div>
        <div className="hidden justify-between text-slate-600">
          <span>Giảm giá</span>
          <span>-{formatCurrency(order?.discountAmount ?? 0)}</span>
        </div>
        <div className="hidden justify-between text-slate-600">
          <span>Phí giao hàng</span>
          <span>{formatCurrency(order?.shippingFee ?? 0)}</span>
        </div>
        <div className="ml-auto flex max-w-xs justify-between text-base font-black text-slate-950">
          <span>Total</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 text-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p>
            <span className="font-black">Payment method:</span> VNPay
          </p>
          <p>
            <span className="font-black">Note:</span> Cảm ơn bạn đã mua hàng.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="print:hidden inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50 sm:hidden"
        >
          <Printer className="size-4" />
          In hóa đơn
        </button>
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
    <main className="min-h-screen bg-[#f6faef] px-4 py-10 text-slate-950">
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

            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-[8px] border border-emerald-100 p-3">
                <dt className="font-bold text-slate-500">Mã đơn hàng</dt>
                <dd className="mt-1 font-black">#{result?.orderId || "-"}</dd>
              </div>
              <div className="rounded-[8px] border border-emerald-100 p-3">
                <dt className="font-bold text-slate-500">Số tiền</dt>
                <dd className="mt-1 font-black">
                  {result?.amount != null ? formatCurrency(result.amount) : "-"}
                </dd>
              </div>
              <div className="rounded-[8px] border border-emerald-100 p-3">
                <dt className="font-bold text-slate-500">Mã giao dịch</dt>
                <dd className="mt-1 font-black">
                  {result?.transactionNo || "-"}
                </dd>
              </div>
              <div className="rounded-[8px] border border-emerald-100 p-3">
                <dt className="font-bold text-slate-500">Trạng thái VNPay</dt>
                <dd className="mt-1 font-black">
                  {gatewaySuccess ? "Thành công" : "Không thành công"}
                </dd>
              </div>
            </dl>

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
        <main className="min-h-screen bg-[#f6faef] px-4 py-10 text-slate-950">
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
