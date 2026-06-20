"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Leaf,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingBasket,
  SlidersHorizontal,
  Star,
  Store,
  Truck,
} from "lucide-react";

import {
  formatCurrency,
  formatNumber,
  getAssetUrl,
  getApiErrorMessage,
} from "@/lib/admin-utils";
import { marketplaceService } from "@/services/marketplace.service";

const ALL_CATEGORY = "all";

const fallbackCategories = [
  { id: "fallback-rau-la", name: "Rau lá", slug: "rau-la" },
  { id: "fallback-trai-cay", name: "Trái cây", slug: "trai-cay" },
  { id: "fallback-gao-hat", name: "Gạo & hạt", slug: "gao-hat" },
  { id: "fallback-gia-vi", name: "Gia vị", slug: "gia-vi" },
  { id: "fallback-combo", name: "Combo", slug: "combo" },
];

const fallbackProducts = [
  {
    id: "fallback-1",
    name: "Rau hữu cơ Đà Lạt",
    categoryName: "Rau lá",
    categorySlug: "rau-la",
    origin: "Lâm Đồng",
    price: 34000,
    oldPrice: 42000,
    unit: "500g",
    rating: "4.9",
    sold: "1.2k",
    badge: "Giao sớm",
    position: "76% 32%",
  },
  {
    id: "fallback-2",
    name: "Cà chua bi VietGAP",
    categoryName: "Rau lá",
    categorySlug: "rau-la",
    origin: "Mộc Châu",
    price: 29000,
    oldPrice: 36000,
    unit: "300g",
    rating: "4.8",
    sold: "862",
    badge: "Bán chạy",
    position: "51% 82%",
  },
  {
    id: "fallback-3",
    name: "Xoài cát Hòa Lộc",
    categoryName: "Trái cây",
    categorySlug: "trai-cay",
    origin: "Tiền Giang",
    price: 89000,
    oldPrice: 108000,
    unit: "1kg",
    rating: "4.9",
    sold: "674",
    badge: "Ngọt mùa vụ",
    position: "82% 74%",
  },
  {
    id: "fallback-4",
    name: "Gạo ST25 túi vải",
    categoryName: "Gạo & hạt",
    categorySlug: "gao-hat",
    origin: "Sóc Trăng",
    price: 159000,
    oldPrice: 179000,
    unit: "5kg",
    rating: "4.9",
    sold: "2.4k",
    badge: "Chuẩn mới",
    position: "94% 74%",
  },
  {
    id: "fallback-5",
    name: "Cà rốt baby",
    categoryName: "Rau lá",
    categorySlug: "rau-la",
    origin: "Đà Lạt",
    price: 39000,
    oldPrice: 48000,
    unit: "500g",
    rating: "4.7",
    sold: "512",
    badge: "Tươi giòn",
    position: "64% 82%",
  },
  {
    id: "fallback-6",
    name: "Combo bữa xanh",
    categoryName: "Combo",
    categorySlug: "combo",
    origin: "Nhiều nông trại",
    price: 149000,
    oldPrice: 196000,
    unit: "4 món",
    rating: "4.8",
    sold: "941",
    badge: "Tiết kiệm",
    position: "72% 62%",
  },
];

const imagePositions = [
  "76% 32%",
  "51% 82%",
  "82% 74%",
  "94% 74%",
  "64% 82%",
  "72% 62%",
];

const trustItems = [
  { icon: Truck, label: "Giao trong 2 giờ", tone: "text-emerald-700" },
  { icon: ShieldCheck, label: "Truy xuất nguồn gốc", tone: "text-sky-700" },
  { icon: Clock3, label: "Thu hoạch mỗi sáng", tone: "text-amber-700" },
];

const deals = [
  {
    title: "Rau củ cho bữa tối",
    description: "Giảm đến 25% cho combo 4 món từ nông trại Đà Lạt.",
    icon: ShoppingBasket,
    tone: "bg-emerald-600 text-white",
  },
  {
    title: "Trái cây vào mùa",
    description: "Xoài, bưởi, chuối sạch được gom trong ngày.",
    icon: BadgePercent,
    tone: "bg-amber-400 text-amber-950",
  },
  {
    title: "Gạo ngon cuối tuần",
    description: "Miễn phí giao hàng cho đơn gạo từ 299.000đ.",
    icon: Store,
    tone: "bg-rose-500 text-white",
  },
];

function filterFallbackProducts(keyword, categorySlug) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  return fallbackProducts.filter((product) => {
    const matchesCategory =
      categorySlug === ALL_CATEGORY || product.categorySlug === categorySlug;
    const matchesKeyword =
      !normalizedKeyword ||
      [product.name, product.categoryName, product.origin]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword);

    return matchesCategory && matchesKeyword;
  });
}

function toProductCardModel(product, index) {
  const price = Number(product.price || 0);
  const hasOldPrice = Number(product.oldPrice || 0) > price;
  const imageUrl = product.thumbnail
    ? getAssetUrl(product.thumbnail)
    : "/market-assets/fresh-market-hero.png";
  const stock = Number(product.stock ?? 0);
  const hasStock = product.stock !== undefined && product.stock !== null;
  const stockLabel = hasStock
    ? stock > 0
      ? `còn ${formatNumber(stock)} ${product.unit || ""}`.trim()
      : "tạm hết hàng"
    : product.sold
      ? `đã bán ${product.sold}`
      : "đang cập nhật kho";

  return {
    id: product.id || product.slug || product.name,
    name: product.name || "Sản phẩm nông sản",
    category: product.categoryName || product.category || "Nông sản",
    origin: product.origin || product.categoryName || "Nông trại liên kết",
    price: formatCurrency(price),
    oldPrice: hasOldPrice ? formatCurrency(product.oldPrice) : "",
    unit: product.unit || "sản phẩm",
    rating: product.rating || (4.7 + (index % 3) * 0.1).toFixed(1),
    badge:
      product.badge ||
      (hasStock && stock <= 20 ? "Sắp hết" : "Tươi mới"),
    imageUrl,
    position: product.position || imagePositions[index % imagePositions.length],
    secondaryInfo: stockLabel,
    disabled: hasStock && stock <= 0,
  };
}

function ProductCard({ product }) {
  return (
    <article className="group overflow-hidden rounded-[8px] border border-emerald-100 bg-white shadow-[0_18px_50px_rgba(15,61,38,0.08)] transition hover:-translate-y-1 hover:border-emerald-200">
      <div
        className="relative h-44 bg-cover bg-center"
        style={{
          backgroundImage: `url("${product.imageUrl}")`,
          backgroundPosition: product.position,
        }}
      >
        <div className="absolute left-3 top-3 rounded-[8px] bg-white/92 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
          {product.badge}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-emerald-700">
              {product.category}
            </p>
            <h3 className="mt-1 line-clamp-1 text-base font-semibold text-slate-950">
              {product.name}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-[8px] bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            {product.rating}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="size-3.5 text-emerald-600" />
          {product.origin} - {product.secondaryInfo}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-emerald-700">
                {product.price}
              </span>
              {product.oldPrice && (
                <span className="text-xs text-slate-400 line-through">
                  {product.oldPrice}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">/{product.unit}</p>
          </div>

          <button
            type="button"
            disabled={product.disabled}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
          >
            <ShoppingBasket className="size-4" />
            Mua
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-[8px] border border-emerald-100 bg-white shadow-sm">
      <div className="h-44 animate-pulse bg-emerald-50" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-emerald-50" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-slate-100" />
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 animate-pulse rounded bg-emerald-50" />
          <div className="h-9 w-16 animate-pulse rounded-[8px] bg-emerald-100" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState(fallbackProducts);
  const [productsLoading, setProductsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);
  const [totalProducts, setTotalProducts] = useState(fallbackProducts.length);

  useEffect(() => {
    let ignore = false;

    async function loadCategories() {
      setCategoriesLoading(true);

      try {
        const response = await marketplaceService.getCategories();
        if (ignore) {
          return;
        }

        const nextCategories = Array.isArray(response) ? response : [];
        setCategories(nextCategories.length > 0 ? nextCategories : fallbackCategories);
      } catch {
        if (!ignore) {
          setCategories(fallbackCategories);
        }
      } finally {
        if (!ignore) {
          setCategoriesLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const keyword = searchTerm.trim();

    const timeoutId = window.setTimeout(async () => {
      if (!ignore) {
        setProductsLoading(true);
      }

      try {
        const params = {
          page: 0,
          size: 9,
          sort: "createdAt,desc",
          status: "in_stock",
          ...(keyword ? { keyword } : {}),
          ...(activeCategory !== ALL_CATEGORY
            ? { categorySlug: activeCategory }
            : {}),
        };
        const response = await marketplaceService.getProducts(params);

        if (ignore) {
          return;
        }

        const content = Array.isArray(response?.content)
          ? response.content
          : [];

        setProducts(content);
        setTotalProducts(response?.totalElements ?? content.length);
        setUsingFallback(false);
        setApiError("");
      } catch (error) {
        if (ignore) {
          return;
        }

        const fallback = filterFallbackProducts(keyword, activeCategory);
        setProducts(fallback);
        setTotalProducts(fallback.length);
        setUsingFallback(true);
        setApiError(getApiErrorMessage(error));
      } finally {
        if (!ignore) {
          setProductsLoading(false);
        }
      }
    }, 300);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeCategory, searchTerm]);

  const categoryOptions = useMemo(
    () => [
      { id: ALL_CATEGORY, name: "Tất cả", slug: ALL_CATEGORY },
      ...categories.map((category) => ({
        id: category.id || category.slug,
        name: category.name,
        slug: category.slug,
      })),
    ],
    [categories]
  );

  const productCards = useMemo(
    () => products.map((product, index) => toProductCardModel(product, index)),
    [products]
  );

  const marketStats = useMemo(
    () => [
      {
        value: `${formatNumber(Math.max(totalProducts, productCards.length))}+`,
        label: "sản phẩm đang mở bán",
      },
      {
        value: `${formatNumber(Math.max(categoryOptions.length - 1, 0))}+`,
        label: "danh mục nông sản",
      },
      { value: "4.9/5", label: "đánh giá người mua" },
    ],
    [categoryOptions.length, productCards.length, totalProducts]
  );

  return (
    <main className="min-h-screen bg-[#f7fbf1] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-emerald-600 text-white shadow-sm">
              <Leaf className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-emerald-950">
                AgriMarket
              </p>
              <p className="hidden text-xs font-medium text-emerald-700 sm:block">
                Nông sản tươi từ nông trại
              </p>
            </div>
          </Link>

          <div className="relative hidden flex-1 lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 w-full rounded-[8px] border border-emerald-100 bg-emerald-50/60 pl-9 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Tìm rau củ, trái cây, gạo sạch..."
            />
          </div>

          <nav className="ml-auto hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <a href="#categories" className="hover:text-emerald-700">
              Danh mục
            </a>
            <a href="#deals" className="hover:text-emerald-700">
              Ưu đãi
            </a>
            <a href="#products" className="hover:text-emerald-700">
              Sản phẩm
            </a>
          </nav>

          <Link
            href="/admin"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Admin
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-emerald-900/10 bg-white">
        <Image
          src="/market-assets/fresh-market-hero.png"
          alt="Rau củ tươi trong giỏ giao hàng"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.88)_38%,rgba(255,255,255,0.35)_68%,rgba(255,255,255,0.08)_100%)]" />

        <div className="relative mx-auto grid min-h-[560px] w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:min-h-[600px] lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div className="max-w-2xl space-y-7">
            <div className="inline-flex items-center gap-2 rounded-[8px] border border-emerald-200 bg-white/85 px-3 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm">
              <CheckCircle2 className="size-4" />
              Hàng tươi được chọn lọc mỗi ngày
            </div>

            <div className="space-y-4">
              <h1 className="max-w-xl text-5xl font-black leading-[1.02] tracking-normal text-emerald-950 sm:text-6xl lg:text-7xl">
                AgriMarket
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Sàn nông sản trực tuyến kết nối nông trại, nhà bán và người mua
                với trải nghiệm đặt hàng nhanh, giá rõ ràng và nguồn gốc minh
                bạch.
              </p>
            </div>

            <div className="grid gap-3 rounded-[8px] border border-emerald-100 bg-white/92 p-2 shadow-[0_18px_55px_rgba(15,61,38,0.12)] sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-12 w-full rounded-[8px] border border-transparent bg-emerald-50/70 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  placeholder="Bạn muốn mua gì hôm nay?"
                />
              </div>
              <a
                href="#products"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                <Search className="size-4" />
                Tìm nông sản
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trustItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-[8px] border border-white/70 bg-white/75 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                  >
                    <Icon className={`size-4 ${item.tone}`} />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid w-full max-w-7xl gap-3 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
        {marketStats.map((item) => (
          <div
            key={item.label}
            className="relative z-10 rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,61,38,0.08)]"
          >
            <p className="text-3xl font-black text-emerald-700">{item.value}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {item.label}
            </p>
          </div>
        ))}
      </section>

      <section
        id="categories"
        className="mx-auto w-full max-w-7xl space-y-4 px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">
              Đi chợ theo mùa
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-normal text-slate-950">
              Danh mục nông sản
            </h2>
          </div>
          <div className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800 shadow-sm">
            <SlidersHorizontal className="size-4" />
            {categoriesLoading ? "Đang tải danh mục" : "Lọc theo API"}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categoryOptions.map((category) => {
            const active = activeCategory === category.slug;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.slug)}
                className={`h-10 shrink-0 rounded-[8px] border px-4 text-sm font-bold transition ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-emerald-100 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </section>

      <section
        id="deals"
        className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:px-8"
      >
        {deals.map((deal) => {
          const Icon = deal.icon;

          return (
            <article
              key={deal.title}
              className={`${deal.tone} rounded-[8px] p-5 shadow-[0_18px_45px_rgba(15,61,38,0.08)]`}
            >
              <div className="flex items-start justify-between gap-3">
                <Icon className="size-7" />
                <ArrowRight className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-black">{deal.title}</h3>
              <p className="mt-2 text-sm leading-6 opacity-85">
                {deal.description}
              </p>
            </article>
          );
        })}
      </section>

      <section
        id="products"
        className="mx-auto w-full max-w-7xl space-y-5 px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-rose-600">
              {searchTerm.trim() ? "Kết quả tìm kiếm" : "Sản phẩm nổi bật"}
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-normal text-slate-950">
              Hàng tươi đang được đặt nhiều
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {productsLoading
                ? "Đang tải sản phẩm từ API..."
                : `${formatNumber(totalProducts)} sản phẩm phù hợp`}
            </p>
          </div>
          <Link
            href="/admin/products"
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Quản lý sản phẩm
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {(apiError || usingFallback) && (
          <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {usingFallback
              ? "Chưa kết nối được public API, đang hiển thị dữ liệu mẫu."
              : apiError}
          </div>
        )}

        {productsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProductSkeleton key={index} />
            ))}
          </div>
        ) : productCards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {productCards.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-emerald-100 bg-white p-10 text-center shadow-sm">
            <p className="font-semibold text-slate-800">
              Chưa có sản phẩm phù hợp.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Hãy thử từ khóa khác hoặc chọn lại danh mục.
            </p>
          </div>
        )}
      </section>

      <section className="border-y border-emerald-900/10 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">
              Chuỗi cung ứng rõ ràng
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950">
              Từ nông trại đến giỏ hàng trong một hành trình gọn gàng
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Chọn nông trại", "Kiểm chất lượng", "Giao tận cửa"].map(
              (step, index) => (
                <div
                  key={step}
                  className="rounded-[8px] border border-emerald-100 bg-[#f7fbf1] p-4"
                >
                  <div className="flex size-9 items-center justify-center rounded-[8px] bg-emerald-600 text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <p className="mt-4 font-bold text-slate-900">{step}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Mỗi bước ưu tiên độ tươi, minh bạch và tốc độ xử lý đơn.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
