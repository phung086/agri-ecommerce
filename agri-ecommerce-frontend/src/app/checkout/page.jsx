"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Leaf,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBasket,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCurrency,
  formatNumber,
  getAssetUrl,
} from "@/lib/admin-utils";
import {
  AUTH_SCOPES,
  clearAuthSession,
  getAuthSession,
  isAuthSessionExpired,
} from "@/lib/auth-storage";
import { cartService } from "@/services/cart.service";
import { orderService } from "@/services/order.service";
import { shippingAddressService } from "@/services/shipping-address.service";

const blankAddressForm = {
  fullName: "",
  phone: "",
  city: "",
  address: "",
  defaultAddress: true,
};

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

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState("checking");
  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [couponCode, setCouponCode] = useState("");
  const [addressForm, setAddressForm] = useState(blankAddressForm);
  const [preview, setPreview] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const cartItems = cart?.items || [];
  const cartTotal = Number(cart?.totalAmount || 0);
  const cartQuantity = Number(cart?.totalQuantity || 0);
  const fallbackShippingFee = cartItems.length > 0 ? 25000 : 0;
  const selectedAddress = addresses.find(
    (address) => String(address.id) === String(selectedAddressId)
  );

  const summary = useMemo(
    () => ({
      subtotal: Number(preview?.subtotal ?? cartTotal),
      discountAmount: Number(preview?.discountAmount ?? 0),
      shippingFee: Number(preview?.shippingFee ?? fallbackShippingFee),
      totalPrice: Number(
        preview?.totalPrice ?? cartTotal + fallbackShippingFee
      ),
    }),
    [cartTotal, fallbackShippingFee, preview]
  );

  const checkoutPayload = useMemo(
    () => ({
      shippingAddressId: selectedAddressId ? Number(selectedAddressId) : null,
      paymentMethod,
      couponCode: couponCode.trim() || undefined,
    }),
    [couponCode, paymentMethod, selectedAddressId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutData() {
      await Promise.resolve();

      const session = getActiveCustomerSession();

      if (!session) {
        if (!cancelled) {
          setAuthStatus("unauthenticated");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setAuthStatus("authenticated");
        setLoading(true);
        setError("");
        setNotice("");
      }

      try {
        const [cartResponse, addressResponse] = await Promise.all([
          cartService.getCart(),
          shippingAddressService.getAddresses(),
        ]);
        const nextAddresses = Array.isArray(addressResponse)
          ? addressResponse
          : [];
        const defaultAddress =
          nextAddresses.find((address) => address.defaultAddress) ||
          nextAddresses[0];

        if (!cancelled) {
          setCart(cartResponse);
          setAddresses(nextAddresses);
          setSelectedAddressId(
            defaultAddress?.id ? String(defaultAddress.id) : ""
          );
          setPreview(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            getErrorMessage(err, "Không thể tải dữ liệu thanh toán của bạn.")
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCheckoutData();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateAddressForm(field, value) {
    setAddressForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveAddress(event) {
    event.preventDefault();
    setSavingAddress(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        fullName: addressForm.fullName.trim(),
        phone: addressForm.phone.trim(),
        city: addressForm.city.trim(),
        address: addressForm.address.trim(),
        defaultAddress:
          Boolean(addressForm.defaultAddress) || addresses.length === 0,
      };
      const savedAddress = await shippingAddressService.createAddress(payload);
      const nextAddresses = await shippingAddressService.getAddresses();

      setAddresses(Array.isArray(nextAddresses) ? nextAddresses : []);
      setSelectedAddressId(String(savedAddress.id));
      setAddressForm(blankAddressForm);
      setPreview(null);
      setNotice("Đã thêm địa chỉ giao hàng.");
    } catch (err) {
      setError(getErrorMessage(err, "Không thể thêm địa chỉ giao hàng."));
    } finally {
      setSavingAddress(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    setError("");
    setNotice("");

    if (!checkoutPayload.shippingAddressId) {
      setError("Vui lòng chọn hoặc thêm địa chỉ giao hàng.");
      setPreviewing(false);
      return null;
    }

    if (cartItems.length === 0) {
      setError("Giỏ hàng đang trống.");
      setPreviewing(false);
      return null;
    }

    try {
      const response = await orderService.previewCheckout(checkoutPayload);
      setPreview(response);

      if (response?.couponMessage && couponCode.trim()) {
        setNotice(response.couponMessage);
      }

      return response;
    } catch (err) {
      setError(getErrorMessage(err, "Không thể kiểm tra đơn hàng."));
      return null;
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmitOrder(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const currentPreview = await handlePreview();

      if (!currentPreview?.canCheckout) {
        setError("Đơn hàng chưa đủ điều kiện thanh toán. Vui lòng kiểm tra lại.");
        return;
      }

      const order = await orderService.checkout(checkoutPayload);
      const nextCart = await cartService.getCart();

      setCreatedOrder(order);
      setCart(nextCart);
      setPreview(null);
      setNotice(`Đã tạo đơn hàng #${order.id}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tạo đơn hàng."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6faef] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-[1480px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-emerald-600 text-white shadow-sm">
              <Leaf className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-emerald-950">
                AgriMarket
              </p>
              <p className="hidden text-xs font-medium text-emerald-700 sm:block">
                Thanh toán đơn hàng
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
            >
              <ArrowLeft className="size-4" />
              Tiếp tục mua
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <AdminPageHeader
          title="Thanh toán"
          description="Kiểm tra giỏ hàng, chọn địa chỉ giao hàng, áp mã giảm giá và tạo đơn hàng thật qua backend."
          image="/market-assets/fresh-market-hero.png"
          badges={["Customer API", "Cart", "Checkout"]}
        />

        {authStatus === "unauthenticated" ? (
          <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <ShieldCheck className="size-8" />
            <h2 className="mt-4 text-xl font-black">
              Vui lòng đăng nhập để thanh toán
            </h2>
            <p className="mt-2 text-sm leading-6">
              Checkout dùng giỏ hàng và địa chỉ giao hàng gắn với tài khoản
              khách hàng.
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
              Đang tải dữ liệu thanh toán...
            </p>
          </section>
        ) : (
          <form
            onSubmit={handleSubmitOrder}
            className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"
          >
            <div className="space-y-5">
              {createdOrder && (
                <section className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                  <CheckCircle2 className="size-8" />
                  <h2 className="mt-3 text-xl font-black">
                    Đã tạo đơn hàng #{createdOrder.id}
                  </h2>
                  <p className="mt-2 text-sm font-semibold">
                    Trạng thái hiện tại: {createdOrder.status}. Admin có thể xử
                    lý đơn này ở batch tiếp theo.
                  </p>
                  <Button
                    type="button"
                    className="mt-4 bg-emerald-600 font-bold hover:bg-emerald-700"
                    onClick={() => router.push("/")}
                  >
                    Tiếp tục mua hàng
                  </Button>
                </section>
              )}

              <section className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-700">
                      Giỏ hàng
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-emerald-950">
                      {formatNumber(cartQuantity)} sản phẩm
                    </h2>
                  </div>
                  <ShoppingBasket className="size-8 text-emerald-700" />
                </div>

                {cartItems.length === 0 ? (
                  <div className="mt-5 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Giỏ hàng đang trống. Hãy quay lại trang mua hàng để thêm sản
                    phẩm trước khi checkout.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-3 rounded-[8px] border border-emerald-100 p-3 sm:grid-cols-[72px_1fr_auto]"
                      >
                        <div
                          className="h-20 rounded-[8px] bg-emerald-50 bg-cover bg-center"
                          style={{
                            backgroundImage: item.thumbnail
                              ? `url("${getAssetUrl(item.thumbnail)}")`
                              : "none",
                          }}
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-black text-slate-950">
                            {item.productName}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {formatCurrency(item.productPrice)} /{" "}
                            {item.unit || "sản phẩm"}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-emerald-700">
                            Tồn kho: {formatNumber(item.stock)}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-semibold text-slate-500">
                            SL: {item.quantity}
                          </p>
                          <p className="mt-1 font-black text-emerald-700">
                            {formatCurrency(item.lineTotal)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-700">
                      Địa chỉ giao hàng
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-emerald-950">
                      Chọn nơi nhận hàng
                    </h2>
                  </div>
                  <MapPin className="size-8 text-emerald-700" />
                </div>

                {addresses.length > 0 ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {addresses.map((address) => {
                      const active =
                        String(address.id) === String(selectedAddressId);

                      return (
                        <label
                          key={address.id}
                          className={`cursor-pointer rounded-[8px] border p-4 transition ${
                            active
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-emerald-100 bg-white hover:border-emerald-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="shippingAddress"
                            value={address.id}
                            checked={active}
                            onChange={(event) => {
                              setSelectedAddressId(event.target.value);
                              setPreview(null);
                            }}
                            className="sr-only"
                          />
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-black text-slate-950">
                              {address.fullName}
                            </p>
                            {address.defaultAddress && (
                              <span className="rounded-[8px] bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-semibold text-slate-600">
                            {address.phone}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {address.address}, {address.city}
                          </p>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Bạn chưa có địa chỉ giao hàng. Thêm địa chỉ bên dưới để
                    tiếp tục checkout.
                  </div>
                )}

                <div className="mt-5 rounded-[8px] border border-emerald-100 bg-[#f6faef] p-4">
                  <div className="mb-4 flex items-center gap-2 font-black text-emerald-950">
                    <Plus className="size-4" />
                    Thêm địa chỉ mới
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="address-full-name">Người nhận</Label>
                      <Input
                        id="address-full-name"
                        value={addressForm.fullName}
                        onChange={(event) =>
                          updateAddressForm("fullName", event.target.value)
                        }
                        required={addresses.length === 0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address-phone">Số điện thoại</Label>
                      <Input
                        id="address-phone"
                        value={addressForm.phone}
                        onChange={(event) =>
                          updateAddressForm("phone", event.target.value)
                        }
                        required={addresses.length === 0}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address-city">Tỉnh/thành phố</Label>
                      <Input
                        id="address-city"
                        value={addressForm.city}
                        onChange={(event) =>
                          updateAddressForm("city", event.target.value)
                        }
                        required={addresses.length === 0}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address-detail">Địa chỉ chi tiết</Label>
                      <Textarea
                        id="address-detail"
                        value={addressForm.address}
                        onChange={(event) =>
                          updateAddressForm("address", event.target.value)
                        }
                        rows={3}
                        required={addresses.length === 0}
                      />
                    </div>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={addressForm.defaultAddress}
                      onChange={(event) =>
                        updateAddressForm("defaultAddress", event.target.checked)
                      }
                      className="size-4 rounded border-emerald-200 text-emerald-600"
                    />
                    Đặt làm địa chỉ mặc định
                  </label>
                  <Button
                    type="button"
                    className="mt-4 bg-slate-950 font-bold hover:bg-emerald-700"
                    disabled={savingAddress}
                    onClick={handleSaveAddress}
                  >
                    {savingAddress ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Thêm địa chỉ
                  </Button>
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="sticky top-24 rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-700">
                      Tóm tắt thanh toán
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-emerald-950">
                      {formatCurrency(summary.totalPrice)}
                    </h2>
                  </div>
                  <CreditCard className="size-8 text-emerald-700" />
                </div>

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">
                      Phương thức thanh toán
                    </Label>
                    <select
                      id="payment-method"
                      value={paymentMethod}
                      onChange={(event) => {
                        setPaymentMethod(event.target.value);
                        setPreview(null);
                      }}
                      className="h-10 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="cash">Thanh toán khi nhận hàng</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coupon-code">Mã giảm giá</Label>
                    <Input
                      id="coupon-code"
                      value={couponCode}
                      onChange={(event) => {
                        setCouponCode(event.target.value);
                        setPreview(null);
                      }}
                      placeholder="Nhập mã nếu có"
                    />
                  </div>

                  <div className="rounded-[8px] border border-emerald-100 bg-[#f6faef] p-4">
                    <div className="space-y-2 text-sm font-semibold text-slate-600">
                      <div className="flex justify-between">
                        <span>Tạm tính</span>
                        <span>{formatCurrency(summary.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Giảm giá</span>
                        <span>-{formatCurrency(summary.discountAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phí giao hàng</span>
                        <span>{formatCurrency(summary.shippingFee)}</span>
                      </div>
                      <div className="flex justify-between border-t border-emerald-100 pt-3 text-base font-black text-slate-950">
                        <span>Tổng thanh toán</span>
                        <span>{formatCurrency(summary.totalPrice)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedAddress && (
                    <div className="rounded-[8px] border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
                      <p className="font-black">Giao đến</p>
                      <p className="mt-1 font-semibold">
                        {selectedAddress.fullName} - {selectedAddress.phone}
                      </p>
                      <p className="mt-1 leading-6">
                        {selectedAddress.address}, {selectedAddress.city}
                      </p>
                    </div>
                  )}

                  {preview?.warnings?.length > 0 && (
                    <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                      {preview.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  )}

                  {notice && (
                    <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                      {notice}
                    </div>
                  )}

                  {error && (
                    <div className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 border-emerald-100 bg-white font-bold text-emerald-800"
                      disabled={previewing || submitting || cartItems.length === 0}
                      onClick={handlePreview}
                    >
                      {previewing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                      Cập nhật tổng
                    </Button>
                    <Button
                      type="submit"
                      className="h-11 bg-emerald-600 font-black hover:bg-emerald-700"
                      disabled={submitting || cartItems.length === 0}
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <PackageCheck className="size-4" />
                      )}
                      Tạo đơn hàng
                    </Button>
                  </div>

                  <p className="text-xs leading-5 text-slate-500">
                    Đơn PayPal hiện được tạo ở trạng thái chờ thanh toán; bước
                    xác nhận PayPal sẽ nối ở batch sau.
                  </p>
                </div>
              </section>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}
