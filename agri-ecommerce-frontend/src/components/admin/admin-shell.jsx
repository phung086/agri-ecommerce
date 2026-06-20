"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  FolderTree,
  LayoutDashboard,
  MessageSquare,
  Menu,
  PackageCheck,
  Search,
  ShoppingCart,
  TicketPercent,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Quản lí người dùng", icon: Users },
  { href: "/admin/categories", label: "Quản lí danh mục", icon: FolderTree },
  { href: "/admin/products", label: "Quản lí sản phẩm", icon: PackageCheck },
  { href: "/admin/orders", label: "Quản lí đơn hàng", icon: ShoppingCart },
  { href: "/admin/delivery", label: "Quản lí giao hàng", icon: Truck },
  { href: "/admin/coupons", label: "Quản lí mã giảm giá", icon: TicketPercent },
  { href: "/admin/contacts", label: "Quản lí liên hệ", icon: MessageSquare },
];

function SidebarContent({ pathname, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Boxes className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Agri Admin</p>
          <p className="truncate text-xs text-muted-foreground">Quản trị nông sản</p>
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
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted/60 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <BarChart3 className="size-4 text-emerald-600" />
            Phiên bản frontend
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Một số thao tác đang dùng dữ liệu demo.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = useMemo(() => {
    return (
      navItems.find(
        (item) =>
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href))
      )?.label || "Dashboard"
    );
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f6f8f5] text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background md:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 bg-black/20"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,20rem)] flex-col border-r bg-background shadow-xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3"
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

      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
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
              <h1 className="truncate text-lg font-semibold tracking-normal">
                {pageTitle}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Theo dõi vận hành cửa hàng và dữ liệu quản trị.
              </p>
            </div>

            <div className="hidden h-9 w-64 items-center gap-2 rounded-lg border bg-muted/30 px-3 text-sm text-muted-foreground lg:flex">
              <Search className="size-4" />
              <span className="truncate">Tìm nhanh trong từng trang</span>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-semibold text-emerald-700">
                A
              </div>
              <div className="hidden text-sm sm:block">
                <p className="font-medium leading-none">Admin</p>
                <p className="mt-1 text-xs text-muted-foreground">Quản trị viên</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
