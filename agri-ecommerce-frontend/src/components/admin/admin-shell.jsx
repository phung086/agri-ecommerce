"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  ChevronRight,
  Clock3,
  FolderTree,
  LayoutDashboard,
  Leaf,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  PackageCheck,
  Search,
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
import { getApiErrorMessage } from "@/lib/admin-utils";
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

function SidebarContent({ pathname, onNavigate }) {
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
              Sàn nông sản trực tuyến
            </p>
          </div>
        </Link>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-[8px] border border-white/10 bg-white/[0.08] p-3">
            <p className="text-lg font-bold leading-none">24</p>
            <p className="mt-1 text-[11px] font-medium text-emerald-100/70">
              đơn mới
            </p>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/[0.08] p-3">
            <p className="text-lg font-bold leading-none">98%</p>
            <p className="mt-1 text-[11px] font-medium text-emerald-100/70">
              sẵn hàng
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
            Trực vận hành hôm nay
          </div>
          <p className="mt-2 text-xs leading-5 text-emerald-100/70">
            Ưu tiên xử lý đơn tươi, tồn kho thấp và các chương trình khuyến mãi
            theo mùa.
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
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [authState, setAuthState] = useState({
    status: "checking",
    session: null,
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

    clearAuthSession(AUTH_SCOPES.admin);
    router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [authState.status, isAuthPage, pathname, router]);

  useEffect(() => {
    if (isAuthPage || authState.status !== "authenticated") {
      return undefined;
    }

    const keyword = searchTerm.trim();
    if (keyword.length < 2) {
      return undefined;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setSearchStatus("loading");
      setSearchMessage("");
      setSearchOpen(true);

      try {
        const results = await adminService.search(keyword);
        if (!active) {
          return;
        }

        setSearchResults(Array.isArray(results) ? results : []);
        setSearchStatus("done");
      } catch (err) {
        if (!active) {
          return;
        }

        setSearchResults([]);
        setSearchStatus("error");
        setSearchMessage(getApiErrorMessage(err));
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [authState.status, isAuthPage, searchTerm]);

  function handleSearchTermChange(event) {
    const value = event.target.value;
    setSearchTerm(value);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearchMessage("");
      setSearchStatus("idle");
      setSearchOpen(false);
    }
  }

  async function handleAdminSearch(event) {
    event.preventDefault();

    const keyword = searchTerm.trim();
    if (!keyword) {
      setSearchResults([]);
      setSearchMessage("Nhập từ khóa để tìm trong dữ liệu admin.");
      setSearchStatus("idle");
      setSearchOpen(true);
      return;
    }

    setSearchOpen(true);
    setSearchStatus("loading");
    setSearchMessage("");

    try {
      const results = await adminService.search(keyword);
      setSearchResults(Array.isArray(results) ? results : []);
      setSearchStatus("done");
    } catch (err) {
      setSearchResults([]);
      setSearchStatus("error");
      setSearchMessage(getApiErrorMessage(err));
    }
  }

  function handleSearchResultClick(result) {
    setSearchOpen(false);
    if (result?.targetUrl) {
      router.push(result.targetUrl);
    }
  }

  function handleLogout() {
    clearAuthSession(AUTH_SCOPES.admin);
    setMobileOpen(false);
    router.replace("/admin/login");
  }

  if (isAuthPage) {
    return children;
  }

  if (authState.status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6faef] px-4">
        <div className="w-full max-w-sm rounded-[8px] border border-emerald-100 bg-white p-5 text-center shadow-[0_18px_55px_rgba(15,61,38,0.08)]">
          <div className="mx-auto flex size-12 items-center justify-center rounded-[8px] bg-emerald-600 text-white">
            <Leaf className="size-6" />
          </div>
          <p className="mt-4 font-black text-emerald-950">
            Đang kiểm tra phiên đăng nhập
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Nếu phiên không hợp lệ, hệ thống sẽ chuyển bạn về màn hình đăng
            nhập.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6faef] text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-emerald-950/10 md:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 bg-emerald-950/45 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,22rem)] flex-col border-r border-emerald-950/10 shadow-2xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-10 text-white hover:bg-white/10 hover:text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
            >
              <X className="size-4" />
            </Button>
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="min-h-screen md:pl-72">
        <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/88 backdrop-blur-xl">
          <div className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="size-5" />
            </Button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-normal text-emerald-950">
                  {pageTitle}
                </h1>
                <span className="inline-flex h-6 items-center gap-1 rounded-[8px] bg-emerald-50 px-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                  <Store className="size-3" />
                  Marketplace
                </span>
              </div>
              <p className="hidden text-sm text-muted-foreground sm:block">
                Quản trị đơn hàng, tồn kho và trải nghiệm mua nông sản tươi.
              </p>
            </div>

            <form
              onSubmit={handleAdminSearch}
              className="relative hidden w-[min(32rem,36vw)] lg:block"
            >
              <div className="flex h-10 overflow-hidden rounded-[8px] border border-emerald-100 bg-emerald-50/70 text-sm shadow-sm transition focus-within:border-emerald-300 focus-within:ring-3 focus-within:ring-emerald-100">
                <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
                  <Search className="size-4 shrink-0 text-emerald-700" />
                  <input
                    value={searchTerm}
                    onChange={handleSearchTermChange}
                    onFocus={() => {
                      if (searchTerm.trim()) {
                        setSearchOpen(true);
                      }
                    }}
                    placeholder="Tìm đơn, sản phẩm, khách hàng..."
                    className="h-full min-w-0 flex-1 bg-transparent text-emerald-950 outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  type="submit"
                  size="icon-lg"
                  className="h-full rounded-none border-l border-emerald-100 bg-emerald-600 text-white hover:bg-emerald-700"
                  aria-label="Tìm kiếm"
                  title="Tìm kiếm"
                  disabled={searchStatus === "loading"}
                >
                  {searchStatus === "loading" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                </Button>
              </div>

              {searchOpen && (
                <div className="absolute right-0 top-12 z-40 w-full overflow-hidden rounded-[8px] border border-emerald-100 bg-white shadow-[0_18px_55px_rgba(15,61,38,0.14)]">
                  <div className="border-b border-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-normal text-emerald-700">
                    Kết quả tìm kiếm
                  </div>

                  {searchStatus === "loading" && (
                    <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin text-emerald-700" />
                      Đang tìm trong dữ liệu admin...
                    </div>
                  )}

                  {searchStatus !== "loading" && searchMessage && (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      {searchMessage}
                    </div>
                  )}

                  {searchStatus === "done" && searchResults.length === 0 && (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      Không tìm thấy dữ liệu phù hợp.
                    </div>
                  )}

                  {searchStatus !== "loading" && searchResults.length > 0 && (
                    <div className="max-h-[24rem] overflow-y-auto py-1">
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.type}-${result.id}-${index}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSearchResultClick(result)}
                          className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-emerald-50"
                        >
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-emerald-100 text-xs font-black text-emerald-700">
                            {result.groupLabel?.charAt(0) || "A"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-bold text-emerald-950">
                                {result.title}
                              </span>
                              <span className="shrink-0 rounded-[8px] bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                {result.groupLabel}
                              </span>
                            </span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground">
                              {result.subtitle || `ID #${result.id}`}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>

            <div className="hidden items-center gap-2 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 xl:flex">
              <Clock3 className="size-4" />
              Ca giao sáng
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="hidden border-emerald-100 bg-white text-emerald-800 shadow-sm sm:inline-flex"
              aria-label="Thông báo"
            >
              <Bell className="size-4" />
            </Button>

            <Link
              href="/admin/profile"
              className="flex items-center gap-3 rounded-[8px] border border-emerald-100 bg-white px-3 py-2 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
              title="Chỉnh sửa hồ sơ admin"
            >
              <div className="flex size-9 items-center justify-center rounded-[8px] bg-emerald-600 text-sm font-bold text-white">
                {adminInitial}
              </div>
              <div className="hidden text-sm sm:block">
                <p className="font-bold leading-none text-emerald-950">
                  {adminName}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3 text-emerald-600" />
                  {adminRole}
                </p>
              </div>
            </Link>

            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="border-emerald-100 bg-white text-emerald-800 shadow-sm"
              onClick={handleLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
