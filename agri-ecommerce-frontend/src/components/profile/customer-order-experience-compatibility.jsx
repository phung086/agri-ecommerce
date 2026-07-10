"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => {
  if (response && typeof response === "object" && "success" in response) {
    return response.data ?? null;
  }
  return response?.data ?? response;
};

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleString("vi-VN");
}

function isPending(order) {
  return String(order?.status || "").toLowerCase() === "pending";
}

function isVnpay(order) {
  return String(order?.payment?.paymentMethod || "").toLowerCase() === "vnpay";
}

function isPaid(order) {
  return String(order?.payment?.status || "").toLowerCase() === "completed";
}

function isRefundRequested(order) {
  return String(order?.payment?.status || "").toLowerCase() === "refund_requested";
}

function getOrderPaymentLabel(order) {
  const method = String(order?.payment?.paymentMethod || "cash").toLowerCase();
  if (method === "vnpay") return "VNPay";
  if (method === "cash" || method === "cod") return "Thanh toán khi nhận hàng";
  return method;
}

function findProfileArticle(order) {
  const token = order?.trackingNumber || `#${order?.id}`;
  if (!token) return null;
  return Array.from(document.querySelectorAll("article")).find((article) =>
    article.textContent?.includes(`Đơn hàng ${token}`) ||
    article.textContent?.includes(String(token)) ||
    article.textContent?.includes(`#${order.id}`)
  );
}

function renderProfileOrderPanel(article, order) {
  if (!article || article.querySelector(`[data-order-flow-panel="${order.id}"]`)) return;
  if (!isPending(order)) return;

  const panel = document.createElement("div");
  panel.dataset.orderFlowPanel = String(order.id);
  panel.className = "mx-4 mb-4 rounded-[8px] border border-emerald-100 bg-white p-4 text-sm shadow-sm";

  if (isVnpay(order)) {
    if (isRefundRequested(order)) {
      panel.innerHTML = `
        <div class="rounded-[8px] border border-amber-200 bg-amber-50 p-3 font-semibold text-amber-900">
          Đơn hàng đã thanh toán qua VNPay và đã được ghi nhận yêu cầu hoàn tiền. AgriMarket sẽ kiểm tra giao dịch và xử lý theo thông tin ngân hàng đã gửi.
        </div>
      `;
    } else if (isPaid(order)) {
      panel.innerHTML = `
        <div class="space-y-3">
          <div class="rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 font-semibold text-emerald-900">
            Đơn hàng này đã thanh toán qua VNPay. Để hủy đơn, vui lòng nhập thông tin tài khoản ngân hàng để AgriMarket thực hiện hoàn tiền.
          </div>
          <div class="grid gap-2 sm:grid-cols-3">
            <input data-refund-bank class="h-10 rounded-[8px] border border-slate-200 px-3 font-semibold outline-none focus:border-emerald-500" placeholder="Ngân hàng" />
            <input data-refund-account class="h-10 rounded-[8px] border border-slate-200 px-3 font-semibold outline-none focus:border-emerald-500" inputmode="numeric" placeholder="Số tài khoản" />
            <input data-refund-holder class="h-10 rounded-[8px] border border-slate-200 px-3 font-semibold outline-none focus:border-emerald-500" placeholder="Tên chủ tài khoản" />
          </div>
          <textarea data-refund-reason class="h-20 w-full rounded-[8px] border border-slate-200 px-3 py-2 font-semibold outline-none focus:border-emerald-500" placeholder="Lý do hủy đơn (không bắt buộc)"></textarea>
          <button data-refund-submit class="inline-flex h-10 items-center justify-center rounded-[8px] bg-slate-950 px-4 font-black text-white transition hover:bg-emerald-700">
            Gửi yêu cầu hủy & hoàn tiền
          </button>
        </div>
      `;
      const button = panel.querySelector("[data-refund-submit]");
      button?.addEventListener("click", async () => {
        const bankName = panel.querySelector("[data-refund-bank]")?.value?.trim();
        const bankAccountNumber = panel.querySelector("[data-refund-account]")?.value?.replace(/\D/g, "");
        const bankAccountHolder = panel.querySelector("[data-refund-holder]")?.value?.trim();
        const reason = panel.querySelector("[data-refund-reason]")?.value?.trim();
        if (!bankName || !bankAccountNumber || !bankAccountHolder) {
          toast.error("Vui lòng nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản.");
          return;
        }
        button.disabled = true;
        button.textContent = "Đang gửi yêu cầu...";
        try {
          await axiosClient.patch(`/customer/orders/${order.id}/refund-cancel`, {
            bankName,
            bankAccountNumber,
            bankAccountHolder,
            reason,
          });
          toast.success("Đã ghi nhận yêu cầu hủy đơn và hoàn tiền.");
          window.setTimeout(() => window.location.reload(), 700);
        } catch (error) {
          button.disabled = false;
          button.textContent = "Gửi yêu cầu hủy & hoàn tiền";
          toast.error(error?.message || "Không thể gửi yêu cầu hoàn tiền.");
        }
      });
    }
  } else {
    panel.innerHTML = `
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="font-black text-slate-950">Đơn COD đang chờ xử lý</p>
          <p class="mt-1 font-semibold text-slate-500">Bạn có thể hủy đơn trước khi cửa hàng xác nhận và giao cho đơn vị vận chuyển.</p>
        </div>
        <button data-cod-cancel class="inline-flex h-10 items-center justify-center rounded-[8px] border border-red-200 bg-red-50 px-4 font-black text-red-700 transition hover:bg-red-100">
          Hủy đơn
        </button>
      </div>
    `;
    const button = panel.querySelector("[data-cod-cancel]");
    button?.addEventListener("click", async () => {
      if (!window.confirm("Bạn chắc chắn muốn hủy đơn hàng này?")) return;
      button.disabled = true;
      button.textContent = "Đang hủy...";
      try {
        await axiosClient.patch(`/customer/orders/${order.id}/cancel`, {
          note: "Khách hàng hủy đơn COD khi đơn đang chờ xử lý.",
        });
        toast.success("Đã hủy đơn hàng.");
        window.setTimeout(() => window.location.reload(), 700);
      } catch (error) {
        button.disabled = false;
        button.textContent = "Hủy đơn";
        toast.error(error?.message || "Không thể hủy đơn hàng.");
      }
    });
  }

  if (panel.textContent.trim()) {
    const expandedArea = article.querySelector(".border-t.border-emerald-100") || article.lastElementChild;
    if (expandedArea && expandedArea !== article.firstElementChild) {
      expandedArea.prepend(panel);
    } else {
      article.appendChild(panel);
    }
  }
}

function injectCheckoutInvoice(order) {
  if (!order || document.querySelector("[data-cod-invoice-panel]")) return;
  const successSection = Array.from(document.querySelectorAll("section")).find((section) =>
    section.textContent?.includes("Đơn đặt hàng của bạn đã được gửi đi") ||
    section.textContent?.includes("Đặt hàng thành công")
  );
  if (!successSection) return;

  const paymentMethod = getOrderPaymentLabel(order);
  const paidStatus = isVnpay(order) && isPaid(order) ? "Đã thanh toán" : "Thanh toán khi nhận hàng";
  const invoice = document.createElement("div");
  invoice.dataset.codInvoicePanel = "true";
  invoice.className = "rounded-[8px] border border-emerald-100 bg-white p-4 text-left shadow-sm";
  invoice.innerHTML = `
    <div class="flex flex-col gap-3 border-b border-emerald-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-black uppercase text-emerald-700">Hóa đơn đặt hàng</p>
        <h3 class="text-xl font-black text-emerald-950">INV-${String(order.id || 0).padStart(6, "0")}</h3>
        <p class="mt-1 text-xs font-semibold text-slate-500">Hóa đơn tạm được lập ngay sau khi đặt hàng thành công.</p>
      </div>
      <button data-print-invoice class="inline-flex h-9 items-center justify-center rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50">In hóa đơn</button>
    </div>
    <div class="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-[8px] border border-emerald-100 p-3"><p class="text-xs font-black uppercase text-slate-500">Mã đơn hàng</p><p class="mt-1 font-black text-slate-950">#${order.id || "-"}</p></div>
      <div class="rounded-[8px] border border-emerald-100 p-3"><p class="text-xs font-black uppercase text-slate-500">Phương thức</p><p class="mt-1 font-black text-slate-950">${paymentMethod}</p></div>
      <div class="rounded-[8px] border border-emerald-100 p-3"><p class="text-xs font-black uppercase text-slate-500">Trạng thái</p><p class="mt-1 font-black text-emerald-700">${paidStatus}</p></div>
      <div class="rounded-[8px] border border-emerald-100 p-3"><p class="text-xs font-black uppercase text-slate-500">Ngày đặt</p><p class="mt-1 font-black text-slate-950">${formatDate(order.createdAt)}</p></div>
      <div class="rounded-[8px] border border-emerald-100 p-3"><p class="text-xs font-black uppercase text-slate-500">Mã vận đơn</p><p class="mt-1 font-black text-slate-950">${order.trackingNumber || "Chờ xử lý"}</p></div>
      <div class="rounded-[8px] border border-emerald-100 p-3"><p class="text-xs font-black uppercase text-slate-500">Tổng thanh toán</p><p class="mt-1 font-black text-emerald-700">${formatCurrency(order.totalPrice)}</p></div>
    </div>
    <div class="mt-4 overflow-hidden rounded-[8px] border border-emerald-100">
      <table class="w-full text-left text-sm">
        <thead class="bg-emerald-50 text-xs font-black uppercase text-emerald-800"><tr><th class="px-3 py-2">Sản phẩm</th><th class="px-3 py-2 text-right">SL</th><th class="px-3 py-2 text-right">Đơn giá</th><th class="px-3 py-2 text-right">Thành tiền</th></tr></thead>
        <tbody class="divide-y divide-emerald-100">
          ${(order.items || []).map((item) => `
            <tr><td class="px-3 py-2 font-semibold text-slate-800">${item.productName || "Sản phẩm"}</td><td class="px-3 py-2 text-right font-bold">${item.quantity || 0}</td><td class="px-3 py-2 text-right">${formatCurrency(item.price)}</td><td class="px-3 py-2 text-right font-bold text-emerald-700">${formatCurrency(item.lineTotal || Number(item.price || 0) * Number(item.quantity || 0))}</td></tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="mt-4 ml-auto w-full max-w-sm space-y-2 text-sm">
      <div class="flex justify-between text-slate-600"><span>Tạm tính</span><span>${formatCurrency(order.subtotal)}</span></div>
      <div class="flex justify-between text-slate-600"><span>Giảm giá</span><span>-${formatCurrency(order.discountAmount || 0)}</span></div>
      <div class="flex justify-between text-slate-600"><span>Phí giao hàng</span><span>${formatCurrency(order.shippingFee || 0)}</span></div>
      <div class="flex justify-between border-t border-emerald-100 pt-2 text-base font-black text-emerald-800"><span>Tổng cộng</span><span>${formatCurrency(order.totalPrice)}</span></div>
    </div>
  `;
  invoice.querySelector("[data-print-invoice]")?.addEventListener("click", () => window.print());
  const buttons = successSection.querySelector(".flex.flex-col.sm\\:flex-row") || successSection.lastElementChild;
  successSection.insertBefore(invoice, buttons || null);
}

function replaceTechnicalInventoryText() {
  if (!window.location.pathname.includes("/admin/inventory")) return;
  const node = Array.from(document.querySelectorAll("div, p, section")).find((element) =>
    element.textContent?.includes("Luồng demo chuẩn:")
  );
  if (node) {
    node.textContent = "Gợi ý vận hành kho: bổ sung hạn sử dụng cho lô cũ và tạo ưu đãi cho các lô sắp hết hạn để bán hàng hiệu quả hơn.";
  }
}

export function CustomerOrderExperienceCompatibility() {
  const [orders, setOrders] = useState([]);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    async function loadOrders() {
      if (!window.location.pathname.includes("/profile") && !window.location.pathname.includes("/checkout")) return;
      try {
        const response = await axiosClient.get("/customer/orders", {
          params: { page: 0, size: 30, sort: "createdAt,desc" },
        });
        const data = unwrapApiData(response);
        setOrders(Array.isArray(data?.content) ? data.content : []);
        fetchedRef.current = true;
      } catch {
        setOrders([]);
      }
    }

    loadOrders();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function applyEnhancements() {
      replaceTechnicalInventoryText();
      if (window.location.pathname.includes("/profile")) {
        orders.forEach((order) => renderProfileOrderPanel(findProfileArticle(order), order));
      }
      if (window.location.pathname.includes("/checkout") && !window.location.pathname.includes("vnpay-return")) {
        const orderIdText = Array.from(document.querySelectorAll("section"))
          .find((section) => section.textContent?.includes("Mã đơn hàng:"))
          ?.textContent || "";
        const orderId = Number(orderIdText.match(/#(\d+)/)?.[1]);
        const order = orders.find((item) => Number(item.id) === orderId) || orders[0];
        if (orderId && order) injectCheckoutInvoice(order);
      }
    }

    applyEnhancements();
    const observer = new MutationObserver(applyEnhancements);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [orders]);

  return null;
}
