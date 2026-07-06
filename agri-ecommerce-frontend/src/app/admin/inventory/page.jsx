"use client";

import { useEffect, useState } from "react";
import {
  Store, 
  Plus, 
  Calendar, 
  History, 
  RefreshCw, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown
} from "lucide-react";
import { adminService } from "@/services/admin.service";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { toast } from "sonner";

export default function AdminInventoryPage() {
  const [batches, setBatches] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("batches"); // "batches" | "transactions"
  const [showImportModal, setShowImportModal] = useState(false);

  // Form State
  const [form, setForm] = useState({
    productId: "",
    batchNumber: "",
    importPrice: "",
    originalQuantity: "",
    manufactureDate: "",
    expiryDate: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [batchesData, transactionsData, productsData] = await Promise.all([
        adminService.getBatches(),
        adminService.getTransactions(),
        adminService.getProducts({ size: 100 })
      ]);
      setBatches(batchesData || []);
      setTransactions(transactionsData || []);
      setProducts(productsData?.content || productsData || []);
    } catch (error) {
      console.error("Failed to load inventory data:", error);
      toast.error("Không thể tải thông tin kho hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!form.productId || !form.batchNumber || !form.importPrice || !form.originalQuantity || !form.expiryDate) {
      toast.error("Vui lòng nhập đầy đủ các trường bắt buộc");
      return;
    }

    try {
      await adminService.createBatch({
        productId: parseInt(form.productId),
        batchNumber: form.batchNumber,
        importPrice: parseFloat(form.importPrice),
        originalQuantity: parseInt(form.originalQuantity),
        manufactureDate: form.manufactureDate ? form.manufactureDate + "T00:00:00" : null,
        expiryDate: form.expiryDate + "T00:00:00",
      });
      toast.success("Nhập kho lô hàng mới thành công!");
      setShowImportModal(false);
      setForm({
        productId: "",
        batchNumber: "",
        importPrice: "",
        originalQuantity: "",
        manufactureDate: "",
        expiryDate: "",
      });
      loadData();
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Nhập kho thất bại. Vui lòng kiểm tra lại thông tin");
    }
  };

  const handleTriggerScan = async () => {
    setScanLoading(true);
    try {
      await adminService.triggerScan();
      toast.success("Quét kho hoàn tất! Hệ thống đã lọc hàng hết hạn và phát hành Voucher cận date.");
      loadData();
    } catch (error) {
      console.error("Scan trigger failed:", error);
      toast.error("Gặp lỗi khi quét kho hàng");
    } finally {
      setScanLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val) return "0đ";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const getBatchStatusBadge = (batch) => {
    const now = new Date();
    const expiry = new Date(batch.expiryDate);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (batch.remainingQuantity <= 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          Hết hàng trong lô
        </span>
      );
    }

    if (diffDays <= 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
          <Trash2 className="size-3.5" /> Quá hạn (Hết date)
        </span>
      );
    }

    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 animate-pulse">
          <AlertTriangle className="size-3.5" /> Cận date ({diffDays} ngày)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle className="size-3.5" /> Khả dụng
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý Kho & Hạn sử dụng"
        description="Theo dõi vòng đời sản phẩm, kiểm soát tồn kho theo lô hàng FIFO, quét hàng cận date và hết hạn sử dụng."
        image="/market-assets/fresh-market-hero.png"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleTriggerScan}
            disabled={scanLoading}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${scanLoading ? "animate-spin" : ""}`} />
            Quét hạn sử dụng & Tự tạo Voucher
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            Nhập kho lô mới
          </button>
        </div>
      </AdminPageHeader>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("batches")}
            className={`border-b-2 pb-3 text-sm font-bold transition-all ${
              activeTab === "batches"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Package className="size-4" />
              Danh sách lô hàng ({batches.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`border-b-2 pb-3 text-sm font-bold transition-all ${
              activeTab === "transactions"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <History className="size-4" />
              Nhật ký xuất nhập kho ({transactions.length})
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <RefreshCw className="size-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium">Đang tải dữ liệu kho...</p>
          </div>
        </div>
      ) : activeTab === "batches" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-6 py-3">Mã Lô</th>
                <th className="px-6 py-3">Sản phẩm</th>
                <th className="px-6 py-3">Số lượng</th>
                <th className="px-6 py-3">Giá nhập</th>
                <th className="px-6 py-3">NSX / HSD</th>
                <th className="px-6 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    Chưa có lô hàng nào được nhập kho. Hãy bấm "Nhập kho lô mới" để bắt đầu.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4 font-mono font-bold text-slate-900">
                      {batch.batchNumber}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{batch.productName}</p>
                      <p className="text-xs text-slate-400">ID: #{batch.productId}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-900">{batch.remainingQuantity}</span>
                        <span className="text-slate-400">/ {batch.originalQuantity}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-bold text-slate-900">
                      {formatCurrency(batch.importPrice)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700 space-y-1">
                      <p className="flex items-center gap-1">
                        <span className="text-slate-400">NSX:</span> 
                        {batch.manufactureDate ? new Date(batch.manufactureDate).toLocaleDateString("vi-VN") : "N/A"}
                      </p>
                      <p className="flex items-center gap-1 font-bold">
                        <span className="text-slate-400 font-normal">HSD:</span> 
                        {new Date(batch.expiryDate).toLocaleDateString("vi-VN")}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getBatchStatusBadge(batch)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-6 py-3">Thời gian</th>
                <th className="px-6 py-3">Sản phẩm</th>
                <th className="px-6 py-3">Giao dịch</th>
                <th className="px-6 py-3">Loại</th>
                <th className="px-6 py-3">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    Chưa có nhật ký xuất nhập kho nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">
                      {new Date(tx.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{tx.productName}</p>
                      {tx.batchNumber && (
                        <p className="font-mono text-xs text-slate-400">Lô: {tx.batchNumber}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono font-bold">
                      <span className={tx.quantity > 0 ? "text-emerald-600" : "text-rose-600"}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {tx.type === "IMPORT" && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          <ArrowDownLeft className="size-3" /> Nhập kho
                        </span>
                      )}
                      {tx.type === "EXPORT_SALE" && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          <ArrowUpRight className="size-3" /> Bán hàng
                        </span>
                      )}
                      {tx.type === "EXPORT_EXPIRED" && (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800">
                          <TrendingDown className="size-3" /> Hủy hết date
                        </span>
                      )}
                      {tx.type === "EXPORT_DAMAGE" && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <AlertTriangle className="size-3" /> Hao hụt/Hỏng
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {tx.note || "---"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <Store className="size-5 text-emerald-600" />
              Nhập kho Lô hàng nông sản mới
            </h3>
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sản phẩm *
                </label>
                <select
                  name="productId"
                  value={form.productId}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Mã Lô Hàng *
                </label>
                <input
                  type="text"
                  name="batchNumber"
                  placeholder="Ví dụ: BATCH-RAU-2026-07"
                  value={form.batchNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Giá nhập (VND) *
                  </label>
                  <input
                    type="number"
                    name="importPrice"
                    placeholder="Ví dụ: 12000"
                    value={form.importPrice}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Số lượng nhập *
                  </label>
                  <input
                    type="number"
                    name="originalQuantity"
                    placeholder="Ví dụ: 100"
                    value={form.originalQuantity}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Ngày sản xuất
                  </label>
                  <input
                    type="date"
                    name="manufactureDate"
                    value={form.manufactureDate}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Hạn sử dụng *
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={form.expiryDate}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  Nhập kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
