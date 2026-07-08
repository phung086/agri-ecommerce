"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Heart,
  Leaf,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import {
  formatCurrency,
  formatNumber,
  getApiErrorMessage,
  getAssetUrl,
  getImageBackground,
  setImageFallback,
} from "@/lib/admin-utils";
import {
  AUTH_SCOPES,
  clearAuthSession,
  getAuthSession,
  isAuthSessionExpired,
} from "@/lib/auth-storage";
import {
  addGuestCartItem,
  clearGuestCart,
  readGuestCart,
  removeGuestCartItem,
  updateGuestCartItem,
} from "@/lib/guest-cart-storage";
import { cartService } from "@/services/cart.service";
import { marketplaceService } from "@/services/marketplace.service";
import { reviewService } from "@/services/review.service";
import { wishlistService } from "@/services/wishlist.service";
import { useLanguage } from "@/i18n/language-provider";
import { localizeProduct, localizeCategory } from "@/i18n/localized-fields";

const ALL_CATEGORY = "all";
const PRODUCTS_PAGE_SIZE = 12;
const WISHLIST_STORAGE_KEY = "agri-market:wishlist";

const fallbackCategories = [
  {
    id: "rau-la",
    name: "Rau lÃ¡",
    slug: "rau-la",
    description: "Rau xanh thu hoáº¡ch má»—i sÃ¡ng tá»« ÄÃ  Láº¡t vÃ  Má»™c ChÃ¢u.",
  },
  {
    id: "trai-cay",
    name: "TrÃ¡i cÃ¢y",
    slug: "trai-cay",
    description: "TrÃ¡i cÃ¢y theo mÃ¹a, Ä‘Ã³ng gÃ³i trong ngÃ y.",
  },
  {
    id: "gao-hat",
    name: "Gáº¡o & háº¡t",
    slug: "gao-hat",
    description: "Gáº¡o sáº¡ch, háº¡t dinh dÆ°á»¡ng vÃ  nÃ´ng sáº£n khÃ´.",
  },
  {
    id: "combo",
    name: "Combo bá»¯a Äƒn",
    slug: "combo",
    description: "Set rau cá»§, trÃ¡i cÃ¢y vÃ  thá»±c pháº©m thiáº¿t yáº¿u.",
  },
];

const fallbackProducts = [
  {
    id: "fallback-1",
    slug: "rau-huu-co-da-lat",
    name: "Rau há»¯u cÆ¡ ÄÃ  Láº¡t",
    description:
      "Rau lÃ¡ Ä‘Æ°á»£c thu hoáº¡ch trong buá»•i sÃ¡ng, sÆ¡ cháº¿ nháº¹ vÃ  Ä‘Ã³ng gÃ³i mÃ¡t Ä‘á»ƒ giá»¯ Ä‘á»™ giÃ²n.",
    categoryName: "Rau lÃ¡",
    categorySlug: "rau-la",
    origin: "LÃ¢m Äá»“ng",
    price: 34000,
    oldPrice: 42000,
    unit: "500g",
    stock: 42,
    badge: "Giao sá»›m",
    imagePosition: "76% 32%",
  },
  {
    id: "fallback-2",
    slug: "ca-chua-bi-vietgap",
    name: "CÃ  chua bi VietGAP",
    description:
      "CÃ  chua bi má»ng nÆ°á»›c, vá»‹ chua ngá»t nháº¹, phÃ¹ há»£p salad vÃ  bá»¯a Äƒn gia Ä‘Ã¬nh.",
    categoryName: "Rau lÃ¡",
    categorySlug: "rau-la",
    origin: "Má»™c ChÃ¢u",
    price: 29000,
    oldPrice: 36000,
    unit: "300g",
    stock: 28,
    badge: "BÃ¡n cháº¡y",
    imagePosition: "51% 82%",
  },
  {
    id: "fallback-3",
    slug: "xoai-cat-hoa-loc",
    name: "XoÃ i cÃ¡t HÃ²a Lá»™c",
    description:
      "XoÃ i chÃ­n vá»«a, thÆ¡m rÃµ, Ä‘Æ°á»£c tuyá»ƒn theo Ä‘á»™ ngá»t vÃ  háº¡n cháº¿ dáº­p trong váº­n chuyá»ƒn.",
    categoryName: "TrÃ¡i cÃ¢y",
    categorySlug: "trai-cay",
    origin: "Tiá»n Giang",
    price: 89000,
    oldPrice: 108000,
    unit: "1kg",
    stock: 18,
    badge: "Ngá»t mÃ¹a vá»¥",
    imagePosition: "82% 74%",
  },
  {
    id: "fallback-4",
    slug: "gao-st25-tui-vai",
    name: "Gáº¡o ST25 tÃºi váº£i",
    description:
      "Gáº¡o thÆ¡m háº¡t dÃ i, Ä‘Ã³ng tÃºi váº£i 5kg, phÃ¹ há»£p gia Ä‘Ã¬nh dÃ¹ng háº±ng ngÃ y.",
    categoryName: "Gáº¡o & háº¡t",
    categorySlug: "gao-hat",
    origin: "SÃ³c TrÄƒng",
    price: 159000,
    oldPrice: 179000,
    unit: "5kg",
    stock: 64,
    badge: "Chuáº©n má»›i",
    imagePosition: "94% 74%",
  },
  {
    id: "fallback-5",
    slug: "ca-rot-baby",
    name: "CÃ  rá»‘t baby",
    description:
      "CÃ  rá»‘t non, ngá»t tá»± nhiÃªn, tiá»‡n cho mÃ³n háº¥p, Ã¡p cháº£o hoáº·c nÆ°á»›c Ã©p.",
    categoryName: "Rau lÃ¡",
    categorySlug: "rau-la",
    origin: "ÄÃ  Láº¡t",
    price: 39000,
    oldPrice: 48000,
    unit: "500g",
    stock: 11,
    badge: "TÆ°Æ¡i giÃ²n",
    imagePosition: "64% 82%",
  },
  {
    id: "fallback-6",
    slug: "combo-bua-xanh",
    name: "Combo bá»¯a xanh",
    description:
      "Bá»™ 4 mÃ³n rau cá»§ theo ngÃ y, Ä‘á»§ cho bá»¯a tá»‘i nhanh vÃ  cÃ¢n báº±ng.",
    categoryName: "Combo bá»¯a Äƒn",
    categorySlug: "combo",
    origin: "Nhiá»u nÃ´ng tráº¡i",
    price: 149000,
    oldPrice: 196000,
    unit: "4 mÃ³n",
    stock: 24,
    badge: "Tiáº¿t kiá»‡m",
    imagePosition: "72% 62%",
  },
  {
    id: "fallback-7",
    slug: "chuoi-cau-huu-co",
    name: "Chuá»‘i cau há»¯u cÆ¡",
    description:
      "Chuá»‘i chÃ­n tá»± nhiÃªn theo náº£i nhá», vá»‹ ngá»t thanh, dá»… dÃ¹ng cho bá»¯a sÃ¡ng.",
    categoryName: "TrÃ¡i cÃ¢y",
    categorySlug: "trai-cay",
    origin: "Äá»“ng Nai",
    price: 52000,
    oldPrice: 62000,
    unit: "1kg",
    stock: 35,
    badge: "Má»›i vá»",
    imagePosition: "58% 64%",
  },
  {
    id: "fallback-8",
    slug: "hat-dieu-rang-moc",
    name: "Háº¡t Ä‘iá»u rang má»™c",
    description:
      "Háº¡t Ä‘iá»u rang khÃ´ng táº©m vá»‹, giÃ²n nháº¹, Ä‘Ã³ng tÃºi zip tiá»‡n báº£o quáº£n.",
    categoryName: "Gáº¡o & háº¡t",
    categorySlug: "gao-hat",
    origin: "BÃ¬nh PhÆ°á»›c",
    price: 119000,
    oldPrice: 139000,
    unit: "250g",
    stock: 57,
    badge: "GiÃ u nÄƒng lÆ°á»£ng",
    imagePosition: "44% 70%",
  },
];

const sortOptions = [
  { value: "createdAt,desc", label: "Má»›i nháº¥t" },
  { value: "price,asc", label: "GiÃ¡ tÄƒng dáº§n" },
  { value: "price,desc", label: "GiÃ¡ giáº£m dáº§n" },
  { value: "name,asc", label: "TÃªn A-Z" },
];

const serviceSteps = [
  {
    title: "Chá»n sáº£n pháº©m",
    description: "TÃ¬m theo danh má»¥c, giÃ¡ hoáº·c tÃªn sáº£n pháº©m Ä‘ang cÃ³ trong kho.",
    icon: Search,
  },
  {
    title: "ÄÃ³ng gÃ³i",
    description: "ÄÆ¡n Ä‘Æ°á»£c kiá»ƒm láº¡i tá»“n kho, phÃ¢n loáº¡i vÃ  Ä‘Ã³ng gÃ³i mÃ¡t.",
    icon: Store,
  },
  {
    title: "Giao táº­n cá»­a",
    description: "Theo dÃµi tá»•ng tiá»n, phÃ­ giao dá»± kiáº¿n vÃ  nháº­n hÃ ng trong ngÃ y.",
    icon: Truck,
  },
];

function applyFallbackFilters(products, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const minPrice = Number(filters.minPrice || 0);
  const maxPrice = Number(filters.maxPrice || 0);

  return products
    .filter((product) => {
      const matchesKeyword =
        !keyword ||
        [product.name, product.description, product.categoryName, product.origin]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      const matchesCategory =
        filters.categorySlug === ALL_CATEGORY ||
        product.categorySlug === filters.categorySlug;
      const matchesMin = !minPrice || Number(product.price) >= minPrice;
      const matchesMax = !maxPrice || Number(product.price) <= maxPrice;

      return matchesKeyword && matchesCategory && matchesMin && matchesMax;
    })
    .sort((a, b) => {
      if (filters.sort === "price,asc") {
        return Number(a.price) - Number(b.price);
      }

      if (filters.sort === "price,desc") {
        return Number(b.price) - Number(a.price);
      }

      if (filters.sort === "name,asc") {
        return String(a.name).localeCompare(String(b.name), "vi");
      }

      return 0;
    });
}

function normalizeProduct(product, index = 0) {
  const price = Number(product.price || 0);
  const stock = Number(product.stock ?? 0);
  const imageBackground = getImageBackground(product.thumbnail);

  return {
    id: String(product.id || product.slug || product.name),
    slug: product.slug || String(product.id || product.name),
    name: product.name || "Sáº£n pháº©m nÃ´ng sáº£n",
    description:
      product.description ||
      "NÃ´ng sáº£n Ä‘Æ°á»£c tuyá»ƒn chá»n tá»« nhÃ  vÆ°á»n liÃªn káº¿t, cáº­p nháº­t tá»“n kho theo ngÃ y.",
    categoryName: product.categoryName || product.category || "NÃ´ng sáº£n",
    categorySlug: product.categorySlug || "",
    origin: product.origin || product.categoryName || "NÃ´ng tráº¡i liÃªn káº¿t",
    price,
    oldPrice:
      Number(product.oldPrice || 0) > price
        ? Number(product.oldPrice)
        : Math.round(price * (1.12 + (index % 3) * 0.03)),
    unit: product.unit || "sáº£n pháº©m",
    stock,
    averageRating: 0,
    totalReviews: 0,
    badge:
      product.badge ||
      (stock > 0 && stock <= 15 ? "Sáº¯p háº¿t" : index % 2 ? "TÆ°Æ¡i má»›i" : "ÄÃ¡ng mua"),
    imageBackground,
    imagePosition:
      product.imagePosition ||
      ["76% 32%", "51% 82%", "82% 74%", "94% 74%", "64% 82%"][index % 5],
    disabled: product.stock !== undefined && product.stock !== null && stock <= 0,
  };
}

function getActiveCustomerSession() {
  const session = getAuthSession(AUTH_SCOPES.customer);

  if (!session?.accessToken || isAuthSessionExpired(session)) {
    if (session?.accessToken) {
      clearAuthSession(AUTH_SCOPES.customer);
    }

    return null;
  }

  return session;
}

function mapCartResponseToItems(cartResponse) {
  return (cartResponse?.items || []).map((item, index) => {
    const price = Number(item.productPrice || 0);
    const stock = Number(item.stock ?? 0);
    const imageBackground = getImageBackground(item.thumbnail);

    return {
      id: String(item.productId),
      cartItemId: item.id,
      slug: item.productSlug || String(item.productId),
      name: item.productName || "Sáº£n pháº©m trong giá»",
      price,
      unit: item.unit || "sáº£n pháº©m",
      stock,
      quantity: Number(item.quantity || 0),
      imageBackground,
      imagePosition:
        ["76% 32%", "51% 82%", "82% 74%", "94% 74%", "64% 82%"][index % 5],
      status: item.status,
    };
  });
}

function mapGuestCartStorageToHomeItems(items) {
  return (items || []).map((item, index) => ({
    id: String(item.productId),
    slug: item.productSlug || String(item.productId),
    name: item.productName || "San pham trong gio",
    nameEn: item.productNameEn || "",
    price: Number(item.productPrice || 0),
    unit: item.unit || "san pham",
    unitEn: item.unitEn || "",
    stock: Number(item.stock ?? 0),
    quantity: Number(item.quantity || 0),
    imageBackground: getImageBackground(item.thumbnail),
    imagePosition:
      ["76% 32%", "51% 82%", "82% 74%", "94% 74%", "64% 82%"][index % 5],
    status: item.status,
  }));
}

function mapWishlistResponseToItems(wishlistResponse) {
  return (wishlistResponse?.items || []).map((item, index) => {
    const price = Number(item.productPrice || 0);
    const stock = Number(item.stock ?? 0);
    const imageBackground = getImageBackground(item.thumbnail);

    return {
      id: String(item.productId || item.id || index),
      wishlistItemId: item.id,
      productId: String(item.productId || item.id || index),
      slug: item.productSlug || String(item.productId || item.id || index),
      name: item.productName || "Sáº£n pháº©m yÃªu thÃ­ch",
      price,
      unit: item.unit || "sáº£n pháº©m",
      stock,
      imageBackground,
      imagePosition:
        ["76% 32%", "51% 82%", "82% 74%", "94% 74%", "64% 82%"][index % 5],
      status: item.status,
    };
  });
}

function mapProductToWishlistItem(product) {
  return {
    id: String(product.id),
    productId: String(product.id),
    slug: product.slug || String(product.id),
    name: product.name || "Sáº£n pháº©m yÃªu thÃ­ch",
    price: Number(product.price || 0),
    unit: product.unit || "sáº£n pháº©m",
    stock: Number(product.stock ?? 0),
    categoryName: product.categoryName || "NÃ´ng sáº£n",
    imageBackground: product.imageBackground,
    imagePosition: product.imagePosition,
    status: product.status,
    localOnly: true,
  };
}

function readStoredWishlist() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function writeStoredWishlist(items) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
}

function ProductCard({
  product,
  onAddToCart,
  onToggleWishlist,
  onViewProduct,
  recentlyAdded,
  wishlisted,
  wishlistUpdating,
}) {
  const salePercent = Math.max(
    0,
    Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
  );

  return (
    <article className="group relative overflow-hidden rounded-[8px] border border-emerald-100 bg-white shadow-[0_16px_42px_rgba(15,61,38,0.07)] transition hover:-translate-y-1 hover:border-emerald-200">
      <button
        type="button"
        onClick={() => onViewProduct(product)}
        className="relative block h-48 w-full overflow-hidden bg-emerald-50 text-left"
      >
        <span
          className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
          style={{
            backgroundImage: product.imageBackground,
            backgroundPosition: product.imagePosition,
          }}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-[8px] bg-white/95 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-sm">
          {product.badge}
        </span>
        {salePercent > 0 && (
          <span className="absolute right-3 top-3 rounded-[8px] bg-rose-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            -{salePercent}%
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onToggleWishlist(product)}
        disabled={wishlistUpdating}
        className={`absolute right-3 top-36 z-10 inline-flex size-10 items-center justify-center rounded-[8px] border shadow-sm backdrop-blur transition disabled:cursor-not-allowed disabled:opacity-60 ${
          wishlisted
            ? "border-rose-200 bg-rose-500 text-white hover:bg-rose-600"
            : "border-white/70 bg-white/92 text-slate-700 hover:bg-rose-50 hover:text-rose-600"
        }`}
        aria-label={wishlisted ? "Bá» khá»i yÃªu thÃ­ch" : "ThÃªm vÃ o yÃªu thÃ­ch"}
        title={wishlisted ? "Bá» khá»i yÃªu thÃ­ch" : "ThÃªm vÃ o yÃªu thÃ­ch"}
      >
        <Heart className={`size-5 ${wishlisted ? "fill-current" : ""}`} />
      </button>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-emerald-700">
              {product.categoryName}
            </p>
            <button
              type="button"
              onClick={() => onViewProduct(product)}
              className="mt-1 line-clamp-1 text-left text-base font-black text-slate-950 hover:text-emerald-700"
            >
              {product.name}
            </button>
          </div>
          {product.totalReviews > 0 && (
            <div className="flex shrink-0 items-center gap-1 rounded-[8px] bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {Number(product.averageRating || 0).toFixed(1)}
            </div>
          )}
        </div>

        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
          {product.description}
        </p>

        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">{product.origin}</span>
          </span>
          <span>{formatNumber(product.stock)} cÃ²n láº¡i</span>
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-emerald-100 pt-3">
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-black text-emerald-700">
                {formatCurrency(product.price)}
              </span>
              {product.oldPrice > product.price && (
                <span className="text-xs font-semibold text-slate-400 line-through">
                  {formatCurrency(product.oldPrice)}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500">/{product.unit}</p>
          </div>

          <button
            type="button"
            disabled={product.disabled}
            onClick={() => onAddToCart(product)}
            className={`inline-flex h-10 items-center gap-2 rounded-[8px] px-3 text-sm font-bold text-white transition disabled:bg-slate-200 disabled:text-slate-500 ${
              recentlyAdded
                ? "scale-[1.03] bg-emerald-600 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]"
                : "bg-slate-950 hover:bg-emerald-700"
            }`}
          >
            {recentlyAdded ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <ShoppingBasket className="size-4" />
            )}
            {recentlyAdded ? "ÄÃ£ thÃªm" : "ThÃªm"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-[8px] border border-emerald-100 bg-white shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
      <div className="h-48 animate-pulse bg-emerald-50" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-emerald-50" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
        <div className="flex items-center justify-between">
          <div className="h-6 w-28 animate-pulse rounded bg-emerald-50" />
          <div className="h-10 w-20 animate-pulse rounded-[8px] bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function CartDrawer({
  cart,
  cartOpen,
  subtotal,
  grandTotal,
  cartNotice,
  cartError,
  cartUpdating,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
  onClear,
  onCheckout,
}) {
  return (
    <div
      className={`fixed inset-0 z-50 transition ${
        cartOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!cartOpen}
    >
      <button
        type="button"
        aria-label="ÄÃ³ng giá» hÃ ng"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/25 backdrop-blur-sm transition-opacity ${
          cartOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-emerald-100 bg-white shadow-2xl transition-transform duration-300 ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-700">
              Giá» hÃ ng
            </p>
            <h2 className="text-xl font-black text-slate-950">
              {cart.length} sáº£n pháº©m
            </h2>
            {cartUpdating && (
              <p className="mt-1 text-xs font-bold text-emerald-700">
                Äang Ä‘á»“ng bá»™ giá» hÃ ng...
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-[8px] border border-emerald-100 text-slate-600 transition hover:bg-emerald-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {cart.length > 0 ? (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[72px_1fr] gap-3 rounded-[8px] border border-emerald-100 bg-white p-3 shadow-[0_10px_24px_rgba(15,61,38,0.04)]"
                >
                  <div
                    className="h-20 rounded-[8px] bg-cover bg-center"
                    style={{
                      backgroundImage: item.imageBackground,
                      backgroundPosition: item.imagePosition,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="line-clamp-1 font-bold text-slate-950">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {formatCurrency(item.price)} / {item.unit}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        disabled={cartUpdating}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex h-9 items-center rounded-[8px] border border-emerald-100">
                        <button
                          type="button"
                          onClick={() => onDecrease(item.id)}
                          disabled={cartUpdating}
                          className="inline-flex size-9 items-center justify-center text-slate-600 hover:text-emerald-700 disabled:opacity-50"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onIncrease(item.id)}
                          disabled={cartUpdating}
                          className="inline-flex size-9 items-center justify-center text-slate-600 hover:text-emerald-700 disabled:opacity-50"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <p className="font-black text-emerald-700">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-emerald-100 bg-[#f6faef] px-5 py-4">
              {(cartNotice || cartError) && (
                <div
                  className={`mb-3 rounded-[8px] border px-3 py-2 text-sm font-semibold ${
                    cartError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {cartError || cartNotice}
                </div>
              )}
              <div className="space-y-2 text-sm font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Táº¡m tÃ­nh</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>PhÃ­ giao dá»± kiáº¿n</span>
                  <span>TÃ­nh á»Ÿ checkout</span>
                </div>
                <div className="flex justify-between border-t border-emerald-100 pt-3 text-base font-black text-slate-950">
                  <span>Tá»•ng táº¡m tÃ­nh</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onCheckout}
                disabled={cartUpdating}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                <CreditCard className="size-4" />
                Thanh toÃ¡n
              </button>
              <button
                type="button"
                onClick={onClear}
                disabled={cartUpdating}
                className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-[8px] text-sm font-bold text-slate-500 transition hover:bg-white hover:text-rose-600 disabled:opacity-50"
              >
                XÃ³a giá» hÃ ng
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700">
              <ShoppingBasket className="size-8" />
            </div>
            <h3 className="mt-5 text-xl font-black text-slate-950">
              Giá» hÃ ng Ä‘ang trá»‘ng
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Chá»n vÃ i mÃ³n rau cá»§, trÃ¡i cÃ¢y hoáº·c combo tÆ°Æ¡i Ä‘á»ƒ báº¯t Ä‘áº§u Ä‘Æ¡n hÃ ng.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function WishlistDrawer({
  items,
  wishlistOpen,
  wishlistNotice,
  wishlistError,
  wishlistUpdating,
  onClose,
  onViewProduct,
  onAddToCart,
  onRemove,
}) {
  return (
    <div
      className={`fixed inset-0 z-50 transition ${
        wishlistOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!wishlistOpen}
    >
      <button
        type="button"
        aria-label="ÄÃ³ng danh sÃ¡ch yÃªu thÃ­ch"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/25 backdrop-blur-sm transition-opacity ${
          wishlistOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-rose-100 bg-white shadow-2xl transition-transform duration-300 ${
          wishlistOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-rose-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-rose-600">
              YÃªu thÃ­ch
            </p>
            <h2 className="text-xl font-black text-slate-950">
              {items.length} sáº£n pháº©m
            </h2>
            {wishlistUpdating && (
              <p className="mt-1 text-xs font-bold text-rose-600">
                Äang Ä‘á»“ng bá»™ yÃªu thÃ­ch...
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-[8px] border border-rose-100 text-slate-600 transition hover:bg-rose-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {(wishlistNotice || wishlistError) && (
          <div className="px-5 pt-4">
            <div
              className={`rounded-[8px] border px-3 py-2 text-sm font-semibold ${
                wishlistError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {wishlistError || wishlistNotice}
            </div>
          </div>
        )}

        {items.length > 0 ? (
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {items.map((item) => (
              <div
                key={item.productId}
                className="grid grid-cols-[76px_1fr] gap-3 rounded-[8px] border border-rose-100 bg-white p-3 shadow-[0_10px_24px_rgba(15,61,38,0.04)]"
              >
                <button
                  type="button"
                  onClick={() => onViewProduct(item)}
                  className="h-20 rounded-[8px] bg-rose-50 bg-cover bg-center"
                  style={{
                    backgroundImage: item.imageBackground,
                    backgroundPosition: item.imagePosition,
                  }}
                  aria-label={`Xem ${item.name}`}
                />
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onViewProduct(item)}
                      className="min-w-0 text-left"
                    >
                      <h3 className="line-clamp-1 font-bold text-slate-950 hover:text-rose-600">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {formatCurrency(item.price)} / {item.unit}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      disabled={wishlistUpdating}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      aria-label="Bá» khá»i yÃªu thÃ­ch"
                      title="Bá» khá»i yÃªu thÃ­ch"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-xs font-semibold text-slate-500">
                      {formatNumber(item.stock)} cÃ²n láº¡i
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddToCart(item)}
                      disabled={wishlistUpdating || Number(item.stock || 0) <= 0}
                      className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      <ShoppingBasket className="size-4" />
                      ThÃªm
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-[8px] bg-rose-50 text-rose-600">
              <Heart className="size-8" />
            </div>
            <h3 className="mt-5 text-xl font-black text-slate-950">
              ChÆ°a cÃ³ sáº£n pháº©m yÃªu thÃ­ch
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Báº¥m trÃ¡i tim trÃªn sáº£n pháº©m Ä‘á»ƒ lÆ°u láº¡i vÃ  xem nhanh á»Ÿ Ä‘Ã¢y.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [filters, setFilters] = useState({
    keyword: "",
    categorySlug: ALL_CATEGORY,
    minPrice: "",
    maxPrice: "",
    sort: "createdAt,desc",
  });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState(fallbackProducts);
  const [totalProducts, setTotalProducts] = useState(fallbackProducts.length);
  const [currentPage, setCurrentPage] = useState(0);
  const [reviewSummaries, setReviewSummaries] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [apiError, setApiError] = useState("");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartUpdating, setCartUpdating] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const [cartError, setCartError] = useState("");
  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [wishlistUpdating, setWishlistUpdating] = useState(false);
  const [wishlistNotice, setWishlistNotice] = useState("");
  const [wishlistError, setWishlistError] = useState("");
  const [wishlistPulse, setWishlistPulse] = useState(false);
  const [hoveredCategorySlug, setHoveredCategorySlug] = useState("");
  const [recentlyAddedProductId, setRecentlyAddedProductId] = useState("");
  const [cartPulse, setCartPulse] = useState(false);
  const [catalogPreviewProducts, setCatalogPreviewProducts] =
    useState(fallbackProducts);
  const [currentUser, setCurrentUser] = useState(null);

  const currentUserAvatarUrl = getAssetUrl(currentUser?.avatar);

  useEffect(() => {
    function syncCurrentUser() {
      const session = getActiveCustomerSession();
      setCurrentUser(session?.currentUser || null);
    }

    syncCurrentUser();
    window.addEventListener("customer-auth-session-updated", syncCurrentUser);
    window.addEventListener("storage", syncCurrentUser);

    return () => {
      window.removeEventListener("customer-auth-session-updated", syncCurrentUser);
      window.removeEventListener("storage", syncCurrentUser);
    };
  }, []);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchWrapperRef = useRef(null);

  useEffect(() => {
    const cleanKeyword = filters.keyword.trim();
    const handler = setTimeout(async () => {
      if (!cleanKeyword) {
        setSuggestions([]);
        setShowSuggestions(false);
        setSuggestionsLoading(false);
        return;
      }

      setSuggestionsLoading(true);
      try {
        const response = await marketplaceService.getSearchSuggestions(cleanKeyword, 8);
        setSuggestions(Array.isArray(response) ? response : []);
        setShowSuggestions(true);
        setActiveSuggestionIndex(-1);
      } catch (error) {
        console.error("Failed to load search suggestions:", error);
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, cleanKeyword ? 250 : 0);

    return () => {
      clearTimeout(handler);
    };
  }, [filters.keyword]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleKeyDown = (event) => {
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((prevIndex) =>
        prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1
      );
    } else if (event.key === "Enter") {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        event.preventDefault();
        const selected = suggestions[activeSuggestionIndex];
        openProductDetail(selected);
        setShowSuggestions(false);
      }
    } else if (event.key === "Escape") {
      setShowSuggestions(false);
    }
  };

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
    const timeoutId = window.setTimeout(async () => {
      const session = getActiveCustomerSession();

      if (!session) {
        setCart(mapGuestCartStorageToHomeItems(readGuestCart()));
        return;
      }

      setCartUpdating(true);
      setCartError("");

      try {
        const response = await cartService.getCart();

        if (!ignore) {
          setCart(mapCartResponseToItems(response));
        }
      } catch (error) {
        if (!ignore) {
          setCartError(
            error?.message || "KhÃ´ng thá»ƒ táº£i giá» hÃ ng tá»« tÃ i khoáº£n cá»§a báº¡n."
          );
        }
      } finally {
        if (!ignore) {
          setCartUpdating(false);
        }
      }
    }, 0);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const timeoutId = window.setTimeout(async () => {
      const session = getActiveCustomerSession();

      if (!session) {
        setWishlistItems(readStoredWishlist());
        return;
      }

      setWishlistUpdating(true);
      setWishlistError("");

      try {
        const response = await wishlistService.getWishlist();

        if (!ignore) {
          setWishlistItems(mapWishlistResponseToItems(response));
        }
      } catch (error) {
        if (!ignore) {
          setWishlistItems([]);
          setWishlistError(
            error?.message ||
              "KhÃ´ng thá»ƒ táº£i danh sÃ¡ch yÃªu thÃ­ch tá»« tÃ i khoáº£n cá»§a báº¡n."
          );
        }
      } finally {
        if (!ignore) {
          setWishlistUpdating(false);
        }
      }
    }, 0);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const timeoutId = window.setTimeout(async () => {
      if (!ignore) {
        setProductsLoading(true);
      }

      try {
        const params = {
          page: currentPage,
          size: PRODUCTS_PAGE_SIZE,
          status: "in_stock",
          sort: filters.sort,
          ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
          ...(filters.categorySlug !== ALL_CATEGORY
            ? { categorySlug: filters.categorySlug }
            : {}),
          ...(filters.minPrice ? { minPrice: filters.minPrice } : {}),
          ...(filters.maxPrice ? { maxPrice: filters.maxPrice } : {}),
        };
        const response = await marketplaceService.getProducts(params);

        if (ignore) {
          return;
        }

        const content = Array.isArray(response?.content) ? response.content : [];
        setProducts(content);
        setTotalProducts(response?.totalElements ?? content.length);
        setUsingFallback(false);
        setApiError("");
      } catch (error) {
        if (ignore) {
          return;
        }

        const fallback = applyFallbackFilters(fallbackProducts, filters);
        const pageStart = currentPage * PRODUCTS_PAGE_SIZE;
        setProducts(fallback.slice(pageStart, pageStart + PRODUCTS_PAGE_SIZE));
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
  }, [currentPage, filters]);

  useEffect(() => {
    let ignore = false;

    async function loadPreviewProducts() {
      try {
        const response = await marketplaceService.getProducts({
          page: 0,
          size: 24,
          status: "in_stock",
          sort: "createdAt,desc",
        });

        if (ignore) {
          return;
        }

        const content = Array.isArray(response?.content) ? response.content : [];
        setCatalogPreviewProducts(content.length > 0 ? content : fallbackProducts);
      } catch {
        if (!ignore) {
          setCatalogPreviewProducts(fallbackProducts);
        }
      }
    }

    loadPreviewProducts();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!recentlyAddedProductId && !cartPulse) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setRecentlyAddedProductId("");
      setCartPulse(false);
    }, 1100);

    return () => window.clearTimeout(timeoutId);
  }, [cartPulse, recentlyAddedProductId]);

  useEffect(() => {
    if (!wishlistPulse) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setWishlistPulse(false);
    }, 1100);

    return () => window.clearTimeout(timeoutId);
  }, [wishlistPulse]);

  const categoryOptions = useMemo(
    () => [
      {
        id: ALL_CATEGORY,
        name: "Táº¥t cáº£",
        slug: ALL_CATEGORY,
        image: "",
        description: "Táº¥t cáº£ sáº£n pháº©m Ä‘ang má»Ÿ bÃ¡n.",
      },
      ...categories.map((category) => ({
        id: category.id || category.slug,
        name: category.name,
        slug: category.slug,
        image: category.image || "",
        description: category.description || "NÃ´ng sáº£n Ä‘Æ°á»£c cáº­p nháº­t theo mÃ¹a.",
      })),
    ],
    [categories]
  );

  const productCards = useMemo(
    () => products.map((product, index) => normalizeProduct(product, index)),
    [products]
  );

  useEffect(() => {
    let ignore = false;
    const slugs = Array.from(
      new Set(productCards.map((product) => product.slug).filter(Boolean))
    );

    if (slugs.length === 0) {
      return undefined;
    }

    async function loadReviewSummaries() {
      const entries = await Promise.all(
        slugs.map(async (slug) => {
          try {
            const response = await reviewService.getProductReviews(slug, {
              page: 0,
              size: 1,
              sort: "createdAt,desc",
            });
            const summary = response?.summary || {};

            return [
              slug,
              {
                averageRating: Number(summary.averageRating || 0),
                totalReviews: Number(summary.totalReviews || 0),
              },
            ];
          } catch {
            return [
              slug,
              {
                averageRating: 0,
                totalReviews: 0,
              },
            ];
          }
        })
      );

      if (!ignore) {
        setReviewSummaries((current) => ({
          ...current,
          ...Object.fromEntries(entries),
        }));
      }
    }

    loadReviewSummaries();

    return () => {
      ignore = true;
    };
  }, [productCards]);

  const productCardsWithReviews = useMemo(
    () =>
      productCards.map((product) => ({
        ...product,
        ...(reviewSummaries[product.slug] || {}),
      })),
    [productCards, reviewSummaries]
  );

  const featuredProducts = useMemo(
    () => productCardsWithReviews.filter((product) => !product.disabled).slice(0, 4),
    [productCardsWithReviews]
  );

  const previewProductCards = useMemo(
    () =>
      catalogPreviewProducts.map((product, index) =>
        normalizeProduct(product, index)
      ),
    [catalogPreviewProducts]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const wishlistProductIds = useMemo(
    () => new Set(wishlistItems.map((item) => String(item.productId))),
    [wishlistItems]
  );

  const wishlistCount = wishlistItems.length;

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const grandTotal = subtotal;
  const totalProductPages = Math.max(
    1,
    Math.ceil(Number(totalProducts || 0) / PRODUCTS_PAGE_SIZE)
  );
  const paginationPages = useMemo(() => {
    const visibleCount = Math.min(totalProductPages, 5);
    const maxStart = Math.max(totalProductPages - visibleCount, 0);
    const start = Math.min(Math.max(currentPage - 2, 0), maxStart);

    return Array.from({ length: visibleCount }, (_, index) => start + index);
  }, [currentPage, totalProductPages]);

  const activeCategoryName =
    categoryOptions.find((category) => category.slug === filters.categorySlug)
      ?.name || "Táº¥t cáº£";

  const previewCategorySlug = hoveredCategorySlug || filters.categorySlug;
  const previewCategoryName =
    categoryOptions.find((category) => category.slug === previewCategorySlug)
      ?.name || activeCategoryName;
  const categoryPreviewProducts = previewProductCards
    .filter(
      (product) =>
        previewCategorySlug === ALL_CATEGORY ||
        product.categorySlug === previewCategorySlug
    )
    .slice(0, 4);

  const marketStats = [
    {
      value: `${formatNumber(Math.max(totalProducts, productCards.length))}+`,
      label: t("Sáº£n pháº©m sáºµn sÃ ng"),
      icon: ShoppingBasket,
      description: t("Äang má»Ÿ bÃ¡n táº¡i cá»­a hÃ ng"),
      tone: "green",
    },
    {
      value: `${formatNumber(Math.max(categoryOptions.length - 1, 0))}+`,
      label: t("NhÃ³m nÃ´ng sáº£n"),
      icon: Leaf,
      description: t("Lá»c nhanh theo nhu cáº§u"),
      tone: "amber",
    },
    {
      value: "2h",
      label: t("Giao nhanh ná»™i thÃ nh"),
      icon: Truck,
      description: t("Æ¯á»›c tÃ­nh giao trong ngÃ y"),
      tone: "blue",
    },
  ];

  function updateFilter(key, value) {
    setCurrentPage(0);
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFilters() {
    setCurrentPage(0);
    setFilters({
      keyword: "",
      categorySlug: ALL_CATEGORY,
      minPrice: "",
      maxPrice: "",
      sort: "createdAt,desc",
    });
  }

  function openProductDetail(product) {
    if (!product?.slug) {
      return;
    }

    router.push(`/products/${encodeURIComponent(product.slug)}`);
  }

  function showAddToCartFeedback(product) {
    setRecentlyAddedProductId(String(product.id));
    setCartPulse(true);
  }

  async function addToCart(product) {
    setCartNotice("");
    setCartError("");

    const session = getActiveCustomerSession();

    if (session) {
      const productId = Number(product.id);

      if (!Number.isFinite(productId)) {
        setCartError("Sáº£n pháº©m máº«u chÆ°a thá»ƒ thÃªm vÃ o giá» tÃ i khoáº£n.");
        window.alert("Sáº£n pháº©m máº«u chÆ°a thá»ƒ thÃªm vÃ o giá» tÃ i khoáº£n.");
        return false;
      }

      setCartUpdating(true);

      try {
        const response = await cartService.addItem({
          productId,
          quantity: 1,
        });
        setCart(mapCartResponseToItems(response));
        setCartNotice("ÄÃ£ thÃªm sáº£n pháº©m vÃ o giá» hÃ ng cá»§a báº¡n.");
        showAddToCartFeedback(product);
        return true;
      } catch (error) {
        setCartError(error?.message || "KhÃ´ng thá»ƒ thÃªm sáº£n pháº©m vÃ o giá».");
        window.alert(error?.message || "KhÃ´ng thá»ƒ thÃªm sáº£n pháº©m vÃ o giá».");
        return false;
      } finally {
        setCartUpdating(false);
      }
    }

    const nextItems = addGuestCartItem(product, 1);
    setCart(mapGuestCartStorageToHomeItems(nextItems));
    setCartNotice("Gio hang dang luu tam tren trinh duyet. Ban co the thanh toan nhanh khong can dang nhap.");
    showAddToCartFeedback(product);
    return true;
  }

  async function addWishlistItemToCart(item) {
    setWishlistNotice("");
    setWishlistError("");

    const added = await addToCart(item);

    if (added) {
      setWishlistNotice(`ÄÃ£ thÃªm ${item.name} vÃ o giá» hÃ ng.`);
      return;
    }

    setWishlistError("KhÃ´ng thá»ƒ thÃªm sáº£n pháº©m vÃ o giá» hÃ ng.");
  }

  async function toggleWishlist(product) {
    if (!product) {
      return;
    }

    setWishlistNotice("");
    setWishlistError("");

    const productKey = String(product.id);
    const isWishlisted = wishlistProductIds.has(productKey);
    const session = getActiveCustomerSession();
    const productId = Number(product.id);

    if (session && Number.isFinite(productId)) {
      setWishlistUpdating(true);

      try {
        const response = isWishlisted
          ? await wishlistService.removeItem(productId)
          : await wishlistService.addItem({ productId });

        setWishlistItems(mapWishlistResponseToItems(response));
        setWishlistNotice(
          isWishlisted
            ? "ÄÃ£ bá» sáº£n pháº©m khá»i danh sÃ¡ch yÃªu thÃ­ch."
            : "ÄÃ£ thÃªm sáº£n pháº©m vÃ o danh sÃ¡ch yÃªu thÃ­ch."
        );

        if (!isWishlisted) {
          setWishlistPulse(true);
        }
      } catch (error) {
        setWishlistError(
          error?.message || "KhÃ´ng thá»ƒ cáº­p nháº­t danh sÃ¡ch yÃªu thÃ­ch."
        );
      } finally {
        setWishlistUpdating(false);
      }

      return;
    }

    setWishlistItems((current) => {
      const nextItems = isWishlisted
        ? current.filter((item) => String(item.productId) !== productKey)
        : [mapProductToWishlistItem(product), ...current];

      writeStoredWishlist(nextItems);
      return nextItems;
    });
    setWishlistNotice(
      isWishlisted
        ? "ÄÃ£ bá» sáº£n pháº©m khá»i danh sÃ¡ch yÃªu thÃ­ch."
        : "ÄÃ£ lÆ°u sáº£n pháº©m yÃªu thÃ­ch trÃªn trÃ¬nh duyá»‡t."
    );

    if (!isWishlisted) {
      setWishlistPulse(true);
    }
  }

  async function removeWishlistItem(item) {
    if (!item) {
      return;
    }

    setWishlistNotice("");
    setWishlistError("");

    const productKey = String(item.productId);
    const session = getActiveCustomerSession();
    const productId = Number(item.productId);

    if (session && Number.isFinite(productId) && !item.localOnly) {
      setWishlistUpdating(true);

      try {
        const response = await wishlistService.removeItem(productId);
        setWishlistItems(mapWishlistResponseToItems(response));
        setWishlistNotice("ÄÃ£ bá» sáº£n pháº©m khá»i danh sÃ¡ch yÃªu thÃ­ch.");
      } catch (error) {
        setWishlistError(error?.message || "KhÃ´ng thá»ƒ bá» sáº£n pháº©m yÃªu thÃ­ch.");
      } finally {
        setWishlistUpdating(false);
      }

      return;
    }

    setWishlistItems((current) => {
      const nextItems = current.filter(
        (currentItem) => String(currentItem.productId) !== productKey
      );
      writeStoredWishlist(nextItems);
      return nextItems;
    });
    setWishlistNotice("ÄÃ£ bá» sáº£n pháº©m khá»i danh sÃ¡ch yÃªu thÃ­ch.");
  }

  async function increaseCartItem(id) {
    setCartNotice("");
    setCartError("");
    const item = cart.find((currentItem) => currentItem.id === id);

    if (item?.cartItemId) {
      const nextQuantity = Math.min(item.quantity + 1, item.stock || 99);

      if (nextQuantity === item.quantity) {
        setCartError("Sá»‘ lÆ°á»£ng Ä‘Ã£ Ä‘áº¡t tá»“n kho hiá»‡n táº¡i.");
        return;
      }

      setCartUpdating(true);

      try {
        const response = await cartService.updateItem(item.cartItemId, {
          quantity: nextQuantity,
        });
        setCart(mapCartResponseToItems(response));
      } catch (error) {
        setCartError(error?.message || "KhÃ´ng thá»ƒ cáº­p nháº­t sá»‘ lÆ°á»£ng.");
      } finally {
        setCartUpdating(false);
      }

      return;
    }

    setCart(
      mapGuestCartStorageToHomeItems(
        updateGuestCartItem(id, Math.min(item.quantity + 1, item.stock || 99))
      )
    );
  }

  async function decreaseCartItem(id) {
    setCartNotice("");
    setCartError("");
    const item = cart.find((currentItem) => currentItem.id === id);

    if (item?.cartItemId) {
      if (item.quantity <= 1) {
        await removeCartItem(id);
        return;
      }

      setCartUpdating(true);

      try {
        const response = await cartService.updateItem(item.cartItemId, {
          quantity: item.quantity - 1,
        });
        setCart(mapCartResponseToItems(response));
      } catch (error) {
        setCartError(error?.message || "KhÃ´ng thá»ƒ cáº­p nháº­t sá»‘ lÆ°á»£ng.");
      } finally {
        setCartUpdating(false);
      }

      return;
    }

    setCart(mapGuestCartStorageToHomeItems(updateGuestCartItem(id, item.quantity - 1)));
  }

  async function removeCartItem(id) {
    setCartNotice("");
    setCartError("");
    const item = cart.find((currentItem) => currentItem.id === id);

    if (item?.cartItemId) {
      setCartUpdating(true);

      try {
        const response = await cartService.removeItem(item.cartItemId);
        setCart(mapCartResponseToItems(response));
      } catch (error) {
        setCartError(error?.message || "KhÃ´ng thá»ƒ xÃ³a sáº£n pháº©m khá»i giá».");
      } finally {
        setCartUpdating(false);
      }

      return;
    }

    setCart(mapGuestCartStorageToHomeItems(removeGuestCartItem(id)));
  }

  async function clearCart() {
    setCartNotice("");
    setCartError("");

    const hasServerCartItems = cart.some((item) => item.cartItemId);

    if (hasServerCartItems) {
      setCartUpdating(true);

      try {
        const response = await cartService.clearCart();
        setCart(mapCartResponseToItems(response));
        setCartNotice("ÄÃ£ xÃ³a toÃ n bá»™ giá» hÃ ng.");
      } catch (error) {
        setCartError(error?.message || "KhÃ´ng thá»ƒ xÃ³a giá» hÃ ng.");
      } finally {
        setCartUpdating(false);
      }

      return;
    }

    clearGuestCart();
    setCart([]);
  }

  function handleCheckout() {
    setCartNotice("");
    setCartError("");

    if (cart.length === 0) {
      setCartError("Giá» hÃ ng Ä‘ang trá»‘ng.");
      return;
    }

    router.push("/checkout");
  }

  return (
    <main className="min-h-screen bg-[#f6faef] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-[1480px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:gap-4 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-emerald-600 text-white shadow-sm">
              <Leaf className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-emerald-950">
                AgriMarket
              </p>
              <p className="hidden text-xs font-medium text-emerald-700 sm:block">
                NÃ´ng sáº£n tÆ°Æ¡i tá»« nÃ´ng tráº¡i
              </p>
            </div>
          </Link>

          <div ref={searchWrapperRef} className="order-last grid w-full gap-2 sm:grid-cols-[1fr_auto] lg:order-none lg:flex-1 relative">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.keyword}
                onChange={(event) => {
                  updateFilter("keyword", event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                className="h-10 w-full rounded-[8px] border border-emerald-100 bg-emerald-50/70 pl-9 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                placeholder="TÃ¬m rau cá»§, trÃ¡i cÃ¢y, gáº¡o sáº¡ch..."
              />

              {showSuggestions && (suggestions.length > 0 || suggestionsLoading) && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-[360px] overflow-y-auto rounded-lg border border-emerald-100/60 bg-white/95 p-1.5 shadow-xl backdrop-blur-md transition-all duration-200">
                  {suggestionsLoading ? (
                    <div className="flex items-center justify-center py-6 text-emerald-600">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span className="text-xs font-semibold">Äang tÃ¬m kiáº¿m nÃ´ng sáº£n...</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-1">
                        {suggestions.map((item, index) => {
                          const localizedItem = localizeProduct(item, locale) || item;
                          const isActive = index === activeSuggestionIndex;
                          const imageSrc = item.thumbnail ? getAssetUrl(item.thumbnail) : "";
                          const productUrl = `/products/${encodeURIComponent(item.slug)}`;

                          return (
                            <Link
                              key={item.id}
                              href={productUrl}
                              onClick={() => setShowSuggestions(false)}
                              className={`flex items-center gap-3 rounded-md p-2 transition text-left ${
                                isActive ? "bg-emerald-50 border-l-4 border-emerald-500 pl-1.5" : "hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex h-10 w-10 shrink-0 overflow-hidden rounded bg-emerald-50 items-center justify-center border border-slate-100">
                                {imageSrc ? (
                                  <img
                                    src={imageSrc}
                                    alt={localizedItem.name}
                                    className="h-full w-full object-cover"
                                    onError={setImageFallback}
                                  />
                                ) : (
                                  <Leaf className="h-4 w-4 text-emerald-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-950">
                                  {localizedItem.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">
                                    {localizeCategory(
                                      { name: item.categoryName, nameEn: item.categoryNameEn },
                                      locale
                                    ).name}
                                  </span>
                                  {item.stock <= 0 && (
                                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1 rounded">
                                      Háº¿t hÃ ng
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-bold text-emerald-700">
                                  {Number(item.price).toLocaleString("vi-VN")}Ä‘
                                </p>
                                {item.unit && (
                                  <p className="text-[10px] text-slate-400">
                                    /{locale === "en" ? item.unitEn || item.unit : item.unit}
                                  </p>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      <div className="border-t border-slate-100 mt-1.5 pt-1.5 px-2 pb-1 text-center">
                        <a
                          href="#products"
                          onClick={() => setShowSuggestions(false)}
                          className="text-[10px] font-black text-emerald-700 hover:text-emerald-800 transition"
                        >
                          Xem táº¥t cáº£ gá»£i Ã½ cho &quot;{filters.keyword}&quot; â†’
                        </a>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <a
              href="#products"
              onClick={() => setShowSuggestions(false)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-emerald-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Search className="size-4" />
              TÃ¬m
            </a>
          </div>

          <nav className="ml-auto hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <a href="#categories" className="hover:text-emerald-700">
              Danh má»¥c
            </a>
            <a href="#products" className="hover:text-emerald-700">
              Sáº£n pháº©m
            </a>
            <a href="#delivery" className="hover:text-emerald-700">
              Giao hÃ ng
            </a>
            <Link href="/contact" className="hover:text-emerald-700">
              LiÃªn há»‡
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setWishlistOpen(true)}
            className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] border bg-white text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 ${
              wishlistPulse
                ? "scale-110 border-rose-300 ring-4 ring-rose-100"
                : "border-rose-100"
            }`}
            aria-label="Xem danh sÃ¡ch yÃªu thÃ­ch"
            title="Xem danh sÃ¡ch yÃªu thÃ­ch"
          >
            <Heart className={`size-5 ${wishlistCount > 0 ? "fill-current" : ""}`} />
            {wishlistCount > 0 && (
              <span
                className={`absolute -right-2 -top-2 min-w-5 rounded-full bg-rose-500 px-1 text-center text-xs font-black leading-5 text-white ${
                  wishlistPulse ? "animate-pulse" : ""
                }`}
              >
                {wishlistCount}
              </span>
            )}
          </button>

          <Link
            href="/cart"
            className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] border bg-white text-emerald-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 ${
              cartPulse
                ? "scale-110 border-emerald-400 ring-4 ring-emerald-100"
                : "border-emerald-100"
            }`}
            aria-label="Xem giá» hÃ ng"
            title="Xem giá» hÃ ng"
          >
            <ShoppingBasket className={`size-5 ${cartPulse ? "animate-bounce" : ""}`} />
            {cartCount > 0 && (
              <span
                className={`absolute -right-2 -top-2 min-w-5 rounded-full bg-rose-500 px-1 text-center text-xs font-black leading-5 text-white ${
                  cartPulse ? "animate-pulse" : ""
                }`}
              >
                {cartCount}
              </span>
            )}
          </Link>

          <Link
            href="/profile"
            className="hidden size-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-slate-950 text-white transition hover:bg-emerald-800 sm:inline-flex"
            aria-label="Há»“ sÆ¡ khÃ¡ch hÃ ng"
            title="Há»“ sÆ¡ khÃ¡ch hÃ ng"
          >
            {currentUserAvatarUrl ? (
              <span
                className="size-8 rounded-[6px] bg-cover bg-center"
                style={{ backgroundImage: `url("${currentUserAvatarUrl}")` }}
              />
            ) : (
              <UserRound className="size-4" />
            )}
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="relative min-h-[360px] overflow-hidden rounded-[8px] border border-emerald-100 bg-emerald-950 shadow-[0_18px_55px_rgba(15,61,38,0.08)]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url("/market-assets/fresh-market-hero.png")' }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,47,46,0.92)_0%,rgba(6,78,59,0.74)_46%,rgba(255,255,255,0.2)_100%)]" />
          <div className="relative grid min-h-[360px] gap-6 p-5 text-white sm:p-7 lg:grid-cols-[1fr_520px] lg:items-end lg:p-8">
            <div className="max-w-3xl self-center">
              <div className="flex flex-wrap gap-2">
                {["NÃ´ng sáº£n sáº¡ch", "Giao nhanh 2h", "GiÃ¡ bÃ¬nh á»•n"].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-[8px] border border-white/30 bg-white/16 px-3 py-1 text-xs font-bold text-white backdrop-blur"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <p className="mt-8 text-sm font-black uppercase text-emerald-100">
                Váº­n hÃ nh nhanh trong ngÃ y
              </p>
              <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-normal text-white sm:text-5xl">
                AgriMarket
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/86">
                Trang mua nÃ´ng sáº£n cho khÃ¡ch hÃ ng vá»›i danh má»¥c rÃµ rÃ ng, giÃ¡ minh báº¡ch, tá»“n kho cáº­p nháº­t vÃ  giá» hÃ ng sáºµn sÃ ng cho Ä‘Æ¡n giao trong ngÃ y.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:self-end">
              {marketStats.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-[8px] border border-white/28 bg-white/90 p-3 text-slate-950 shadow-sm backdrop-blur"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700">
                        <Icon className="size-4" />
                      </span>
                      <span className="text-xl font-black text-emerald-700">
                        {item.value}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs font-black text-slate-800">
                      {item.label}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        id="categories"
        className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-5 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-emerald-700">
              Äi chá»£ theo mÃ¹a
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-normal text-slate-950">
              Danh má»¥c nÃ´ng sáº£n
            </h2>
          </div>
          <div className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-200 bg-white px-3 text-sm font-bold text-emerald-800 shadow-sm">
            <SlidersHorizontal className="size-4" />
            {categoriesLoading ? "Äang táº£i danh má»¥c" : activeCategoryName}
          </div>
        </div>

        <div
          className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6"
          onMouseLeave={() => setHoveredCategorySlug("")}
        >
          {categoryOptions.map((category, index) => {
            const active = filters.categorySlug === category.slug;
            const previewing = previewCategorySlug === category.slug;

            return (
              <button
                key={category.id}
                type="button"
                onFocus={() => setHoveredCategorySlug(category.slug)}
                onMouseEnter={() => setHoveredCategorySlug(category.slug)}
                onClick={() => updateFilter("categorySlug", category.slug)}
                className={`min-h-24 rounded-[8px] border p-3 text-left transition ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-[0_18px_45px_rgba(5,150,105,0.24)]"
                    : previewing
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-[0_12px_32px_rgba(15,61,38,0.08)]"
                      : "border-emerald-100 bg-white text-slate-700 shadow-[0_10px_28px_rgba(15,61,38,0.05)] hover:border-emerald-200 hover:text-emerald-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex size-10 items-center justify-center overflow-hidden rounded-[8px] bg-cover bg-center ${
                      active
                        ? "bg-white/15 text-white"
                        : index % 3 === 0
                          ? "bg-amber-50 text-amber-700"
                          : index % 3 === 1
                            ? "bg-sky-50 text-sky-700"
                            : "bg-rose-50 text-rose-700"
                    }`}
                    style={
                      category.image
                        ? { backgroundImage: getImageBackground(category.image) }
                        : undefined
                    }
                  >
                    {!category.image && <Leaf className="size-4" />}
                  </div>
                  <ArrowRight className="size-3.5 opacity-70" />
                </div>
                <h3 className="mt-3 line-clamp-1 text-base font-black">
                  {category.name}
                </h3>
                <p
                  className={`mt-1 line-clamp-1 text-xs leading-5 ${
                    active ? "text-white/80" : "text-slate-500"
                  }`}
                >
                  {category.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-[8px] border border-emerald-100 bg-white p-3 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-emerald-700">
                Sáº£n pháº©m trong danh má»¥c
              </p>
              <h3 className="text-lg font-black text-slate-950">
                {previewCategoryName}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {categoryPreviewProducts.length} mÃ³n
            </span>
          </div>

          {categoryPreviewProducts.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {categoryPreviewProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openProductDetail(product)}
                  className="grid grid-cols-[64px_1fr] gap-3 rounded-[8px] border border-emerald-100 bg-[#f6faef] p-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <span
                    className="h-16 rounded-[8px] bg-cover bg-center"
                    style={{
                      backgroundImage: product.imageBackground,
                      backgroundPosition: product.imagePosition,
                    }}
                  />
                  <span className="min-w-0 self-center">
                    <span className="block line-clamp-1 text-sm font-black text-slate-950">
                      {product.name}
                    </span>
                    <span className="mt-1 block line-clamp-1 text-xs font-semibold text-slate-500">
                      {product.categoryName}
                    </span>
                    <span className="mt-1 block text-sm font-black text-emerald-700">
                      {formatCurrency(product.price)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[8px] border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-5 text-sm font-semibold text-emerald-800">
              ChÆ°a cÃ³ sáº£n pháº©m hiá»ƒn thá»‹ cho danh má»¥c nÃ y.
            </div>
          )}
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="border-y border-emerald-100 bg-white">
          <div className="mx-auto grid w-full max-w-[1480px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8">
            <div className="space-y-3">
              <p className="text-sm font-black uppercase text-rose-600">
                Gá»£i Ã½ hÃ´m nay
              </p>
              <h2 className="text-3xl font-black tracking-normal text-slate-950">
                MÃ³n tÆ°Æ¡i nÃªn thÃªm vÃ o giá»
              </h2>
              <p className="text-sm leading-6 text-slate-500">
                Nhá»¯ng sáº£n pháº©m Ä‘ang cÃ³ tá»“n kho tá»‘t, giÃ¡ dá»… mua vÃ  phÃ¹ há»£p cho
                bá»¯a Äƒn nhanh trong ngÃ y.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {featuredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openProductDetail(product)}
                  className="grid grid-cols-[92px_1fr] gap-3 rounded-[8px] border border-emerald-100 bg-[#f6faef] p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <span
                    className="h-24 rounded-[8px] bg-cover bg-center"
                    style={{
                      backgroundImage: product.imageBackground,
                      backgroundPosition: product.imagePosition,
                    }}
                  />
                  <span className="min-w-0 self-center">
                    <span className="text-xs font-bold uppercase text-emerald-700">
                      {product.categoryName}
                    </span>
                    <span className="mt-1 block line-clamp-1 font-black text-slate-950">
                      {product.name}
                    </span>
                    <span className="mt-2 block text-sm font-black text-emerald-700">
                      {formatCurrency(product.price)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        id="products"
        className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-5 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-emerald-700">
              {filters.keyword.trim() ? "Káº¿t quáº£ tÃ¬m kiáº¿m" : "Sáº£n pháº©m ná»•i báº­t"}
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-normal text-slate-950">
              HÃ ng tÆ°Æ¡i Ä‘ang má»Ÿ bÃ¡n
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {productsLoading
                ? "Äang táº£i sáº£n pháº©m tá»« API..."
                : `${formatNumber(totalProducts)} sáº£n pháº©m phÃ¹ há»£p`}
            </p>
          </div>

          <div className="grid gap-2 rounded-[8px] border border-emerald-100 bg-white p-2 shadow-[0_12px_30px_rgba(15,61,38,0.05)] sm:grid-cols-2 lg:grid-cols-[150px_150px_160px_auto]">
            <input
              value={filters.minPrice}
              onChange={(event) => updateFilter("minPrice", event.target.value)}
              type="number"
              min="0"
              className="h-10 rounded-[8px] border border-emerald-100 px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="GiÃ¡ tá»«"
            />
            <input
              value={filters.maxPrice}
              onChange={(event) => updateFilter("maxPrice", event.target.value)}
              type="number"
              min="0"
              className="h-10 rounded-[8px] border border-emerald-100 px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="GiÃ¡ Ä‘áº¿n"
            />
            <select
              value={filters.sort}
              onChange={(event) => updateFilter("sort", event.target.value)}
              className="h-10 rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 items-center justify-center rounded-[8px] px-3 text-sm font-bold text-slate-500 transition hover:bg-emerald-50 hover:text-rose-600"
            >
              XÃ³a lá»c
            </button>
          </div>
        </div>

        {(apiError || usingFallback) && (
          <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {usingFallback
              ? "ChÆ°a káº¿t ná»‘i Ä‘Æ°á»£c public API, Ä‘ang hiá»ƒn thá»‹ dá»¯ liá»‡u máº«u."
              : apiError}
          </div>
        )}

        {productsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductSkeleton key={index} />
            ))}
          </div>
        ) : productCardsWithReviews.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {productCardsWithReviews.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                  onToggleWishlist={toggleWishlist}
                  onViewProduct={openProductDetail}
                  recentlyAdded={recentlyAddedProductId === String(product.id)}
                  wishlisted={wishlistProductIds.has(String(product.id))}
                  wishlistUpdating={wishlistUpdating}
                />
              ))}
            </div>

            {totalProductPages > 1 && (
              <div className="flex flex-col gap-3 rounded-[8px] border border-emerald-100 bg-white p-3 shadow-[0_12px_30px_rgba(15,61,38,0.05)] sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-slate-500">
                  Trang {formatNumber(currentPage + 1)} / {formatNumber(totalProductPages)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(page - 1, 0))}
                    disabled={currentPage === 0 || productsLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-black text-emerald-800 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
                  >
                    <ArrowRight className="size-4 rotate-180" />
                    TrÆ°á»›c
                  </button>

                  {paginationPages.map((pageIndex) => {
                    const active = pageIndex === currentPage;

                    return (
                      <button
                        key={pageIndex}
                        type="button"
                        onClick={() => setCurrentPage(pageIndex)}
                        disabled={productsLoading}
                        className={`inline-flex size-10 items-center justify-center rounded-[8px] text-sm font-black transition ${
                          active
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "border border-emerald-100 bg-white text-emerald-800 hover:border-emerald-200 hover:bg-emerald-50"
                        }`}
                        aria-label={`Trang ${pageIndex + 1}`}
                      >
                        {pageIndex + 1}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(page + 1, totalProductPages - 1)
                      )
                    }
                    disabled={currentPage >= totalProductPages - 1 || productsLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-black text-emerald-800 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
                  >
                    Sau
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-[8px] border border-emerald-100 bg-white p-10 text-center shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
            <div className="mx-auto flex size-14 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700">
              <Search className="size-7" />
            </div>
            <p className="mt-5 font-black text-slate-800">
              ChÆ°a cÃ³ sáº£n pháº©m phÃ¹ há»£p.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              HÃ£y thá»­ tá»« khÃ³a khÃ¡c hoáº·c má»Ÿ rá»™ng khoáº£ng giÃ¡.
            </p>
          </div>
        )}
      </section>

      <section id="delivery" className="border-y border-emerald-100 bg-white">
        <div className="mx-auto grid w-full max-w-[1480px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-sm font-black uppercase text-emerald-700">
              Quy trÃ¬nh Ä‘Æ¡n hÃ ng
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950">
              Tá»« nÃ´ng tráº¡i Ä‘áº¿n giá» hÃ ng trong má»™t hÃ nh trÃ¬nh rÃµ rÃ ng
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Há»‡ thá»‘ng há»— trá»£ tÃ¬m kiáº¿m sáº£n pháº©m thÃ´ng minh, chá»n lá»c vÃ¹ng miá»n vÃ  giao hÃ ng há»a tá»‘c trong ngÃ y Ä‘á»ƒ báº£o Ä‘áº£m Ä‘á»™ tÆ°Æ¡i ngon tá»‘i Ä‘a.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {serviceSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="rounded-[8px] border border-emerald-100 bg-[#f6faef] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-[8px] bg-slate-950 text-white">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-sm font-black text-emerald-700">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-4 font-black text-slate-900">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1480px] gap-4 px-4 py-5 sm:px-6 lg:grid-cols-3 lg:px-8">
        <Link
          href="/promotions"
          id="promo-card-seasonal"
          className="group rounded-[8px] bg-emerald-600 p-5 text-white transition duration-200 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer block"
        >
          <Sparkles className="size-7 transition group-hover:scale-110" />
          <h3 className="mt-5 text-xl font-black">Æ¯u Ä‘Ã£i theo mÃ¹a</h3>
          <p className="mt-2 text-sm leading-6 text-white/85">
            Combo rau cá»§ Ä‘Æ°á»£c cáº­p nháº­t theo ngÃ y Ä‘á»ƒ giáº£m lÃ£ng phÃ­ vÃ  giá»¯ giÃ¡ tá»‘t.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-white/70 transition group-hover:text-white">
            Xem táº¥t cáº£ Æ°u Ä‘Ã£i â†’
          </span>
        </Link>
        <div className="rounded-[8px] bg-amber-400 p-5 text-amber-950">
          <CircleDollarSign className="size-7" />
          <h3 className="mt-5 text-xl font-black">PhÃ­ giao tÃ­nh theo GHN</h3>
          <p className="mt-2 text-sm leading-6 text-amber-950/75">
            Checkout gá»i GHN Ä‘á»ƒ tÃ­nh phÃ­ theo Ä‘á»‹a chá»‰ nháº­n hÃ ng vÃ  kho gá»­i.
          </p>
        </div>
        <div className="rounded-[8px] bg-slate-950 p-5 text-white">
          <Heart className="size-7" />
          <h3 className="mt-5 text-xl font-black">Cháº¥t lÆ°á»£ng trÆ°á»›c tiÃªn</h3>
          <p className="mt-2 text-sm leading-6 text-white/75">
            Má»—i sáº£n pháº©m hiá»ƒn thá»‹ tá»“n kho, Ä‘Æ¡n vá»‹ bÃ¡n vÃ  vÃ¹ng cung á»©ng dá»… Ä‘á»c.
          </p>
        </div>
      </section>

      <footer className="border-t border-emerald-100 bg-white">
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-6 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-slate-900">
            <Leaf className="size-5 text-emerald-600" />
            <span className="font-black">AgriMarket</span>
          </div>
          <p>NÃ´ng sáº£n tÆ°Æ¡i, giÃ¡ rÃµ rÃ ng, giao trong ngÃ y.</p>
        </div>
      </footer>

      <CartDrawer
        cart={cart}
        cartOpen={cartOpen}
        subtotal={subtotal}
        grandTotal={grandTotal}
        cartNotice={cartNotice}
        cartError={cartError}
        cartUpdating={cartUpdating}
        onClose={() => setCartOpen(false)}
        onIncrease={increaseCartItem}
        onDecrease={decreaseCartItem}
        onRemove={removeCartItem}
        onClear={clearCart}
        onCheckout={handleCheckout}
      />
      <WishlistDrawer
        items={wishlistItems}
        wishlistOpen={wishlistOpen}
        wishlistNotice={wishlistNotice}
        wishlistError={wishlistError}
        wishlistUpdating={wishlistUpdating}
        onClose={() => setWishlistOpen(false)}
        onViewProduct={openProductDetail}
        onAddToCart={addWishlistItemToCart}
        onRemove={removeWishlistItem}
      />
    </main>
  );
}
