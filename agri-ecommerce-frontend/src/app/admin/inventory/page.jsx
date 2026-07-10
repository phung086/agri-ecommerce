"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Database,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Store,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { adminService } from "@/services/admin.service";

const tabs = [
  { key: "products", label: "Sản phẩm trong kho" },
  { key: "batches", label: "Lô hàng" },
  { key: "alerts", label: "Cảnh báo date" },
  { key: "transactions", label: "Nhật ký" },
];

const blankForm = {
  productId: "",
  batchNumber: "",
  importPrice: "",
  originalQuantity: "",
  receivedAt: "",
  manufactureDate: "",
  expiryDate: "",
  supplierName: "",
  storageLocation: "",
  note: "",
};

function toDateTime(value) {
  return value ? `${value}T00:00:00` : null;
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(value) {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleString("vi-VN");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function matchesKeyword(record, fields, keyword) {
  const normalizedKeyword = normalizeSearchText(keyword);
  if (!normalizedKeyword) return true;
  return fields
    .map((field) => (typeof field === "function" ? field(record) : record?.[field]))
    .filter((value) => value !== null && value !== undefined)
    .some((value) => normalizeSearchText(value).includes(normalizedKeyword));
}

function statusLabel(status) {
  const normalized = String(status || "").toUpperCase();
  const map = {
    ACTIVE: "Khả dụng",
    NEAR_EXPIRY: "Cận date",
    EXPIRED: "Hết hạn",
    DEPLETED: "Hết lô",
    NEED_DATE_UPDATE: "Cần cập nhật date",
  };
  return map[normalized] || status || "Không rõ";
}

function statusBadgeClass(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "EXPIRED") return "bg-red-50 text-red-700 border-red-100";
  if (normalized === "NEAR_EXPIRY") return "bg-amber-50 text-amber-700 border-amber-100";
  if (normalized === "NEED_DATE_UPDATE") return "bg-sky-50 text-sky-700 border-sky-100";
  if (normalized === "DEPLETED") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-100";
}

function freshnessLabel(status) {
  const normalized = String(status || "").toLowerCase();
  const map = {
    fresh: "Tươi/ổn định",
    near_expiry: "Có lô cận date",
    expired_stock: "Có tồn quá hạn",
    need_date_update: "Thiếu date",
    untracked: "Chưa có lô",
  };
  return map[normalized] || status || "Chưa rõ";
}

function MetricCard({ icon: Icon, title, value, caption }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value ?? 0}</p>
          {caption && <p className="mt-1 text-xs font-semibold text-slate-400">{caption}</p>}
        </div>
        <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState("products");
  const [summary, setSummary] = useState(null);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [batchStatus, setBatchStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [form, setForm] = useState(blankForm);

  const filteredProducts = useMemo(() => {
    return inventoryProducts.filter((product) =>
      matchesKeyword(product, [
        "productName",
        "productSlug",
        "categoryName",
        "categorySlug",
        "unit",
        "status",
        "freshnessStatus",
        (item) => freshnessLabel(item.freshnessStatus),
      ], appliedKeyword)
    );
  }, [inventoryProducts, appliedKeyword]);

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) =>
      matchesKeyword(batch, [
        "productName",
        "productSlug",
        "categoryName",
        "batchNumber",
        "supplierName",
        "storageLocation",
        "status",
        "note",
        (item) => statusLabel(item.status),
      ], appliedKeyword)
    );
  }, [batches, appliedKeyword]);

  const filteredExpiryAlerts = useMemo(() => {
    return expiryAlerts.filter((batch) =>
      matchesKeyword(batch, [
        "productName",
        "productSlug",
        "categoryName",
        "batchNumber",
        "supplierName",
        "storageLocation",
        "status",
        (item) => statusLabel(item.status),
      ], appliedKeyword)
    );
  }, [expiryAlerts, appliedKeyword]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) =>
      matchesKeyword(transaction, [
        "productName",
        "batchNumber",
        "type",
        "referenceType",
        "note",
        (item) => item.quantity,
        (item) => item.previousStock,
        (item) => item.newStock,
      ], appliedKeyword)
    );
  }, [transactions, appliedKeyword]);

  async function loadData() {
    setLoading(true);
    try {
      const keywordParam = appliedKeyword.trim() || undefined;
      const [summaryResult, productsResult, batchesResult, alertsResult, transactionsResult, adminProductsResult] = await Promise.allSettled([
        adminService.getInventorySummary({ threshold: 10 }),
        adminService.getInventoryProducts({ includeOk: true, keyword: keywordParam, size: 100, sort: "stock,asc" }),
        adminService.getBatches({ status: batchStatus || undefined, productId: undefined, includeDepleted: true }),
        adminService.getExpiryAlerts({ days: 3 }),
        adminService.getTransactions(),
        adminService.getProducts({ size: 100, sort: "name,asc" }),
      ]);

      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
      if (productsResult.status === "fulfilled") setInventoryProducts(productsResult.value?.content || []);
      if (batchesResult.status === "fulfilled") setBatches(batchesResult.value || []);
      if (alertsResult.status === "fulfilled") setExpiryAlerts(alertsResult.value || []);
      if (transactionsResult.status === "fulfilled") setTransactions(transactionsResult.value || []);
      if (adminProductsResult.status === "fulfilled") setProducts(adminProductsResult.value?.content || adminProductsResult.value || []);

      const failed = [summaryResult, productsResult, batchesResult, alertsResult, transactionsResult, adminProductsResult]
        .filter((result) => result.status === "rejected");
      if (failed.length > 0) toast.warning("Một phần dữ liệu kho chưa tải được. Hãy thử làm mới lại.");
    } catch (error) {
      console.error("Failed to load inventory data:", error);
      toast.error(error?.message || "Không thể tải thông tin kho hàng");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(loadData, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchStatus, appliedKeyword]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setAppliedKeyword(searchKeyword.trim());
  }

  function handleClearSearch() {
    setSearchKeyword("");
    setAppliedKeyword("");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleImportSubmit(event) {
    event.preventDefault();
    if (!form.productId || !form.batchNumber || !form.importPrice || !form.originalQuantity || !form.expiryDate) {
      toast.error("Vui lòng nhập đủ sản phẩm, mã lô, giá nhập, số lượng và hạn sử dụng");
      return;
    }
    if (form.manufactureDate && form.expiryDate <= form.manufactureDate) {
      toast.error("Hạn sử dụng phải sau ngày sản xuất");
      return;
    }

    setActionLoading(true);
    try {
      await adminService.createBatch({
        productId: Number(form.productId),
        batchNumber: form.batchNumber.trim(),
        importPrice: Number(form.importPrice),
        originalQuantity: Number(form.originalQuantity),
        receivedAt: toDateTime(form.receivedAt),
        manufactureDate: toDateTime(form.manufactureDate),
        expiryDate: toDateTime(form.expiryDate),
        supplierName: form.supplierName.trim() || null,
        storageLocation: form.storageLocation.trim() || null,
        note: form.note.trim() || null,
      });
      toast.success("Nhập kho lô hàng mới thành công");
      setForm(blankForm);
      setShowImportModal(false);
      await loadData();
    } catch (error) {
      console.error("Import failed:", error);
      toast.error(error?.message || "Nhập kho thất bại. Vui lòng kiểm tra lại thông tin");
    } finally {
      setActionLoading(false);
    }
  }

  async function runAction(action, successMessage) {
    setActionLoading(true);
    try {
      const result = await action();
      const message = typeof successMessage === "function" ? successMessage(result) : successMessage;
      toast.success(message);
      await loadData();
    } catch (error) {
      console.error("Inventory action failed:", error);
      toast.error(error?.message || "Thao tác kho thất bại");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý kho & hạn sử dụng"
        description="Theo dõi tồn kho, lô hàng, hạn sử dụng, vị trí lưu trữ và các chương trình xả hàng cận date."
        image="/market-assets/fresh-market-hero.png"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton onClick={() => runAction(adminService.backfillLegacyBatches, "Đã đồng bộ sản phẩm cũ vào kho")} disabled={actionLoading} tone="sky" icon={Database}>Đồng bộ SP cũ</ActionButton>
          <ActionButton onClick={() => runAction(adminService.seedInventoryDemoData, "Đã cập nhật NSX/HSD/NCC/vị trí cho các lô còn thiếu")} disabled={actionLoading} tone="emerald" icon={CalendarDays}>Cập nhật date</ActionButton>
          <ActionButton
            onClick={() => runAction(
              () => adminService.generateNearExpiryCoupons({ days: 3, discountPercentage: 20 }),
              (result) => `Đã tạo/cập nhật ${result?.createdOrUpdatedCouponCount || 0} voucher xả hàng cận date`
            )}
            disabled={actionLoading}
            tone="rose"
            icon={AlertTriangle}
          >
            Tạo voucher cận date
          </ActionButton>
          <ActionButton onClick={() => runAction(adminService.recalculateInventory, "Đã tính lại tồn kho từ lô hàng")} disabled={actionLoading} tone="amber" icon={RotateCcw}>Tính lại tồn kho</ActionButton>
          <ActionButton onClick={() => runAction(adminService.triggerScan, "Quét kho hoàn tất")} disabled={actionLoading} tone="slate" icon={RefreshCw}>Quét hạn</ActionButton>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            disabled={actionLoading}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus className="size-4" />
            Nhập lô mới
          </button>
        </div>
      </AdminPageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Package} title="Tổng sản phẩm" value={summary?.totalProducts} caption="Không tính sản phẩm ẩn" />
        <MetricCard icon={Store} title="Tồn kho sản phẩm" value={summary?.totalStockUnits} caption="Tổng tồn đang ghi nhận" />
        <MetricCard icon={CalendarDays} title="Lô cần cập nhật date" value={summary?.needDateUpdateBatches} caption="Các lô cần bổ sung HSD" />
        <MetricCard icon={AlertTriangle} title="Lô cận/hết hạn" value={(summary?.nearExpiryBatches || 0) + (summary?.expiredBatches || 0)} caption="Có thể tạo voucher xả hàng" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${activeTab === tab.key ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Tìm sản phẩm, lô, NCC, vị trí..."
              className="h-10 w-72 max-w-full rounded-[8px] border border-slate-200 pl-9 pr-9 text-sm outline-none transition focus:border-emerald-500"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Xóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <button type="submit" className="h-10 rounded-[8px] bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700">
            Tìm
          </button>
          <select value={batchStatus} onChange={(event) => setBatchStatus(event.target.value)} className="h-10 rounded-[8px] border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-emerald-500">
            <option value="">Tất cả trạng thái lô</option>
            <option value="ACTIVE">Khả dụng</option>
            <option value="NEAR_EXPIRY">Cận date</option>
            <option value="EXPIRED">Hết hạn</option>
            <option value="NEED_DATE_UPDATE">Cần cập nhật date</option>
            <option value="DEPLETED">Hết lô</option>
          </select>
        </form>
      </div>

      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <RefreshCw className="size-8 animate-spin text-emerald-600" />
            <p className="text-sm font-bold">Đang tải dữ liệu kho...</p>
          </div>
        </div>
      ) : activeTab === "products" ? (
        <InventoryProductsTable products={filteredProducts} />
      ) : activeTab === "batches" ? (
        <BatchesTable batches={filteredBatches} />
      ) : activeTab === "alerts" ? (
        <BatchesTable batches={filteredExpiryAlerts} emptyText="Không có cảnh báo hạn sử dụng phù hợp." />
      ) : (
        <TransactionsTable transactions={filteredTransactions} />
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Nhập kho lô hàng mới</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Mỗi lô cần có ngày nhập, NSX và HSD để hệ thống kiểm soát date.</p>
              </div>
              <button type="button" onClick={() => setShowImportModal(false)} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-600">Đóng</button>
            </div>

            <form onSubmit={handleImportSubmit} className="grid gap-4 md:grid-cols-2">
              <Field label="Sản phẩm *" className="md:col-span-2">
                <select name="productId" value={form.productId} onChange={handleInputChange} required className="input">
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.unit || "đơn vị"})</option>)}
                </select>
              </Field>
              <Field label="Mã lô *"><input name="batchNumber" value={form.batchNumber} onChange={handleInputChange} required placeholder="VD: RAU-202607-001" className="input" /></Field>
              <Field label="Giá nhập *"><input type="number" min="1" name="importPrice" value={form.importPrice} onChange={handleInputChange} required className="input" /></Field>
              <Field label="Số lượng nhập *"><input type="number" min="1" name="originalQuantity" value={form.originalQuantity} onChange={handleInputChange} required className="input" /></Field>
              <Field label="Ngày nhập"><input type="date" name="receivedAt" value={form.receivedAt} onChange={handleInputChange} className="input" /></Field>
              <Field label="Ngày sản xuất"><input type="date" name="manufactureDate" value={form.manufactureDate} onChange={handleInputChange} className="input" /></Field>
              <Field label="Hạn sử dụng *"><input type="date" name="expiryDate" value={form.expiryDate} onChange={handleInputChange} required className="input" /></Field>
              <Field label="Nhà cung cấp"><input name="supplierName" value={form.supplierName} onChange={handleInputChange} placeholder="VD: HTX Rau sạch Hà Đông" className="input" /></Field>
              <Field label="Vị trí kho"><input name="storageLocation" value={form.storageLocation} onChange={handleInputChange} placeholder="VD: Kho A - Kệ 02" className="input" /></Field>
              <Field label="Ghi chú" className="md:col-span-2"><textarea name="note" value={form.note} onChange={handleInputChange} rows={3} className="input" placeholder="Ghi chú kiểm định, nguồn gốc, điều kiện bảo quản..." /></Field>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 md:col-span-2">
                <button type="button" onClick={() => setShowImportModal(false)} className="rounded-[8px] px-4 py-2 text-sm font-black text-slate-500 hover:bg-slate-100">Hủy</button>
                <button type="submit" disabled={actionLoading} className="rounded-[8px] bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">{actionLoading ? "Đang nhập..." : "Nhập kho"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .input { width: 100%; border-radius: 0.5rem; border: 1px solid #e2e8f0; padding: 0.625rem 0.75rem; font-size: 0.875rem; outline: none; transition: border-color 0.15s ease; }
        .input:focus { border-color: #10b981; }
      `}</style>
    </div>
  );
}

function ActionButton({ children, onClick, disabled, icon: Icon, tone = "slate" }) {
  const tones = {
    sky: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    rose: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
    amber: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    slate: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-sm font-black transition disabled:opacity-50 ${tones[tone] || tones.slate}`}>
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function Field({ label, children, className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}

function InventoryProductsTable({ products }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-600"><tr><th className="px-5 py-3">Sản phẩm</th><th className="px-5 py-3">Tồn kho</th><th className="px-5 py-3">Theo lô</th><th className="px-5 py-3">Hạn gần nhất</th><th className="px-5 py-3">Trạng thái tươi</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {products.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center font-semibold text-slate-400">Không tìm thấy sản phẩm kho phù hợp.</td></tr> : products.map((product) => (
            <tr key={product.productId} className="hover:bg-slate-50">
              <td className="px-5 py-4"><p className="font-black text-slate-900">{product.productName}</p><p className="text-xs font-semibold text-slate-400">#{product.productId} · {product.categoryName || "Chưa phân loại"}</p></td>
              <td className="px-5 py-4 font-black text-slate-900">{product.stock || 0} {product.unit || ""}</td>
              <td className="px-5 py-4 text-xs font-semibold text-slate-500"><p>Tracked: {product.batchTrackedStock || 0}</p><p>Chưa khớp: {product.untrackedStock || 0}</p><p>Lô thiếu date: {product.needDateUpdateBatchCount || 0}</p></td>
              <td className="px-5 py-4 text-xs font-bold text-slate-700"><p>{formatDate(product.earliestExpiryDate)}</p>{product.daysUntilExpiry != null && <p className="text-slate-400">Còn {product.daysUntilExpiry} ngày</p>}</td>
              <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusBadgeClass(String(product.freshnessStatus || "ACTIVE").toUpperCase())}`}>{freshnessLabel(product.freshnessStatus)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BatchesTable({ batches, emptyText = "Không tìm thấy lô hàng phù hợp." }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-600"><tr><th className="px-5 py-3">Lô hàng</th><th className="px-5 py-3">Sản phẩm</th><th className="px-5 py-3">Số lượng</th><th className="px-5 py-3">Ngày nhập / NSX / HSD</th><th className="px-5 py-3">Vị trí</th><th className="px-5 py-3">Trạng thái</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {batches.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center font-semibold text-slate-400">{emptyText}</td></tr> : batches.map((batch) => (
            <tr key={batch.id} className="hover:bg-slate-50">
              <td className="px-5 py-4"><p className="font-mono font-black text-slate-900">{batch.batchNumber}</p>{batch.legacyBatch && <p className="mt-1 text-xs font-black text-sky-600">Legacy stock</p>}</td>
              <td className="px-5 py-4"><p className="font-black text-slate-900">{batch.productName}</p><p className="text-xs font-semibold text-slate-400">#{batch.productId} · {batch.categoryName || "Chưa phân loại"}</p></td>
              <td className="px-5 py-4"><p className="font-black text-slate-900">{batch.remainingQuantity || 0}/{batch.originalQuantity || 0}</p><p className="text-xs font-semibold text-slate-400">Giá nhập: {formatCurrency(batch.importPrice)}</p></td>
              <td className="px-5 py-4 text-xs font-semibold text-slate-600"><p>Nhập: {formatDate(batch.receivedAt || batch.createdAt)}</p><p>NSX: {formatDate(batch.manufactureDate)}</p><p>HSD: {formatDate(batch.expiryDate)}</p>{batch.daysUntilExpiry != null && <p className="text-slate-400">Còn {batch.daysUntilExpiry} ngày</p>}</td>
              <td className="px-5 py-4 text-xs font-semibold text-slate-500"><p>{batch.storageLocation || "Chưa cập nhật vị trí"}</p><p>{batch.supplierName || "Chưa cập nhật NCC"}</p></td>
              <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusBadgeClass(batch.status)}`}>{statusLabel(batch.status)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionsTable({ transactions }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-600"><tr><th className="px-5 py-3">Thời gian</th><th className="px-5 py-3">Sản phẩm / Lô</th><th className="px-5 py-3">Số lượng</th><th className="px-5 py-3">Loại</th><th className="px-5 py-3">Tồn trước/sau</th><th className="px-5 py-3">Ghi chú</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center font-semibold text-slate-400">Không tìm thấy nhật ký kho phù hợp.</td></tr> : transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-slate-50">
              <td className="px-5 py-4 text-xs font-semibold text-slate-500">{formatDateTime(tx.createdAt)}</td>
              <td className="px-5 py-4"><p className="font-black text-slate-900">{tx.productName}</p>{tx.batchNumber && <p className="font-mono text-xs font-semibold text-slate-400">Lô: {tx.batchNumber}</p>}</td>
              <td className={`px-5 py-4 font-mono font-black ${Number(tx.quantity || 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>{Number(tx.quantity || 0) >= 0 ? `+${tx.quantity || 0}` : tx.quantity}</td>
              <td className="px-5 py-4 text-xs font-black text-slate-700">{tx.type}</td>
              <td className="px-5 py-4 text-xs font-semibold text-slate-500">{tx.previousStock ?? "---"} → {tx.newStock ?? "---"}</td>
              <td className="px-5 py-4 text-xs font-semibold text-slate-500">{tx.note || "---"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
