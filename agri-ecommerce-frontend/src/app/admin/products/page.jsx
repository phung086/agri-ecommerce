"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { adminService } from "@/services/admin.service";
import {
  formatCurrency,
  formatNumber,
  getApiErrorMessage,
  getAssetUrl,
  slugify,
} from "@/lib/admin-utils";
import { productStatusOptions } from "@/lib/admin-mock-data";

const blankProductForm = {
  name: "",
  slug: "",
  categoryId: "",
  description: "",
  price: "",
  stock: "",
  status: "in_stock",
  unit: "",
  thumbnail: "",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(blankProductForm);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      setLoading(true);
      setError("");

      const [productsResult, categoriesResult] = await Promise.allSettled([
        adminService.getProducts({ page: 0, size: 100, sort: "createdAt,desc" }),
        adminService.getCategories(),
      ]);

      if (!mounted) {
        return;
      }

      if (productsResult.status === "fulfilled") {
        setProducts(productsResult.value?.content || []);
      } else {
        setProducts([]);
        setError(getApiErrorMessage(productsResult.reason));
      }

      if (categoriesResult.status === "fulfilled") {
        setCategories(
          Array.isArray(categoriesResult.value) ? categoriesResult.value : []
        );
      } else {
        setCategories([]);
      }

      setLoading(false);
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesKeyword =
        !keyword ||
        [product.name, product.slug, product.description, product.categoryName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesCategory =
        categoryFilter === "all" ||
        String(product.categoryId) === String(categoryFilter);
      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;

      return matchesKeyword && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "name" && !editingProduct ? { slug: slugify(value) } : {}),
    }));
  }

  function openCreateDialog() {
    setEditingProduct(null);
    setForm({
      ...blankProductForm,
      categoryId: categories[0]?.id ? String(categories[0].id) : "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(product) {
    setEditingProduct(product);
    setForm({
      name: product.name || "",
      slug: product.slug || "",
      categoryId: product.categoryId ? String(product.categoryId) : "",
      description: product.description || "",
      price: product.price ?? "",
      stock: product.stock ?? "",
      status: product.status || "in_stock",
      unit: product.unit || "",
      thumbnail: product.thumbnail || "",
    });
    setDialogOpen(true);
  }

  function buildProductPayload() {
    const category = categories.find(
      (item) => String(item.id) === String(form.categoryId)
    );

    return {
      ...form,
      slug: form.slug || slugify(form.name),
      categoryId: category?.id || form.categoryId,
      categoryName: category?.name || "Chưa phân loại",
      categorySlug: category?.slug || "",
      price: Number(form.price || 0),
      stock: Number(form.stock || 0),
      thumbnail: form.thumbnail,
    };
  }

  function handleSave(event) {
    event.preventDefault();

    const payload = buildProductPayload();

    if (editingProduct) {
      setProducts((current) =>
        current.map((product) =>
          product.id === editingProduct.id ? { ...product, ...payload } : product
        )
      );
      setNotice("Đã cập nhật sản phẩm trong phiên demo.");
    } else {
      setProducts((current) => [
        {
          ...payload,
          id: Date.now(),
          demo: true,
          images: payload.thumbnail ? [payload.thumbnail] : [],
        },
        ...current,
      ]);
      setNotice("Đã thêm sản phẩm trong phiên demo.");
    }

    setDialogOpen(false);
  }

  function handleRemove(productId) {
    const confirmed = window.confirm("Xóa sản phẩm khỏi phiên demo?");

    if (!confirmed) {
      return;
    }

    setProducts((current) => current.filter((product) => product.id !== productId));
    setNotice("Đã xóa sản phẩm trong phiên demo.");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm sản phẩm theo tên, slug, mô tả"
            className="pl-9"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          <option value="all">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          {productStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Button type="button" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Thêm sản phẩm
        </Button>
      </div>

      {notice && (
        <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          {notice}
        </div>
      )}

      <DataTable
        columns={["Sản phẩm", "Danh mục", "Giá", "Kho", "Trạng thái", "Thao tác"]}
        data={filteredProducts}
        loading={loading}
        error={error}
        emptyText="Không tìm thấy sản phẩm"
        renderRow={(product) => (
          <TableRow key={product.id}>
            <TableCell className="px-4">
              <div className="flex items-center gap-3">
                {product.thumbnail ? (
                  <div
                    className="size-12 rounded-lg bg-cover bg-center ring-1 ring-border"
                    role="img"
                    aria-label={product.name}
                    style={{
                      backgroundImage: `url("${getAssetUrl(product.thumbnail)}")`,
                    }}
                  />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <ImageIcon className="size-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {product.slug}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4">{product.categoryName || "N/A"}</TableCell>
            <TableCell className="px-4 font-medium">
              {formatCurrency(product.price)}
            </TableCell>
            <TableCell className="px-4">
              {formatNumber(product.stock)} {product.unit || ""}
            </TableCell>
            <TableCell className="px-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={product.status} />
                {product.demo && (
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    Demo
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="px-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  title="Sửa sản phẩm"
                  aria-label="Sửa sản phẩm"
                  onClick={() => openEditDialog(product)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  title="Xóa sản phẩm demo"
                  aria-label="Xóa sản phẩm demo"
                  onClick={() => handleRemove(product.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}
              </DialogTitle>
              <DialogDescription>
                Thao tác này chỉ lưu trong giao diện demo.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-name">Tên sản phẩm</Label>
                <Input
                  id="product-name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-slug">Slug</Label>
                <Input
                  id="product-slug"
                  value={form.slug}
                  onChange={(event) => updateForm("slug", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-category">Danh mục</Label>
                <select
                  id="product-category"
                  value={form.categoryId}
                  onChange={(event) =>
                    updateForm("categoryId", event.target.value)
                  }
                  className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                  required
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-status">Trạng thái</Label>
                <select
                  id="product-status"
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                >
                  {productStatusOptions
                    .filter((option) => option.value !== "all")
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-price">Giá</Label>
                <Input
                  id="product-price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(event) => updateForm("price", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-stock">Tồn kho</Label>
                <Input
                  id="product-stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(event) => updateForm("stock", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-unit">Đơn vị</Label>
                <Input
                  id="product-unit"
                  value={form.unit}
                  onChange={(event) => updateForm("unit", event.target.value)}
                  placeholder="kg, túi, hộp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-thumbnail">Ảnh đại diện</Label>
                <Input
                  id="product-thumbnail"
                  value={form.thumbnail}
                  onChange={(event) =>
                    updateForm("thumbnail", event.target.value)
                  }
                  placeholder="uploads/products/example.jpg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description">Mô tả</Label>
              <Textarea
                id="product-description"
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                rows={4}
              />
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
