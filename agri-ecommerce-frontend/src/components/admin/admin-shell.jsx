"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  ChevronRight,
  FolderTree,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  MessageSquare,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Store,
  TicketPercent,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AUTH_SCOPES,
  clearAuthSession,
  getAdminAuthState,
} from "@/lib/auth-storage";
import { getAssetUrl } from "@/lib/admin-utils";
import { cn } from "@/lib/utils";
import { adminService } from "@/services/admin.service";

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    description: "Tổng quan vận hành",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/users",
    label: "Người dùng",
    description: "Khách hàng, nhà bán",
    icon: Users,
  },
  {
    href: "/admin/categories",
    label: "Danh mục",
    description: "Nhóm nông sản",
    icon: FolderTree,
  },
  {
    href: "/admin/products",
    label: "Sản phẩm",
    description: "Giá, kho, hình ảnh",
    icon: PackageCheck,
  },
  {
    href: "/admin/inventory",
    label: "Quản lý Kho",
    description: "Nhập xuất, hạn sử dụng",
    icon: Store,
  },
  {
    href: "/admin/orders",
    label: "Đơn hàng",
    description: "Giỏ hàng, thanh toán",
    icon: ShoppingCart,
  },
  {
    href: "/admin/delivery",
    label: "Giao hàng",
    description: "Tuyến giao tươi",
    icon: Truck,
  },
  {
    href: "/admin/coupons",
    label: "Mã giảm giá",
    description: "Ưu đãi mùa vụ",
    icon: TicketPercent,
  },
  {
    href: "/admin/contacts",
    label: "Liên hệ",
    description: "Phản hồi khách hàng",
    icon: MessageSquare,
  },
];

function getActiveItem(pathname) {
  return (
    navItems.find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/admin" && pathname.startsWith(item.href))
    ) || navItems[0]
  );
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getAvailableProductPercent(summary) {
  const totalProducts = Number(summary?.totalProducts || 0);
  const activeProducts = Number(summary?.activeProducts || 0);

  if (totalProducts <= 0) {
    return 0;
  }

  return Math.round((activeProducts / totalProducts) * 100);
}

function SidebarContent({ pathname, onNavigate, sidebarStats }) {
  const todayOrdersLabel = sidebarStats.loading
    ? "..."
    : formatCompactNumber(sidebarStats.todayOrders);
  const availablePercentLabel = sidebarStats.loading
    ? "..."
    : `${formatCompactNumber(sidebarStats.availableProductPercent)}%`;

  return (
    <div className="flex h-full flex-col bg-[#10291b] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-emerald-400 text-emerald-950 shadow-[0_14px_30px_rgba(16,185,129,0.24)]">
            <Leaf className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold">AgriMarket</p>
            <p className="truncate text-xs font-medium text-emerald-100/75">
              Quản trị sàn nông sản
            </p>
          </div>
        </Link>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-[8px] border border-white/10 bg-white/[0.08] p-3">
            <p className="text-lg font-bold leading-none">{todayOrdersLabel}</p>
            <p className="mt-1 text-[11px] font-medium text-emerald-100/70">
              đơn hôm nay
            </p>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/[0.08] p-3">
            <p className="text-lg font-bold leading-none">
              {availablePercentLabel}
            </p>
            <p className="mt-1 text-[11px] font-medium text-emerald-100/70">
              SP đang bán
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-white text-emerald-950 shadow-sm"
                  : "text-emerald-50/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-[8px] transition",
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-white/10 text-emerald-100 group-hover:bg-white/15"
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.label}</span>
                <span
                  className={cn(
                    "block truncate text-xs font-medium",
                    active ? "text-emerald-700" : "text-emerald-100/55"
                  )}
                >
                  {item.description}
                </span>
              </span>
              {active && <ChevronRight className="size-4 text-emerald-600" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-[8px] border border-white/10 bg-white/[0.08] p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-50">
            <BarChart3 className="size-4 text-amber-300" />
            Vận hành hôm nay
          </div>
          <p className="mt-2 text-xs leading-5 text-emerald-100/70">
            Ưu tiên đơn mới, sản phẩm tồn thấp và các lô cần xử lý trong ngày.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authState, setAuthState] = useState({
    status: "checking",
    session: null,
  });
  const [sidebarStats, setSidebarStats] = useState({
    loading: true,
    todayOrders: 0,
    availableProductPercent: 0,
  });

  const activeItem = useMemo(() => getActiveItem(pathname), [pathname]);
  const pageTitle = activeItem?.label || "Dashboard";
  const isAuthPage = pathname === "/admin/login";
  const currentUser = authState.session?.currentUser;
  const adminName = currentUser?.name || "Admin";
  const adminRole = currentUser?.roleName || "Quản trị viên";
  const adminInitial = (adminName || currentUser?.email || "A")
    .charAt(0)
    .toUpperCase();
  const adminAvatarUrl = getAssetUrl(currentUser?.avatar);

  useEffect(() => {
    if (isAuthPage) {
      return undefined;
    }

    function syncAuthState() {
      setAuthState(getAdminAuthState());
    }

    const timeoutId = window.setTimeout(syncAuthState, 0);
    window.addEventListener("admin-auth-session-updated", syncAuthState);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("admin-auth-session-updated", syncAuthState);
    };
  }, [isAuthPage, pathname]);

  useEffect(() => {
    if (
      isAuthPage ||
      authState.status === "checking" ||
      authState.status === "authenticated"
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const currentRealState = getAdminAuthState();
      if (currentRealState.status === "authenticated") {
        setAuthState(currentRealState);
        return;
      }

      clearAuthSession(AUTH_SCOPES.admin);
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authState.status, isAuthPage, pathname, router]);

  useEffect(() => {
    if (isAuthPage || authState.status !== "authenticated") {
      return undefined;
    }

    let cancelled = false;

    async function loadSidebarStats() {
      setSidebarStats((current) => ({ ...current, loading: true }));
      try {
        const summary = await adminService.getDashboardSummary();
        if (cancelled) {
          return;
        }

        setSidebarStats({
          loading: false,
          todayOrders: Number(summary?.todayOrders || 0),
          availableProductPercent: getAvailableProductPercent(summary),
        });
      } catch {
        if (!cancelled) {
          setSidebarStats({
            loading: false,
            todayOrders: 0,
            availableProductPercent: 0,
          });
        }
      }
    }

    loadSidebarStats();

    return () => {
      cancelled = true;
    };
  }, [authState.status, isAuthPage]);

  function handleLogout() {
    clearAuthSession(AUTH_SCOPES.admin);
    setMobileOpen(false);
    router.replace("/admin/login");
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] xl:block">
        <SidebarContent
          pathname={pathname}
          sidebarStats={sidebarStats}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl">
            <SidebarContent
              pathname={pathname}
              sidebarStats={sidebarStats}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="xl:pl-[280px]">
        <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/88 backdrop-blur-xl">
          <div className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="xl:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>

            <div className="min-w-0">
              <p className="text-lg font-bold text-emerald-950">{pageTitle}</p>
              <p className="hidden text-sm text-muted-foreground sm:block">
                Quản trị đơn hàng, tồn kho và trải nghiệm mua nông sản tươi.
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="hidden border-emerald-100 bg-white text-emerald-800 shadow-sm sm:inline-flex"
              >
                <Bell className="size-4" />
              </Button>

              <Link
                href="/admin/profile"
                aria-label="Xem và chỉnh sửa hồ sơ admin"
                className="hidden items-center gap-3 rounded-[8px] border border-emerald-100 bg-white px-3 py-2 shadow-[0_10px_24px_rgba(15,61,38,0.08)] transition hover:border-emerald-200 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:flex"
              >
                {adminAvatarUrl ? (
                  <img
                    src={adminAvatarUrl}
                    alt={adminName}
                    className="size-9 rounded-[8px] object-cover"
                  />
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-[8px] bg-emerald-600 text-sm font-black text-white">
                    {adminInitial}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-emerald-950">
                    {adminName}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3 text-emerald-600" />
                    {adminRole}
                  </p>
                </div>
              </Link>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-emerald-100 bg-white text-emerald-800 shadow-sm"
                onClick={handleLogout}
                title="Đăng xuất"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
