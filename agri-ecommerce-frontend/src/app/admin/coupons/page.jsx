"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Loader2,
  Percent,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  TicketPercent,
  Trash2,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber, getApiErrorMessage } from "@/lib/admin-utils";
import { adminService } from "@/services/admin.service";

const COUPON_FETCH_PARAMS = {
  page: 0,
  size: 100,
  sort: "createdAt,desc",
};

const COUPON_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả mã" },
  { value: "active", label: "Đang bật" },
  { value: "inactive", label: "Đã tắt" },
  { value: "expired", label: "Hết hạn" },
  { value: "exhausted", label: "Hết lượt" },
];

const blankCouponForm = {
  code: "",
  discountPercentage: "",
  expiresAt: "",
  usageLimit: "",
  active: true,
};

function readPageContent(response) {
  if (Array.isArray(response?.content)) {
    return response.content;
  }

  return Array.isArray(response) ? response : [];
}

function toDateInput(value) {
  if (!value) {
    return "";
  }

  return String(value).replace(" ", "T").slice(0, 16);
}

function toApiDateTime(value) {
  if (!value) {
    return null;
  }

  return value.length === 16 ? `${value}:00` : value;
}

function getCouponStatus(coupon) {
  if (coupon.expired) {
    return "expired";
  }

  if (coupon.usageExhausted) {
    return "exhausted";
  }

  return coupon.active ? "active" : "inactive";
}

function buildCouponPayload(form) {
  return {
    code: form.code.trim().toUpperCase(),
    discountPercentage: Number(form.discountPercentage || 0),
    expiresAt: toApiDateTime(form.expiresAt),
    usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
    active: Boolean(form.active),
  };
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(blankCouponForm);

  useEffect(() => {
    let mounted = true;

    async function loadCoupons() {
      setLoading(true);
      setError("");

      try {
        const response = await adminService.getCoupons(COUPON_FETCH_PARAMS);

        if (mounted) {
          setCoupons(readPageContent(response));
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCoupons();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCoupons = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const status = getCouponStatus(coupon);
      const matchesKeyword =
        !keyword || coupon.code.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [coupons, searchTerm, statusFilter]);

  const couponStats = useMemo(() => {
    const active = coupons.filter((coupon) => getCouponStatus(coupon) === "active")
      .length;
    const expired = coupons.filter((coupon) => getCouponStatus(coupon) === "expired")
      .length;
    const used = coupons.reduce(
      (total, coupon) => total + Number(coupon.timesUsed || 0),
      0
    );

    return { active, expired, used };
  }, [coupons]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateCouponInState(updatedCoupon) {
    setCoupons((current) =>
      current.map((coupon) =>
        coupon.id === updatedCoupon.id ? updatedCoupon : coupon
      )
    );
  }

  async function refreshCoupons() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await adminService.getCoupons(COUPON_FETCH_PARAMS);
      setCoupons(readPageContent(response));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingCoupon(null);
    setForm(blankCouponForm);
    setError("");
    setDialogOpen(true);
  }

  function openEditDialog(coupon) {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code || "",
      discountPercentage: String(coupon.discountPercentage ?? ""),
      expiresAt: toDateInput(coupon.expiresAt),
      usageLimit: String(coupon.usageLimit ?? ""),
      active: Boolean(coupon.active),
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = buildCouponPayload(form);
      const savedCoupon = editingCoupon
        ? await adminService.updateCoupon(editingCoupon.id, payload)
        : await adminService.createCoupon(payload);

      if (editingCoupon) {
        updateCouponInState(savedCoupon);
      } else {
        setCoupons((current) => [savedCoupon, ...current]);
      }

      setDialogOpen(false);
      setNotice(
        editingCoupon
          ? `Đã cập nhật mã ${savedCoupon.code}.`
          : `Đã tạo mã ${savedCoupon.code}.`
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(coupon) {
    setActionLoading(`toggle:${coupon.id}`);
    setError("");
    setNotice("");

    try {
      const updatedCoupon = await adminService.updateCouponStatus(coupon.id, {
        active: !coupon.active,
      });
      updateCouponInState(updatedCoupon);
      setNotice(
        `Đã ${updatedCoupon.active ? "bật" : "tắt"} mã ${updatedCoupon.code}.`
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading("");
    }
  }

  async function deactivateCoupon(coupon) {
    const confirmed = window.confirm(`Vô hiệu hóa mã ${coupon.code}?`);

    if (!confirmed) {
      return;
    }

    setActionLoading(`delete:${coupon.id}`);
    setError("");
    setNotice("");

    try {
      const updatedCoupon = await adminService.deleteCoupon(coupon.id);
      updateCouponInState(updatedCoupon);
      setNotice(`Đã vô hiệu hóa mã ${updatedCoupon.code}.`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading("");
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Quản lí mã giảm giá"
        description="Tạo, cập nhật, bật tắt và vô hiệu hóa mã giảm giá bằng API quản trị thật."
        image="/admin-assets/coupons.svg"
        badges={["Admin API", "CRUD thật", "Coupon checkout"]}
      >
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Thêm mã
        </Button>
      </AdminPageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng mã"
          value={coupons.length}
          description="Đọc từ admin API"
          icon={TicketPercent}
          tone="green"
        />
        <StatCard
          title="Đang bật"
          value={couponStats.active}
          description="Còn hiệu lực sử dụng"
          icon={Percent}
          tone="blue"
        />
        <StatCard
          title="Hết hạn"
          value={couponStats.expired}
          description="Cần gia hạn hoặc tắt"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          title="Lượt đã dùng"
          value={formatNumber(couponStats.used)}
          description="Tổng lượt sử dụng"
          icon={TicketPercent}
          tone="rose"
        />
      </section>

      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm mã giảm giá"
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          {COUPON_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="outline"
          onClick={refreshCoupons}
          disabled={loading}
          className="font-bold"
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          Làm mới
        </Button>
      </div>

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

      <DataTable
        columns={[
          "Mã",
          "Giảm",
          "Lượt dùng",
          "Hạn dùng",
          "Trạng thái",
          "Thao tác",
        ]}
        data={filteredCoupons}
        loading={loading}
        error={loading || coupons.length === 0 ? error : ""}
        emptyText="Không tìm thấy mã giảm giá"
        renderRow={(coupon) => {
          const status = getCouponStatus(coupon);
          const usageLimit = coupon.usageLimit ?? "Không giới hạn";

          return (
            <TableRow key={coupon.id}>
              <TableCell className="px-4">
                <div>
                  <p className="font-semibold tracking-normal">{coupon.code}</p>
                  <p className="text-xs text-muted-foreground">ID #{coupon.id}</p>
                </div>
              </TableCell>
              <TableCell className="px-4 font-medium">
                {formatNumber(coupon.discountPercentage)}%
              </TableCell>
              <TableCell className="px-4">
                {formatNumber(coupon.timesUsed)} /{" "}
                {typeof usageLimit === "number"
                  ? formatNumber(usageLimit)
                  : usageLimit}
              </TableCell>
              <TableCell className="px-4">{formatDate(coupon.expiresAt)}</TableCell>
              <TableCell className="px-4">
                <StatusBadge status={status} />
              </TableCell>
              <TableCell className="px-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={Boolean(actionLoading)}
                    onClick={() => toggleCoupon(coupon)}
                  >
                    {actionLoading === `toggle:${coupon.id}` && (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    {coupon.active ? "Tắt" : "Bật"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    title="Sửa mã"
                    aria-label="Sửa mã"
                    onClick={() => openEditDialog(coupon)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    title="Vô hiệu hóa mã"
                    aria-label="Vô hiệu hóa mã"
                    disabled={Boolean(actionLoading)}
                    onClick={() => deactivateCoupon(coupon)}
                  >
                    {actionLoading === `delete:${coupon.id}` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}
              </DialogTitle>
              <DialogDescription>
                Thao tác này gọi API admin và lưu trực tiếp vào database.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Mã giảm giá</Label>
                <Input
                  id="coupon-code"
                  value={form.code}
                  onChange={(event) => updateForm("code", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-discount">Phần trăm giảm</Label>
                <Input
                  id="coupon-discount"
                  type="number"
                  min="1"
                  max="100"
                  value={form.discountPercentage}
                  onChange={(event) =>
                    updateForm("discountPercentage", event.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-expires">Hạn dùng</Label>
                <Input
                  id="coupon-expires"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) =>
                    updateForm("expiresAt", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-limit">Giới hạn lượt dùng</Label>
                <Input
                  id="coupon-limit"
                  type="number"
                  min="1"
                  value={form.usageLimit}
                  onChange={(event) =>
                    updateForm("usageLimit", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-active">Trạng thái</Label>
                <select
                  id="coupon-active"
                  value={form.active ? "active" : "inactive"}
                  onChange={(event) =>
                    updateForm("active", event.target.value === "active")
                  }
                  className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                >
                  <option value="active">Đang bật</option>
                  <option value="inactive">Đã tắt</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editingCoupon ? "Lưu thay đổi" : "Tạo mã"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
