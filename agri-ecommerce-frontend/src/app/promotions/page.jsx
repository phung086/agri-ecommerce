"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgePercent,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Gift,
  Leaf,
  RefreshCw,
  ShoppingBasket,
  Sparkles,
  Tag,
  TicketPercent,
  TriangleAlert,
  Zap,
} from "lucide-react";

import { formatDate } from "@/lib/admin-utils";
import { promotionService } from "@/services/promotion.service";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Colour palette keyed by discount tier                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
function resolveTheme(discountPercentage) {
  if (discountPercentage >= 50)
    return {
      tag: "VIP",
      chip: "bg-rose-100 text-rose-700",
      badge: "bg-rose-600",
      ring: "hover:ring-rose-200",
      btn: "bg-rose-600 hover:bg-rose-700",
      bar: "bg-rose-500",
      accent: "text-rose-600",
      light: "bg-rose-50",
    };
  if (discountPercentage >= 30)
    return {
      tag: "Ưu đãi lớn",
      chip: "bg-violet-100 text-violet-700",
      badge: "bg-violet-600",
      ring: "hover:ring-violet-200",
      btn: "bg-violet-600 hover:bg-violet-700",
      bar: "bg-violet-500",
      accent: "text-violet-600",
      light: "bg-violet-50",
    };
  if (discountPercentage >= 20)
    return {
      tag: "Tiết kiệm",
      chip: "bg-amber-100 text-amber-700",
      badge: "bg-amber-500",
      ring: "hover:ring-amber-200",
      btn: "bg-amber-500 hover:bg-amber-600",
      bar: "bg-amber-400",
      accent: "text-amber-600",
      light: "bg-amber-50",
    };
  return {
    tag: "Khuyến mãi",
    chip: "bg-emerald-100 text-emerald-700",
    badge: "bg-emerald-600",
    ring: "hover:ring-emerald-200",
    btn: "bg-emerald-600 hover:bg-emerald-700",
    bar: "bg-emerald-500",
    accent: "text-emerald-600",
    light: "bg-emerald-50",
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Derive human-readable label from coupon code                                */
/* ─────────────────────────────────────────────────────────────────────────── */
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
    HAPPY: "Happy giảm giá",
    NEW: "Mới toanh",
  };
  const upper = code.toUpperCase();
  for (const [key, label] of Object.entries(map)) {
    if (upper.includes(key)) return label;
  }
  return "Mã ưu đãi đặc biệt";
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Usage progress bar                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
function UsageBar({ used, limit, theme }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = limit != null ? limit - used : null;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>Đã dùng {(used ?? 0).toLocaleString("vi-VN")}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${theme.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {remaining != null && (
        <p className="mt-1 text-right text-xs text-slate-400">
          Còn {remaining.toLocaleString("vi-VN")} lượt
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Single voucher card                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
function VoucherCard({ coupon, onCopy, copied }) {
  const theme = resolveTheme(coupon.discountPercentage ?? 0);
  const label = deriveLabel(coupon.code);

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgba(15,61,38,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_42px_rgba(15,61,38,0.12)] hover:ring-2 ${theme.ring}`}
    >
      {/* top accent bar */}
      <div className={`h-1 w-full ${theme.bar}`} />

      {/* discount badge */}
      <div
        className={`absolute right-4 top-4 flex h-16 w-16 flex-col items-center justify-center rounded-full ${theme.badge} text-white shadow-lg`}
      >
        <span className="text-lg font-black leading-none">
          -{coupon.discountPercentage}%
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 pt-4">
        {/* tag chip */}
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${theme.chip}`}
        >
          <Tag className="size-3" />
          {theme.tag}
        </span>

        {/* title + description */}
        <div className="pr-16">
          <h3 className="text-lg font-black text-slate-900">{label}</h3>
          <p className="mt-1.5 text-sm leading-5 text-slate-500">
            Giảm ngay{" "}
            <span className={`font-bold ${theme.accent}`}>
              {coupon.discountPercentage}%
            </span>{" "}
            cho đơn hàng tiếp theo của bạn tại AgriMarket.
          </p>
        </div>

        {/* meta grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl ${theme.light} p-3`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Giảm giá
            </p>
            <p className={`mt-1 text-sm font-black ${theme.accent}`}>
              {coupon.discountPercentage}%
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Hết hạn
            </p>
            <p className="mt-1 text-sm font-black text-slate-700">
              {coupon.expiresAt ? formatDate(coupon.expiresAt) : "Không giới hạn"}
            </p>
          </div>
        </div>

        {/* usage bar — only if usage limit is set */}
        {coupon.usageLimit != null && (
          <UsageBar
            used={coupon.timesUsed ?? 0}
            limit={coupon.usageLimit}
            theme={theme}
          />
        )}

        {/* code row + copy button */}
        <div className="flex items-center gap-2 border-t border-dashed border-slate-200 pt-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
            <TicketPercent className={`size-4 shrink-0 ${theme.accent}`} />
            <span className="min-w-0 flex-1 truncate font-mono text-sm font-black tracking-widest text-slate-900">
              {coupon.code}
            </span>
          </div>

          <button
            id={`copy-btn-${coupon.id}`}
            type="button"
            onClick={() => onCopy(coupon.code)}
            title="Sao chép mã"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-all duration-200 ${
              copied === coupon.code
                ? "scale-110 bg-emerald-500 shadow-md"
                : theme.btn
            }`}
          >
            {copied === coupon.code ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>

        {/* CTA button */}
        <Link
          href="/"
          id={`apply-btn-${coupon.id}`}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all duration-200 ${theme.btn} hover:shadow-md`}
        >
          <ShoppingBasket className="size-4" />
          Áp dụng ngay
        </Link>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Skeleton                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
function VoucherSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgba(15,61,38,0.06)]">
      <div className="h-1 w-full animate-pulse bg-slate-200" />
      <div className="space-y-4 p-5">
        <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
        <div className="space-y-2 pr-16">
          <div className="h-5 w-3/5 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Error state                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-100 bg-white p-16 text-center shadow-sm">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <TriangleAlert className="size-7" />
      </div>
      <p className="mt-5 font-black text-slate-800">Không tải được ưu đãi.</p>
      <p className="mt-2 text-sm text-slate-500">
        {message || "Có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại."}
      </p>
      <button
        id="retry-promotions"
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700"
      >
        <RefreshCw className="size-4" />
        Thử lại
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Stats strip                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function StatStrip({ coupons }) {
  const total = coupons.length;
  const maxDiscount = coupons.reduce(
    (acc, c) => Math.max(acc, c.discountPercentage ?? 0),
    0
  );
  const avgDiscount =
    total > 0
      ? Math.round(
          coupons.reduce((acc, c) => acc + (c.discountPercentage ?? 0), 0) /
            total
        )
      : 0;

  return (
    <div className="mx-auto grid w-full max-w-[1480px] grid-cols-2 gap-4 px-4 py-4 sm:grid-cols-4 sm:px-6 lg:px-8">
      {[
        {
          icon: Gift,
          label: "Tổng ưu đãi",
          value: `${total} voucher`,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          icon: Zap,
          label: "Giảm cao nhất",
          value: `-${maxDiscount}%`,
          color: "text-rose-600",
          bg: "bg-rose-50",
        },
        {
          icon: BadgePercent,
          label: "Giảm trung bình",
          value: `-${avgDiscount}%`,
          color: "text-violet-600",
          bg: "bg-violet-50",
        },
        {
          icon: CircleDollarSign,
          label: "Cập nhật",
          value: "Hôm nay",
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
      ].map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-400">
                {stat.label}
              </p>
              <p className={`text-sm font-black ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Main page                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function PromotionsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pageData = await promotionService.getPublicCoupons({ size: 50 });
      setCoupons(pageData?.content ?? []);
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách ưu đãi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  function handleCopy(code) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <main className="min-h-screen bg-[#f6faef]">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex w-full max-w-[1480px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            id="back-to-home"
            className="flex items-center gap-1.5 rounded-lg p-1.5 text-sm font-semibold text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
          >
            <ArrowLeft className="size-4" />
            Trang chủ
          </Link>
          <span className="text-slate-200">|</span>
          <div className="flex items-center gap-2">
            <Leaf className="size-4 text-emerald-600" />
            <span className="font-black text-slate-900">AgriMarket</span>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 py-14 text-white">
        <span className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-white/5 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-10 left-10 size-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-emerald-200">
            <Sparkles className="size-4" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Ưu đãi nông sản
            </span>
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Khuyến mãi theo mùa
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-emerald-100">
            Chọn voucher phù hợp, sao chép mã và áp dụng ngay khi thanh toán.
            Ưu đãi được cập nhật liên tục theo mùa vụ và sự kiện.
          </p>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────── */}
      {!loading && !error && coupons.length > 0 && (
        <StatStrip coupons={coupons} />
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <VoucherSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : coupons.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => (
              <VoucherCard
                key={coupon.id}
                coupon={coupon}
                onCopy={handleCopy}
                copied={copiedCode}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-white p-16 text-center shadow-sm">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Gift className="size-7" />
            </div>
            <p className="mt-5 font-black text-slate-800">
              Chưa có ưu đãi nào đang hoạt động.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Hãy quay lại sớm – chúng tôi cập nhật voucher theo từng mùa vụ.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              <ArrowLeft className="size-4" />
              Về trang chủ
            </Link>
          </div>
        )}
      </section>

      {/* ── How to use ──────────────────────────────────────────── */}
      {!loading && !error && coupons.length > 0 && (
        <section className="mx-auto w-full max-w-[1480px] px-4 pb-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-black text-slate-900">
              Cách dùng voucher
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Sao chép mã",
                  desc: "Nhấn nút sao chép trên thẻ voucher để lấy mã giảm giá.",
                  icon: Copy,
                },
                {
                  step: "02",
                  title: "Chọn sản phẩm",
                  desc: "Thêm sản phẩm vào giỏ, đảm bảo đạt mức đơn tối thiểu.",
                  icon: ShoppingBasket,
                },
                {
                  step: "03",
                  title: "Nhập mã khi thanh toán",
                  desc: "Dán mã vào ô voucher tại bước thanh toán để nhận ưu đãi.",
                  icon: CalendarClock,
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-600">
                        {step.step}
                      </p>
                      <p className="font-black text-slate-900">{step.title}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-emerald-100 bg-white">
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-6 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-slate-900">
            <Leaf className="size-5 text-emerald-600" />
            <span className="font-black">AgriMarket</span>
          </div>
          <p>Nông sản tươi, giá rõ ràng, giao trong ngày.</p>
        </div>
      </footer>
    </main>
  );
}
