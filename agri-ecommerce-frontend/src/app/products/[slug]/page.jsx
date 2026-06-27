"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  Leaf,
  Loader2,
  MapPin,
  ShieldCheck,
  ShoppingBasket,
  Star,
  Truck,
  UserRound,
} from "lucide-react";

import {
  formatCurrency,
  formatNumber,
  getApiErrorMessage,
  getImageBackground,
} from "@/lib/admin-utils";
import {
  AUTH_SCOPES,
  clearAuthSession,
  getAuthSession,
  isAuthSessionExpired,
} from "@/lib/auth-storage";
import { cartService } from "@/services/cart.service";
import { marketplaceService } from "@/services/marketplace.service";
import { reviewService } from "@/services/review.service";
import { wishlistService } from "@/services/wishlist.service";

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

function getCustomerActionErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function normalizeProduct(product) {
  const price = Number(product?.price || 0);
  const stock = Number(product?.stock ?? 0);
  const images = Array.isArray(product?.images)
    ? product.images.filter(Boolean)
    : [];
  const thumbnail = product?.thumbnail || images[0] || "";
  const gallery = [thumbnail, ...images].filter(
    (image, index, source) => image && source.indexOf(image) === index
  );

  return {
    id: String(product?.id || product?.slug || ""),
    slug: product?.slug || String(product?.id || ""),
    name: product?.name || "Sản phẩm nông sản",
    description:
      product?.description ||
      "Nông sản được tuyển chọn từ nhà vườn liên kết, cập nhật tồn kho theo ngày.",
    categoryName: product?.categoryName || "Nông sản",
    categorySlug: product?.categorySlug || "",
    origin: product?.origin || product?.categoryName || "Nông trại liên kết",
    price,
    oldPrice: Math.round(price * 1.12),
    unit: product?.unit || "sản phẩm",
    stock,
    status: product?.status || "",
    gallery: gallery.length > 0 ? gallery : [""],
    imageBackground: getImageBackground(thumbnail),
    disabled: product?.stock !== undefined && product?.stock !== null && stock <= 0,
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [wishlistIds, setWishlistIds] = useState(() => new Set());
  const [reviewSnapshot, setReviewSnapshot] = useState({
    summary: { totalReviews: 0, averageRating: 0 },
    reviews: { content: [] },
  });
  const [loading, setLoading] = useState(true);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const normalizedProduct = useMemo(
    () => (product ? normalizeProduct(product) : null),
    [product]
  );

  const productId = Number(normalizedProduct?.id);
  const isWishlisted =
    Number.isFinite(productId) && wishlistIds.has(Number(normalizedProduct.id));
  const reviewSummary = reviewSnapshot?.summary || {};
  const reviewItems = Array.isArray(reviewSnapshot?.reviews?.content)
    ? reviewSnapshot.reviews.content
    : [];
  const averageRating = Number(reviewSummary.averageRating || 0);
  const totalReviews = Number(reviewSummary.totalReviews || 0);
  const displayRating = totalReviews > 0 ? averageRating.toFixed(1) : "";

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const response = await marketplaceService.getProductBySlug(slug);

        if (cancelled) {
          return;
        }

        setProduct(response);
        const nextProduct = normalizeProduct(response);
        setSelectedImage(nextProduct.gallery[0] || "");
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (slug) {
      loadProduct();
    }

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function loadWishlist() {
      const session = getActiveCustomerSession();

      if (!session) {
        setWishlistIds(new Set());
        return;
      }

      try {
        const response = await wishlistService.getWishlist();

        if (cancelled) {
          return;
        }

        setWishlistIds(
          new Set(
            (response?.items || [])
              .map((item) => Number(item.productId))
              .filter(Number.isFinite)
          )
        );
      } catch {
        if (!cancelled) {
          setWishlistIds(new Set());
        }
      }
    }

    loadWishlist();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProductReviews() {
      try {
        const response = await reviewService.getProductReviews(slug, {
          page: 0,
          size: 6,
          sort: "createdAt,desc",
        });

        if (!cancelled) {
          setReviewSnapshot(response);
        }
      } catch {
        if (!cancelled) {
          setReviewSnapshot({
            summary: { totalReviews: 0, averageRating: 0 },
            reviews: { content: [] },
          });
        }
      }
    }

    if (slug) {
      loadProductReviews();
    }

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function addToCart() {
    if (!normalizedProduct) {
      return;
    }

    setNotice("");
    setError("");

    const session = getActiveCustomerSession();

    if (!session) {
      setError("Vui lòng đăng nhập tài khoản khách hàng trước khi thêm giỏ.");
      router.push("/profile");
      return;
    }

    if (!Number.isFinite(productId)) {
      setError("Không thể thêm sản phẩm này vào giỏ hàng.");
      return;
    }

    setCartLoading(true);

    try {
      await cartService.addItem({
        productId,
        quantity: 1,
      });
      setNotice("Đã thêm sản phẩm vào giỏ hàng.");
    } catch (err) {
      setError(
        getCustomerActionErrorMessage(
          err,
          "Không thể thêm sản phẩm vào giỏ hàng."
        )
      );
    } finally {
      setCartLoading(false);
    }
  }

  async function toggleWishlist() {
    if (!normalizedProduct) {
      return;
    }

    setNotice("");
    setError("");

    const session = getActiveCustomerSession();

    if (!session) {
      setError("Vui lòng đăng nhập tài khoản khách hàng để lưu yêu thích.");
      router.push("/profile");
      return;
    }

    if (!Number.isFinite(productId)) {
      setError("Không thể cập nhật yêu thích cho sản phẩm này.");
      return;
    }

    setWishlistLoading(true);

    try {
      const response = isWishlisted
        ? await wishlistService.removeItem(productId)
        : await wishlistService.addItem({ productId });

      setWishlistIds(
        new Set(
          (response?.items || [])
            .map((item) => Number(item.productId))
            .filter(Number.isFinite)
        )
      );
      setNotice(
        isWishlisted
          ? "Đã bỏ sản phẩm khỏi danh sách yêu thích."
          : "Đã thêm sản phẩm vào danh sách yêu thích."
      );
    } catch (err) {
      setError(
        getCustomerActionErrorMessage(
          err,
          "Không thể cập nhật danh sách yêu thích."
        )
      );
    } finally {
      setWishlistLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6faef] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-emerald-600 text-white shadow-sm">
              <Leaf className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-emerald-950">
                AgriMarket
              </p>
              <p className="hidden text-xs font-medium text-emerald-700 sm:block">
                Chi tiết sản phẩm
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              className="inline-flex size-10 items-center justify-center rounded-[8px] border border-emerald-100 bg-white text-emerald-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
              aria-label="Xem giỏ hàng"
              title="Xem giỏ hàng"
            >
              <ShoppingBasket className="size-5" />
            </Link>
            <Link
              href="/profile"
              className="inline-flex size-10 items-center justify-center rounded-[8px] bg-slate-950 text-white transition hover:bg-emerald-800"
              aria-label="Hồ sơ khách hàng"
              title="Hồ sơ khách hàng"
            >
              <UserRound className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <Link
          href="/#products"
          className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <ArrowLeft className="size-4" />
          Quay lại sản phẩm
        </Link>
      </section>

      {loading ? (
        <section className="mx-auto flex min-h-[520px] w-full max-w-[1480px] items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 rounded-[8px] border border-emerald-100 bg-white px-5 py-4 text-sm font-bold text-emerald-800 shadow-sm">
            <Loader2 className="size-5 animate-spin" />
            Đang tải chi tiết sản phẩm...
          </div>
        </section>
      ) : error && !normalizedProduct ? (
        <section className="mx-auto w-full max-w-[1480px] px-4 pb-10 sm:px-6 lg:px-8">
          <div className="rounded-[8px] border border-rose-200 bg-white p-8 text-center shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
            <p className="text-lg font-black text-slate-950">
              Chưa thể mở trang chi tiết sản phẩm.
            </p>
            <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p>
          </div>
        </section>
      ) : (
        normalizedProduct && (
          <>
            <section className="mx-auto grid w-full max-w-[1480px] gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
              <div className="space-y-3">
                <div
                  className="min-h-[360px] rounded-[8px] border border-emerald-100 bg-white bg-cover bg-center shadow-[0_18px_55px_rgba(15,61,38,0.08)] sm:min-h-[520px]"
                  style={{
                    backgroundImage: getImageBackground(selectedImage),
                    backgroundPosition: "center",
                  }}
                />

                {normalizedProduct.gallery.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {normalizedProduct.gallery.map((image) => {
                      const active = selectedImage === image;

                      return (
                        <button
                          key={image}
                          type="button"
                          onClick={() => setSelectedImage(image)}
                          className={`h-20 rounded-[8px] border bg-cover bg-center transition ${
                            active
                              ? "border-emerald-600 ring-4 ring-emerald-100"
                              : "border-emerald-100 hover:border-emerald-300"
                          }`}
                          style={{ backgroundImage: getImageBackground(image) }}
                          aria-label="Chọn ảnh sản phẩm"
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <article className="space-y-5">
                <div className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)] sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase text-emerald-700">
                        {normalizedProduct.categoryName}
                      </p>
                      <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">
                        {normalizedProduct.name}
                      </h1>
                    </div>
                    <button
                      type="button"
                      onClick={toggleWishlist}
                      disabled={wishlistLoading}
                      className={`inline-flex size-12 shrink-0 items-center justify-center rounded-[8px] border transition disabled:opacity-60 ${
                        isWishlisted
                          ? "border-rose-200 bg-rose-50 text-rose-600"
                          : "border-emerald-100 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      }`}
                      aria-label={
                        isWishlisted
                          ? "Bỏ khỏi yêu thích"
                          : "Thêm vào yêu thích"
                      }
                      title={
                        isWishlisted
                          ? "Bỏ khỏi yêu thích"
                          : "Thêm vào yêu thích"
                      }
                    >
                      {wishlistLoading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <Heart
                          className={`size-5 ${isWishlisted ? "fill-current" : ""}`}
                        />
                      )}
                    </button>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    {normalizedProduct.description}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[8px] border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-xs font-bold uppercase text-emerald-700">
                        Giá
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatCurrency(normalizedProduct.price)}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-amber-100 bg-amber-50 p-3">
                      <p className="text-xs font-bold uppercase text-amber-700">
                        Đánh giá
                      </p>
                      <p className="mt-1 flex items-center gap-1 font-black text-slate-950">
                        {totalReviews > 0 ? (
                          <>
                            <Star className="size-4 fill-amber-400 text-amber-400" />
                            {displayRating}/5
                          </>
                        ) : (
                          "Chưa có"
                        )}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-sky-100 bg-sky-50 p-3">
                      <p className="text-xs font-bold uppercase text-sky-700">
                        Tồn kho
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatNumber(normalizedProduct.stock)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-700">
                      {formatCurrency(normalizedProduct.price)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      / {normalizedProduct.unit}
                    </span>
                  </div>

                  {(notice || error) && (
                    <div
                      className={`mt-4 rounded-[8px] border px-3 py-2 text-sm font-semibold ${
                        error
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {error || notice}
                    </div>
                  )}

                  <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <button
                      type="button"
                      onClick={addToCart}
                      disabled={normalizedProduct.disabled || cartLoading}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {cartLoading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <ShoppingBasket className="size-5" />
                      )}
                      {normalizedProduct.disabled
                        ? "Tạm hết hàng"
                        : "Thêm vào giỏ"}
                    </button>
                    <Link
                      href="/cart"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-emerald-100 bg-white px-5 text-sm font-black text-emerald-800 transition hover:border-emerald-200 hover:bg-emerald-50"
                    >
                      <CheckCircle2 className="size-5" />
                      Xem giỏ
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[8px] border border-emerald-100 bg-white p-4">
                    <MapPin className="size-5 text-emerald-600" />
                    <p className="mt-3 text-sm font-black text-slate-950">
                      Vùng cung ứng
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {normalizedProduct.origin}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-emerald-100 bg-white p-4">
                    <Truck className="size-5 text-emerald-600" />
                    <p className="mt-3 text-sm font-black text-slate-950">
                      Giao trong ngày
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Ưu tiên đơn nội thành
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-emerald-100 bg-white p-4">
                    <ShieldCheck className="size-5 text-emerald-600" />
                    <p className="mt-3 text-sm font-black text-slate-950">
                      Kiểm tra chất lượng
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Đóng gói trước khi giao
                    </p>
                  </div>
                </div>
              </article>
            </section>

            <section className="mx-auto w-full max-w-[1480px] px-4 pb-8 sm:px-6 lg:px-8">
              <div className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)] sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-700">
                      Đánh giá từ khách hàng
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      Trải nghiệm sau khi mua hàng
                    </h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-[8px] border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-black text-amber-700">
                    <Star className="size-4 fill-current" />
                    {totalReviews > 0
                      ? `${displayRating}/5 từ ${formatNumber(totalReviews)} đánh giá`
                      : "Chưa có đánh giá"}
                  </div>
                </div>

                {reviewItems.length > 0 ? (
                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {reviewItems.map((review) => (
                      <article
                        key={review.id}
                        className="rounded-[8px] border border-emerald-100 bg-[#f6faef] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-950">
                              {review.userName || "Khách hàng"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Đã mua và đánh giá sản phẩm
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-amber-600">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                className={`size-4 ${
                                  index < Number(review.rating || 0)
                                    ? "fill-current"
                                    : ""
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {review.comment}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[8px] border border-dashed border-emerald-200 bg-emerald-50/60 p-5 text-sm font-semibold text-emerald-800">
                    Sản phẩm này chưa có đánh giá. Khách hàng có thể đánh giá
                    sau khi đơn hàng được giao thành công.
                  </div>
                )}
              </div>
            </section>

            <section className="border-y border-emerald-100 bg-white">
              <div className="mx-auto grid w-full max-w-[1480px] gap-4 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
                <div>
                  <p className="text-sm font-black uppercase text-emerald-700">
                    Thông tin thêm
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Mua hàng rõ ràng trước khi thanh toán
                  </h2>
                </div>
                <p className="text-sm leading-6 text-slate-500 lg:col-span-2">
                  Sản phẩm hiển thị tồn kho hiện tại, đơn vị bán và nhóm danh
                  mục để khách hàng dễ so sánh. Khi thêm vào yêu thích, sản phẩm
                  sẽ được lưu theo tài khoản khách hàng đang đăng nhập.
                </p>
              </div>
            </section>
          </>
        )
      )}
    </main>
  );
}
