"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleDollarSign,
  FolderTree,
  PackageCheck,
  ShoppingCart,
  Users,
} from "lucide-react";

import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { adminService } from "@/services/admin.service";
import { formatCurrency, formatNumber, getApiErrorMessage } from "@/lib/admin-utils";
import { mockOrders } from "@/lib/admin-mock-data";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    users: 0,
    categories: 0,
    products: 0,
    lowStockProducts: [],
    userError: "",
    productError: "",
    categoryError: "",
  });

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);

      const [usersResult, categoriesResult, productsResult] =
        await Promise.allSettled([
          adminService.getUsers(),
          adminService.getCategories(),
          adminService.getProducts({ page: 0, size: 100, sort: "stock,asc" }),
        ]);

      if (!mounted) {
        return;
      }

      const users =
        usersResult.status === "fulfilled" && Array.isArray(usersResult.value)
          ? usersResult.value
          : [];
      const categories =
        categoriesResult.status === "fulfilled" &&
        Array.isArray(categoriesResult.value)
          ? categoriesResult.value
          : [];
      const productPage =
        productsResult.status === "fulfilled" ? productsResult.value : null;
      const products = productPage?.content || [];

      setSummary({
        users: users.length,
        categories: categories.length,
        products: productPage?.totalElements ?? products.length,
        lowStockProducts: products
          .filter((product) => Number(product.stock || 0) <= 20)
          .slice(0, 6),
        userError:
          usersResult.status === "rejected"
            ? getApiErrorMessage(usersResult.reason)
            : "",
        categoryError:
          categoriesResult.status === "rejected"
            ? getApiErrorMessage(categoriesResult.reason)
            : "",
        productError:
          productsResult.status === "rejected"
            ? getApiErrorMessage(productsResult.reason)
            : "",
      });
      setLoading(false);
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const orderStats = useMemo(() => {
    const revenue = mockOrders
      .filter((order) => ["delivered", "completed"].includes(order.status))
      .reduce((total, order) => total + Number(order.totalPrice || 0), 0);
    const openOrders = mockOrders.filter((order) =>
      ["pending", "processing"].includes(order.status)
    ).length;

    return { revenue, openOrders };
  }, []);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Doanh thu"
          value={formatCurrency(orderStats.revenue)}
          description="Đơn đã giao/hoàn tất"
          icon={CircleDollarSign}
          tone="green"
        />
        <StatCard
          title="Đơn hàng"
          value={formatNumber(mockOrders.length)}
          description={`${orderStats.openOrders} đơn đang mở`}
          icon={ShoppingCart}
          tone="blue"
        />
        <StatCard
          title="Người dùng"
          value={loading && !summary.userError ? "..." : formatNumber(summary.users)}
          description={summary.userError ? "Cần quyền admin" : "Từ API admin"}
          icon={Users}
          tone="amber"
        />
        <StatCard
          title="Danh mục"
          value={
            loading && !summary.categoryError
              ? "..."
              : formatNumber(summary.categories)
          }
          description={summary.categoryError ? "Chưa tải được" : "Từ public API"}
          icon={FolderTree}
          tone="rose"
        />
        <StatCard
          title="Sản phẩm"
          value={
            loading && !summary.productError
              ? "..."
              : formatNumber(summary.products)
          }
          description={summary.productError ? "Chưa tải được" : "Từ public API"}
          icon={PackageCheck}
          tone="green"
        />
      </section>

      {(summary.userError || summary.productError || summary.categoryError) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {summary.userError || summary.productError || summary.categoryError}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-lg border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Đơn hàng gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={["Mã đơn", "Khách hàng", "Trạng thái", "Thanh toán", "Tổng tiền"]}
              data={mockOrders.slice(0, 5)}
              renderRow={(order) => (
                <TableRow key={order.id}>
                  <TableCell className="px-4 font-medium">#{order.id}</TableCell>
                  <TableCell className="px-4">{order.customerName}</TableCell>
                  <TableCell className="px-4">
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="px-4 capitalize">
                    {order.paymentMethod}
                  </TableCell>
                  <TableCell className="px-4 font-medium">
                    {formatCurrency(order.totalPrice)}
                  </TableCell>
                </TableRow>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Sản phẩm sắp hết hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={["Sản phẩm", "Kho", "Đơn vị"]}
              data={summary.lowStockProducts}
              loading={loading && !summary.productError}
              error={summary.productError}
              emptyText="Không có sản phẩm sắp hết hàng"
              renderRow={(product) => (
                <TableRow key={product.id}>
                  <TableCell className="px-4 font-medium">{product.name}</TableCell>
                  <TableCell className="px-4">
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                      {formatNumber(product.stock)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">{product.unit || "N/A"}</TableCell>
                </TableRow>
              )}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
