"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  ShoppingBasket,
} from "lucide-react";

import { formatCurrency } from "@/lib/admin-utils";
import { orderService } from "@/services/order.service";
import { useSearchParams } from "next/navigation";

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
        if (!cancelled) setResult(response);
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
  }, [params]);

  const gatewaySuccess =
    result?.validSignature &&
    result?.responseCode === "00" &&
    result?.transactionStatus === "00";
  const paymentCompleted = result?.paymentStatus === "completed";
  const success = gatewaySuccess && paymentCompleted;
  const pendingIpn = gatewaySuccess && !paymentCompleted;
  const failed = result && !gatewaySuccess;

  const statusTone = success
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : pendingIpn
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-red-200 bg-red-50 text-red-900";

  const StatusIcon = success ? CheckCircle2 : pendingIpn ? Clock3 : AlertTriangle;

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
                    {success
                      ? "Thanh toán thành công"
                      : pendingIpn
                        ? "Đang chờ hệ thống xác nhận"
                        : "Thanh toán chưa thành công"}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {result?.message}
                  </p>
                </div>
              </div>
            </div>

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
                <dt className="font-bold text-slate-500">Trạng thái payment</dt>
                <dd className="mt-1 font-black">{result?.paymentStatus || "-"}</dd>
              </div>
            </dl>
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
