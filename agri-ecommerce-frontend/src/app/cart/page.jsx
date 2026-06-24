"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Leaf,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBasket,
  Trash2,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
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

const SHIPPING_FEE = 25000;

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

async function fetchCartSnapshot() {
  const session = getActiveCustomerSession();

  if (!session) {
    return { authStatus: "unauthenticated", cart: null };
  }

  const response = await cartService.getCart();

  return { authStatus: "authenticated", cart: response };
}

export default function CartPage() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState("checking");
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const cartItems = useMemo(() => cart?.items || [], [cart]);
  const cartTotal = Number(cart?.totalAmount || 0);
  const cartQuantity = Number(cart?.totalQuantity || 0);
  const shippingFee = cartItems.length > 0 ? SHIPPING_FEE : 0;
  const grandTotal = cartTotal + shippingFee;

  const stockWarnings = useMemo(
    () =>
      cartItems.filter((item) => {
        const stock = Number(item.stock ?? 0);
        return stock > 0 && Number(item.quantity || 0) >= stock;
      }).length,
    [cartItems]
  );

  async function loadCart({ quiet = false } = {}) {
    if (!quiet) {
      setLoading(true);
    }

    setError("");

    try {
      const snapshot = await fetchCartSnapshot();
      setAuthStatus(snapshot.authStatus);
      setCart(snapshot.cart);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialCart() {
      await Promise.resolve();

      try {
        const snapshot = await fetchCartSnapshot();

        if (!cancelled) {
          setAuthStatus(snapshot.authStatus);
          setCart(snapshot.cart);
        }
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

    loadInitialCart();

    return () => {
      cancelled = true;
    };
  }, []);

  async function updateCartItem(item, quantity) {
    const nextQuantity = Number(quantity);

    if (nextQuantity <= 0) {
      await removeCartItem(item);
      return;
    }

    const stock = Number(item.stock ?? 0);

    if (stock > 0 && nextQuantity > stock) {
      setNotice("");
      setError("Số lượng đã đạt tồn kho hiện tại.");
      return;
    }

    setUpdatingId(String(item.id));
    setNotice("");
    setError("");

    try {
      const response = await cartService.updateItem(item.id, {
        quantity: nextQuantity,
      });
      setCart(response);
      setNotice("Đã cập nhật giỏ hàng.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUpdatingId("");
    }
  }

  async function removeCartItem(item) {
    setUpdatingId(String(item.id));
    setNotice("");
    setError("");

    try {
      const response = await cartService.removeItem(item.id);
      setCart(response);
      setNotice(`Đã xóa "${item.productName}" khỏi giỏ hàng.`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUpdatingId("");
    }
  }

  async function clearCart() {
    if (cartItems.length === 0) {
      return;
    }

    const confirmed = window.confirm("Xóa toàn bộ sản phẩm trong giỏ hàng?");

    if (!confirmed) {
      return;
    }

    setClearing(true);
    setNotice("");
    setError("");

    try {
      const response = await cartService.clearCart();
      setCart(response);
      setNotice("Đã xóa toàn bộ giỏ hàng.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setClearing(false);
    }
  }

  function goToCheckout() {
    setNotice("");
    setError("");

    if (cartItems.length === 0) {
      setError("Giỏ hàng đang trống.");
      return;
    }

    router.push("/checkout");
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
                Kiểm tra giỏ hàng trước khi đặt
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-emerald-100 bg-white px-4 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50"
          >
            <ArrowLeft className="size-4" />
            Tiếp tục mua
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <AdminPageHeader
          title="Giỏ hàng"
          description="Kiểm tra sản phẩm, số lượng và tổng tiền trước khi chuyển sang checkout."
          image="/market-assets/fresh-market-hero.png"
          badges={["Customer API", "Review order", "Cart"]}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => loadCart({ quiet: true })}
            disabled={loading || clearing}
            className="font-bold"
          >
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            Làm mới
          </Button>
        </AdminPageHeader>

        {authStatus === "unauthenticated" ? (
          <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <ShieldCheck className="size-8" />
            <h2 className="mt-4 text-xl font-black">
              Vui lòng đăng nhập để xem giỏ hàng
            </h2>
            <p className="mt-2 text-sm leading-6">
              Giỏ hàng được đồng bộ theo tài khoản khách hàng để có thể checkout
              và theo dõi đơn sau khi đặt.
            </p>
            <Link
              href="/profile"
              className="mt-4 inline-flex h-10 items-center rounded-[8px] bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              Đăng nhập khách hàng
            </Link>
          </section>
        ) : loading ? (
          <section className="rounded-[8px] border border-emerald-100 bg-white p-8 text-center shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
            <Loader2 className="mx-auto size-8 animate-spin text-emerald-700" />
            <p className="mt-4 font-black text-emerald-950">
              Đang tải giỏ hàng...
            </p>
          </section>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1fr_25rem]">
            <section className="space-y-3">
              {(notice || error) && (
                <div
                  className={`rounded-[8px] border px-4 py-3 text-sm font-semibold ${
                    error
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {error || notice}
                </div>
              )}

              <div className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
                <div className="flex flex-col gap-3 border-b border-emerald-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-700">
                      Sản phẩm đã chọn
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-emerald-950">
                      {formatNumber(cartQuantity)} sản phẩm
                    </h2>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearCart}
                    disabled={clearing || cartItems.length === 0}
                    className="font-bold text-rose-600 hover:text-rose-700"
                  >
                    {clearing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Xóa giỏ
                  </Button>
                </div>

                {cartItems.length === 0 ? (
                  <div className="flex min-h-80 flex-col items-center justify-center text-center">
                    <div className="flex size-16 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700">
                      <ShoppingBasket className="size-8" />
                    </div>
                    <h3 className="mt-5 text-xl font-black text-slate-950">
                      Giỏ hàng đang trống
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                      Quay lại trang mua hàng để chọn nông sản trước khi tạo đơn.
                    </p>
                    <Link
                      href="/"
                      className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
                    >
                      Chọn sản phẩm
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-emerald-100">
                    {cartItems.map((item) => {
                      const itemUpdating = updatingId === String(item.id);
                      const quantity = Number(item.quantity || 0);
                      const stock = Number(item.stock ?? 0);
                      const lineTotal = Number(
                        item.lineTotal ?? Number(item.productPrice || 0) * quantity
                      );

                      return (
                        <div
                          key={item.id}
                          className="grid gap-4 py-4 md:grid-cols-[112px_1fr_auto]"
                        >
                          <div
                            className="h-28 rounded-[8px] bg-emerald-50 bg-cover bg-center"
                            style={{
                              backgroundImage: getImageBackground(item.thumbnail),
                            }}
                            role="img"
                            aria-label={item.productName}
                          />

                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-lg font-black text-slate-950">
                              {item.productName}
                            </h3>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {formatCurrency(item.productPrice)} /{" "}
                              {item.unit || "sản phẩm"}
                            </p>
                            <p className="mt-1 text-xs font-bold text-emerald-700">
                              Tồn kho: {formatNumber(stock)}
                            </p>

                            <div className="mt-4 flex h-10 w-fit items-center rounded-[8px] border border-emerald-100 bg-white">
                              <button
                                type="button"
                                onClick={() => updateCartItem(item, quantity - 1)}
                                disabled={itemUpdating || clearing}
                                className="inline-flex size-10 items-center justify-center text-slate-600 transition hover:text-emerald-700 disabled:opacity-50"
                                aria-label="Giảm số lượng"
                              >
                                {itemUpdating ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Minus className="size-4" />
                                )}
                              </button>
                              <span className="w-12 text-center text-sm font-black">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartItem(item, quantity + 1)}
                                disabled={itemUpdating || clearing}
                                className="inline-flex size-10 items-center justify-center text-slate-600 transition hover:text-emerald-700 disabled:opacity-50"
                                aria-label="Tăng số lượng"
                              >
                                <Plus className="size-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-row items-center justify-between gap-4 md:flex-col md:items-end">
                            <div className="text-left md:text-right">
                              <p className="text-xs font-bold uppercase text-slate-400">
                                Thành tiền
                              </p>
                              <p className="mt-1 text-xl font-black text-emerald-700">
                                {formatCurrency(lineTotal)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCartItem(item)}
                              disabled={itemUpdating || clearing}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] px-3 text-sm font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            >
                              <Trash2 className="size-4" />
                              Xóa
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <aside className="h-fit rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)] xl:sticky xl:top-24">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase text-emerald-700">
                    Tóm tắt đơn
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-emerald-950">
                    Kiểm tra lại
                  </h2>
                </div>
                <ShoppingBasket className="size-8 text-emerald-700" />
              </div>

              <div className="mt-5 space-y-3 text-sm font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí giao dự kiến</span>
                  <span>
                    {shippingFee === 0 ? "Miễn phí" : formatCurrency(shippingFee)}
                  </span>
                </div>
                {stockWarnings > 0 && (
                  <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                    {stockWarnings} sản phẩm đang ở mức tồn kho tối đa đã chọn.
                  </div>
                )}
                <div className="flex justify-between border-t border-emerald-100 pt-4 text-base font-black text-slate-950">
                  <span>Tổng dự kiến</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={goToCheckout}
                disabled={cartItems.length === 0 || clearing || Boolean(updatingId)}
                className="mt-5 h-12 w-full bg-emerald-600 font-black hover:bg-emerald-700"
              >
                <CreditCard className="size-4" />
                Sang checkout
              </Button>
              <Link
                href="/"
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-[8px] text-sm font-bold text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                Tiếp tục chọn hàng
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
