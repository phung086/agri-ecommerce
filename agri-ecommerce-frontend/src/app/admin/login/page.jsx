"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AUTH_SCOPES,
  clearAuthSession,
  getAdminAuthState,
  isAdminUser,
  saveAuthSession,
} from "@/lib/auth-storage";
import { authService } from "@/services/auth.service";

function getAuthPayload(response) {
  return response?.data ?? response;
}

function getNextPath() {
  if (typeof window === "undefined") {
    return "/admin";
  }

  const next = new URLSearchParams(window.location.search).get("next");

  if (next?.startsWith("/admin") && next !== "/admin/login") {
    return next;
  }

  return "/admin";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const authState = getAdminAuthState();

    if (authState.status === "authenticated") {
      router.replace(getNextPath());
    }
  }, [router]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.login({
        email: form.email.trim(),
        password: form.password,
      });
      const payload = getAuthPayload(response);

      if (!payload?.accessToken) {
        setError("Phản hồi đăng nhập không có access token.");
        return;
      }

      if (!isAdminUser(payload?.user)) {
        clearAuthSession(AUTH_SCOPES.admin);
        setError("Tài khoản này không có quyền quản trị hệ thống.");
        return;
      }

      saveAuthSession(payload, { remember, scope: AUTH_SCOPES.admin });

      router.replace(getNextPath());
    } catch (err) {
      setError(
        err?.message ||
          "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7fbf1] text-slate-950">
      <Image
        src="/market-assets/fresh-market-hero.png"
        alt="Nông sản tươi AgriMarket"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(247,251,241,0.98)_0%,rgba(247,251,241,0.9)_42%,rgba(247,251,241,0.34)_72%,rgba(16,41,27,0.18)_100%)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_0.82fr] lg:px-8">
        <section className="hidden max-w-xl space-y-7 lg:block">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-[8px] bg-emerald-600 text-white shadow-sm">
              <Leaf className="size-6" />
            </div>
            <div>
              <p className="text-lg font-black text-emerald-950">AgriMarket</p>
              <p className="text-sm font-semibold text-emerald-700">
                Quản trị sàn nông sản
              </p>
            </div>
          </Link>

          <div>
            <div className="inline-flex items-center gap-2 rounded-[8px] border border-emerald-200 bg-white/82 px-3 py-1.5 text-sm font-bold text-emerald-800 shadow-sm">
              <ShieldCheck className="size-4" />
              Khu vực dành cho quản trị viên
            </div>
            <h1 className="mt-5 max-w-lg text-5xl font-black leading-[1.04] tracking-normal text-emerald-950">
              Điều phối đơn hàng, kho và giao nhận trong một bảng điều khiển.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
              Đăng nhập để theo dõi sản phẩm tươi, xử lý đơn mới và quản lý
              trải nghiệm mua hàng của khách trên AgriMarket.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Truck, label: "Đơn giao nhanh" },
              { icon: Sparkles, label: "Ưu đãi mùa vụ" },
              { icon: LockKeyhole, label: "Bảo mật token" },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-[8px] border border-white/70 bg-white/78 p-4 shadow-sm backdrop-blur"
                >
                  <Icon className="size-5 text-emerald-700" />
                  <p className="mt-3 text-sm font-bold text-slate-800">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[8px] border border-emerald-100 bg-white/94 p-5 shadow-[0_24px_80px_rgba(15,61,38,0.16)] backdrop-blur sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-700">
                Admin Login
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-normal text-emerald-950">
                Đăng nhập quản trị
              </h2>
            </div>
            <div className="flex size-11 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <ShieldCheck className="size-5" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email quản trị</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="admin-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  placeholder="admin@example.com"
                  className="h-11 pl-9"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Mật khẩu</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) =>
                    updateForm("password", event.target.value)
                  }
                  placeholder="Nhập mật khẩu"
                  className="h-11 pl-9 pr-10"
                  autoComplete="current-password"
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

            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="size-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
              />
              Ghi nhớ đăng nhập trên thiết bị này
            </label>

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
              {loading ? "Đang đăng nhập..." : "Đăng nhập admin"}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <div className="mt-5 rounded-[8px] border border-emerald-100 bg-emerald-50/70 p-3 text-xs leading-5 text-emerald-800">
            Chỉ tài khoản có role <span className="font-bold">admin</span> mới
            được chuyển vào bảng điều khiển quản trị.
          </div>
        </section>
      </div>
    </main>
  );
}
