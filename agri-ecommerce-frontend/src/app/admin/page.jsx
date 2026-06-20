"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  FolderTree,
  Leaf,
  MessageSquare,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  TicketPercent,
  Truck,
  Users,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/admin/data-table";
import { ModuleCard } from "@/components/admin/module-card";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { adminService } from "@/services/admin.service";
import {
  formatCurrency,
  formatNumber,
  getApiErrorMessage,
} from "@/lib/admin-utils";
import { mockOrders } from "@/lib/admin-mock-data";

const moduleCards = [
  {
    title: "Người dùng",
    description:
      "Theo dõi khách hàng, nhà bán, vai trò và trạng thái hoạt động.",
    href: "/admin/users",
    image: "/admin-assets/users.svg",
    icon: Users,
  },
  {
    title: "Danh mục",
    description:
      "Tổ chức nhóm rau củ, trái cây, gạo sạch và sản phẩm theo mùa.",
    href: "/admin/categories",
    image: "/admin-assets/categories.svg",
    icon: FolderTree,
  },
  {
    title: "Sản phẩm",
    description:
      "Kiểm tra tồn kho, giá bán, trạng thái mở bán và ảnh đại diện.",
    href: "/admin/products",
    image: "/admin-assets/products.svg",
    icon: PackageCheck,
  },
  {
    title: "Đơn hàng",
    description:
      "Theo dõi giỏ hàng, thanh toán, trạng thái xử lý và tổng tiền.",
    href: "/admin/orders",
    image: "/admin-assets/orders.svg",
    icon: ShoppingCart,
  },
  {
    title: "Giao hàng",
    description:
      "Phân công tuyến giao, kiểm tra tiến độ và đơn cần giao nhanh.",
    href: "/admin/delivery",
    image: "/admin-assets/delivery.svg",
    icon: Truck,
  },
  {
    title: "Mã giảm giá",
    description:
      "Tạo ưu đãi mùa vụ, bật tắt mã và theo dõi lượt sử dụng.",
    href: "/admin/coupons",
    image: "/admin-assets/coupons.svg",
    icon: TicketPercent,
  },
  {
    title: "Liên hệ",
    description:
      "Xem phản hồi khách hàng, yêu cầu hợp tác và trạng thái xử lý.",
    href: "/admin/contacts",
    image: "/admin-assets/contacts.svg",
    icon: MessageSquare,
  },
];

const operationSteps = [
  {
    title: "Kiểm đơn mới",
    description: "Ưu tiên đơn có rau lá, trái cây mềm và khung giao sớm.",
  },
  {
    title: "Đối soát kho",
    description: "Rà soát sản phẩm tồn thấp trước khi tiếp tục mở bán.",
  },
  {
    title: "Chốt tuyến giao",
    description: "Gom đơn theo khu vực để giữ hàng tươi và giảm thời gian.",
  },
];

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
    const deliveryOrders = mockOrders.filter((order) =>
      ["shipping", "processing"].includes(order.status)
    ).length;

    return { revenue, openOrders, deliveryOrders };
  }, []);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Bảng điều khiển AgriMarket"
        description="Theo dõi doanh thu, đơn hàng, tồn kho và các khu vực quản trị cốt lõi của sàn thương mại điện tử nông sản trong một màn hình."
        image="/admin-assets/dashboard.svg"
        badges={["Marketplace admin", "Nông sản tươi", "API + dữ liệu demo"]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Doanh thu"
          value={formatCurrency(orderStats.revenue)}
          description="Từ đơn đã giao hoặc hoàn tất"
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
          value={
            loading && !summary.userError ? "..." : formatNumber(summary.users)
          }
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
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {summary.userError || summary.productError || summary.categoryError}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {moduleCards.map((item) => {
          const Icon = item.icon;

          return (
            <ModuleCard
              key={item.href}
              title={item.title}
              description={item.description}
              href={item.href}
              image={item.image}
              meta={
                <span className="inline-flex min-w-0 items-center gap-1 truncate">
                  <Icon className="size-3" />
                  Mở trang quản lý
                </span>
              }
            />
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[8px] border border-emerald-100 bg-white shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-950">
              <AlertTriangle className="size-4 text-amber-500" />
              Tác vụ ưu tiên
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-amber-800">
              Kiểm tra {orderStats.openOrders} đơn đang chờ xử lý hoặc đang
              đóng gói.
            </div>
            <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
              Rà soát sản phẩm tồn kho thấp trước khi mở bán trong ngày.
            </div>
            <div className="rounded-[8px] border border-sky-200 bg-sky-50 p-3 text-sky-800">
              Theo dõi {orderStats.deliveryOrders} đơn cần điều phối giao nhanh.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[8px] border border-emerald-100 bg-white shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-950">
              <Leaf className="size-4 text-emerald-600" />
              Luồng vận hành đề xuất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {operationSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-[8px] border border-emerald-100 bg-[#f7fbf1] p-3"
                >
                  <div className="flex size-9 items-center justify-center rounded-[8px] bg-emerald-600 text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <p className="mt-3 font-bold text-emerald-950">
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-[8px] border border-emerald-100 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,61,38,0.05)]">
            <h3 className="flex items-center gap-2 font-black text-emerald-950">
              <BarChart3 className="size-4 text-emerald-600" />
              Đơn hàng gần đây
            </h3>
            <span className="text-xs font-bold text-muted-foreground">
              5 đơn mới nhất
            </span>
          </div>
          <DataTable
            columns={[
              "Mã đơn",
              "Khách hàng",
              "Trạng thái",
              "Thanh toán",
              "Tổng tiền",
            ]}
            data={mockOrders.slice(0, 5)}
            renderRow={(order) => (
              <TableRow key={order.id}>
                <TableCell className="px-4 font-bold">#{order.id}</TableCell>
                <TableCell className="px-4">{order.customerName}</TableCell>
                <TableCell className="px-4">
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="px-4 capitalize">
                  {order.paymentMethod}
                </TableCell>
                <TableCell className="px-4 font-bold text-emerald-700">
                  {formatCurrency(order.totalPrice)}
                </TableCell>
              </TableRow>
            )}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-[8px] border border-emerald-100 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,61,38,0.05)]">
            <h3 className="flex items-center gap-2 font-black text-emerald-950">
              <ShieldCheck className="size-4 text-sky-600" />
              Sản phẩm sắp hết hàng
            </h3>
            <span className="text-xs font-bold text-muted-foreground">
              Cần bổ sung
            </span>
          </div>
          <DataTable
            columns={["Sản phẩm", "Kho", "Đơn vị"]}
            data={summary.lowStockProducts}
            loading={loading && !summary.productError}
            error={summary.productError}
            emptyText="Không có sản phẩm sắp hết hàng"
            renderRow={(product) => (
              <TableRow key={product.id}>
                <TableCell className="px-4 font-bold">{product.name}</TableCell>
                <TableCell className="px-4">
                  <span className="rounded-[8px] bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                    {formatNumber(product.stock)}
                  </span>
                </TableCell>
                <TableCell className="px-4">{product.unit || "N/A"}</TableCell>
              </TableRow>
            )}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Chất lượng đầu vào",
            description:
              "Ưu tiên nhà cung cấp có nguồn gốc rõ và tần suất giao ổn định.",
            icon: ShieldCheck,
          },
          {
            title: "Giỏ hàng chuyển đổi",
            description:
              "Theo dõi danh mục bán chạy để sắp xếp sản phẩm lên trang chủ.",
            icon: ShoppingCart,
          },
          {
            title: "Ưu đãi mùa vụ",
            description:
              "Kích hoạt mã giảm giá theo mùa thu hoạch để tăng vòng quay kho.",
            icon: ArrowRight,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-[8px] border border-emerald-100 bg-white p-4 shadow-[0_16px_42px_rgba(15,61,38,0.06)]"
            >
              <div className="flex size-10 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <Icon className="size-5" />
              </div>
              <p className="mt-4 font-black text-emerald-950">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
