"use client";

import { useEffect } from "react";
import { orderService, persistGuestAutoLogin } from "@/services/order.service";

const PATCH_FLAG = "__agriGuestCheckoutPaymentPatchInstalled";

function isCheckoutPage() {
  return typeof window !== "undefined" && window.location.pathname === "/checkout";
}

function isGuestCheckoutPayload(payload) {
  return Boolean(payload?.guestPhone && Array.isArray(payload?.items));
}

function readSelectedPaymentMethod(fallback = "cash") {
  if (typeof document === "undefined") {
    return fallback || "cash";
  }

  const paymentSelect = Array.from(document.querySelectorAll("select")).find((select) =>
    Array.from(select.options || []).some((option) =>
      ["cash", "vnpay", "paypal"].includes(String(option.value || "").toLowerCase())
    )
  );

  const value = String(paymentSelect?.value || fallback || "cash").toLowerCase();
  return ["cash", "vnpay"].includes(value) ? value : "cash";
}

function readAppliedCouponCode(fallback = "") {
  if (typeof document === "undefined") {
    return fallback || undefined;
  }

  const removeButtons = Array.from(document.querySelectorAll('button[title^="Gỡ mã "]'));
  const codesFromButtons = removeButtons
    .map((button) => String(button.getAttribute("title") || "").replace(/^Gỡ mã\s+/i, "").trim())
    .filter(Boolean);

  if (codesFromButtons.length > 0) {
    return codesFromButtons.join(",");
  }

  const codeCandidates = Array.from(document.querySelectorAll(".font-mono, [class*='font-mono']"))
    .map((element) => String(element.textContent || "").trim())
    .filter((text) => /^[A-Z0-9_,-]{3,}$/i.test(text))
    .filter((text) => !/^#?\d+$/.test(text));

  if (codeCandidates.length > 0) {
    return [...new Set(codeCandidates)].join(",");
  }

  return fallback || undefined;
}

function buildGuestPayload(payload = {}) {
  if (!isCheckoutPage() || !isGuestCheckoutPayload(payload)) {
    return payload;
  }

  const paymentMethod = readSelectedPaymentMethod(payload.paymentMethod);
  const couponCode = readAppliedCouponCode(payload.couponCode);

  return {
    ...payload,
    paymentMethod,
    couponCode: couponCode || undefined,
  };
}

export function CheckoutGuestPaymentCompatibility() {
  useEffect(() => {
    if (typeof window === "undefined" || orderService[PATCH_FLAG]) {
      return;
    }

    const originalPreviewGuestCheckout = orderService.previewGuestCheckout.bind(orderService);
    const originalGuestCheckout = orderService.guestCheckout.bind(orderService);

    orderService.previewGuestCheckout = async (payload = {}) => {
      return originalPreviewGuestCheckout(buildGuestPayload(payload));
    };

    orderService.guestCheckout = async (payload = {}) => {
      const nextPayload = buildGuestPayload(payload);
      const order = await originalGuestCheckout(nextPayload);

      if (
        isCheckoutPage() &&
        isGuestCheckoutPayload(nextPayload) &&
        nextPayload.paymentMethod === "vnpay" &&
        order?.id &&
        nextPayload.guestPhone
      ) {
        persistGuestAutoLogin(order, nextPayload);
        const payment = await orderService.createGuestVnpayPaymentUrl(order.id, nextPayload.guestPhone, {
          locale: "vn",
        });

        if (payment?.paymentUrl) {
          window.location.assign(payment.paymentUrl);
        }
      }

      return order;
    };

    orderService[PATCH_FLAG] = true;
  }, []);

  return null;
}
