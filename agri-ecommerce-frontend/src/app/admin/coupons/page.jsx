"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { DataTable } from "@/components/admin/data-table";
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
import { couponStatusOptions, mockCoupons } from "@/lib/admin-mock-data";
import { formatDate, formatNumber } from "@/lib/admin-utils";

const blankCouponForm = {
  code: "",
  discountPercentage: "",
  expiresAt: "",
  usageLimit: "",
  timesUsed: "0",
  isActive: true,
};

function toDateInput(value) {
  if (!value) {
    return "";
  }

  return value.replace(" ", "T").slice(0, 16);
}

function getCouponStatus(coupon) {
  const expiresAt = coupon.expiresAt
    ? new Date(coupon.expiresAt.replace(" ", "T"))
    : null;

  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return "expired";
  }

  return coupon.isActive ? "active" : "inactive";
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState(mockCoupons);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(blankCouponForm);
  const [notice, setNotice] = useState("");

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

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateDialog() {
    setEditingCoupon(null);
    setForm(blankCouponForm);
    setDialogOpen(true);
  }

  function openEditDialog(coupon) {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code || "",
      discountPercentage: String(coupon.discountPercentage ?? ""),
      expiresAt: toDateInput(coupon.expiresAt),
      usageLimit: String(coupon.usageLimit ?? ""),
      timesUsed: String(coupon.timesUsed ?? 0),
      isActive: Boolean(coupon.isActive),
    });
    setDialogOpen(true);
  }

  function buildPayload() {
    return {
      code: form.code.trim().toUpperCase(),
      discountPercentage: Number(form.discountPercentage || 0),
      expiresAt: form.expiresAt ? form.expiresAt.replace("T", " ") : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      timesUsed: Number(form.timesUsed || 0),
      isActive: Boolean(form.isActive),
    };
  }

  function handleSave(event) {
    event.preventDefault();
    const payload = buildPayload();

    if (editingCoupon) {
      setCoupons((current) =>
        current.map((coupon) =>
          coupon.id === editingCoupon.id ? { ...coupon, ...payload } : coupon
        )
      );
      setNotice("Đã cập nhật mã giảm giá trong phiên demo.");
    } else {
      setCoupons((current) => [
        {
          ...payload,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          demo: true,
        },
        ...current,
      ]);
      setNotice("Đã thêm mã giảm giá trong phiên demo.");
    }

    setDialogOpen(false);
  }

  function toggleCoupon(couponId) {
    setCoupons((current) =>
      current.map((coupon) =>
        coupon.id === couponId
          ? { ...coupon, isActive: !coupon.isActive }
          : coupon
      )
    );
    setNotice("Đã đổi trạng thái mã giảm giá trong phiên demo.");
  }

  function removeCoupon(couponId) {
    const confirmed = window.confirm("Xóa mã giảm giá khỏi phiên demo?");

    if (!confirmed) {
      return;
    }

    setCoupons((current) => current.filter((coupon) => coupon.id !== couponId));
    setNotice("Đã xóa mã giảm giá trong phiên demo.");
  }

  return (
    <div className="space-y-4">
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
          {couponStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Button type="button" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Thêm mã
        </Button>
      </div>

      {notice && (
        <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          {notice}
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
        emptyText="Không tìm thấy mã giảm giá"
        renderRow={(coupon) => {
          const status = getCouponStatus(coupon);
          const usageLimit = coupon.usageLimit ?? "Không giới hạn";

          return (
            <TableRow key={coupon.id}>
              <TableCell className="px-4">
                <div>
                  <p className="font-semibold tracking-normal">{coupon.code}</p>
                  <p className="text-xs text-muted-foreground">
                    ID #{coupon.id} {coupon.demo ? "· Demo" : ""}
                  </p>
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
                    onClick={() => toggleCoupon(coupon.id)}
                  >
                    {coupon.isActive ? "Tắt" : "Bật"}
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
                    title="Xóa mã"
                    aria-label="Xóa mã"
                    onClick={() => removeCoupon(coupon.id)}
                  >
                    <Trash2 className="size-4" />
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
                Thao tác này chỉ lưu trong giao diện demo.
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
                  min="0"
                  value={form.usageLimit}
                  onChange={(event) =>
                    updateForm("usageLimit", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-used">Đã dùng</Label>
                <Input
                  id="coupon-used"
                  type="number"
                  min="0"
                  value={form.timesUsed}
                  onChange={(event) =>
                    updateForm("timesUsed", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-active">Trạng thái</Label>
                <select
                  id="coupon-active"
                  value={form.isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    updateForm("isActive", event.target.value === "active")
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
                onClick={() => setDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit">Lưu demo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
