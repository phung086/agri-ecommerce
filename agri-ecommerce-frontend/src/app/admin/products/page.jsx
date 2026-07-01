"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ImageIcon,
  ImagePlus,
  Loader2,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
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
import { Textarea } from "@/components/ui/textarea";
import {
  formatCurrency,
  formatNumber,
  getApiErrorMessage,
  getImageBackground,
  slugify,
} from "@/lib/admin-utils";
import { useLanguage } from "@/i18n/language-provider";
import { localizeCategory, localizeProduct } from "@/i18n/localized-fields";
import { adminService } from "@/services/admin.service";

const PRODUCT_FETCH_PARAMS = {
  page: 0,
  size: 100,
  sort: "createdAt,desc",
};

const PRODUCT_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "in_stock", label: "Còn hàng" },
  { value: "out_of_stock", label: "Hết hàng" },
  { value: "hidden", label: "Đang ẩn" },
];

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
  images: "",
};

function readPageContent(response) {
  if (Array.isArray(response?.content)) {
    return response.content;
  }

  return Array.isArray(response) ? response : [];
}

function buildImages(value, thumbnail) {
  const images = value
    .split("\n")
    .map((image) => image.trim())
    .filter(Boolean);

  if (thumbnail && !images.includes(thumbnail)) {
    return [thumbnail, ...images];
  }

  return images;
}

function buildProductPayload(form) {
  const thumbnail = form.thumbnail.trim() || null;

  return {
    name: form.name.trim(),
    slug: (form.slug || slugify(form.name)).trim(),
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    description: form.description.trim() || null,
    price: Number(form.price || 0),
    stock: Number(form.stock || 0),
    status: form.status || "in_stock",
    unit: form.unit.trim() || null,
    thumbnail,
    images: buildImages(form.images, thumbnail),
  };
}

export default function AdminProductsPage() {
  const { locale } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(blankProductForm);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      setLoading(true);
      setError("");

      const [productsResult, categoriesResult] = await Promise.allSettled([
        adminService.getProducts(PRODUCT_FETCH_PARAMS),
        adminService.getCategories(),
      ]);

      if (!mounted) {
        return;
      }

      if (productsResult.status === "fulfilled") {
        setProducts(readPageContent(productsResult.value));
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
        [
          product.name,
          product.nameEn,
          product.slug,
          product.description,
          product.descriptionEn,
          product.categoryName,
          product.categoryNameEn,
        ]
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

  const productStats = useMemo(() => {
    const visibleProducts = products.filter(
      (product) => product.status !== "hidden"
    );
    const lowStock = products.filter(
      (product) => Number(product.stock || 0) <= 20
    ).length;
    const withImage = products.filter((product) => product.thumbnail).length;
    const totalStock = products.reduce(
      (total, product) => total + Number(product.stock || 0),
      0
    );

    return { visibleProducts, lowStock, withImage, totalStock };
  }, [products]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "name" && !editingProduct ? { slug: slugify(value) } : {}),
    }));
  }

  async function handleThumbnailFile(file) {
    if (!file) {
      return;
    }

    setUploadingImage(true);
    setError("");
    setNotice("");

    try {
      const uploadedImage = await adminService.uploadImage(file, "product");
      updateForm("thumbnail", uploadedImage.path);
      setNotice("Đã tải ảnh sản phẩm lên server.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploadingImage(false);
    }
  }

  async function refreshProducts() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        adminService.getProducts(PRODUCT_FETCH_PARAMS),
        adminService.getCategories(),
      ]);

      setProducts(readPageContent(productsResponse));
      setCategories(Array.isArray(categoriesResponse) ? categoriesResponse : []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingProduct(null);
    setForm({
      ...blankProductForm,
      categoryId: categories[0]?.id ? String(categories[0].id) : "",
    });
    setError("");
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
      images: (product.images || []).join("\n"),
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
      const payload = buildProductPayload(form);
      const savedProduct = editingProduct
        ? await adminService.updateProduct(editingProduct.id, payload)
        : await adminService.createProduct(payload);

      setProducts((current) => {
        if (editingProduct) {
          return current.map((product) =>
            product.id === savedProduct.id ? savedProduct : product
          );
        }

        return [savedProduct, ...current];
      });
      setDialogOpen(false);
      setNotice(
        editingProduct
          ? `Đã cập nhật sản phẩm "${savedProduct.name}".`
          : `Đã tạo sản phẩm "${savedProduct.name}".`
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(product) {
    const confirmed = window.confirm(
      `Ẩn sản phẩm "${product.name}" khỏi public API?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(String(product.id));
    setError("");
    setNotice("");

    try {
      const updatedProduct = await adminService.deleteProduct(product.id);
      setProducts((current) =>
        current.map((item) =>
          item.id === updatedProduct.id ? updatedProduct : item
        )
      );
      setNotice(`Đã ẩn sản phẩm "${updatedProduct.name}".`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Quản lí sản phẩm"
        description="Tạo, cập nhật và ẩn sản phẩm bằng API quản trị thật. Các thay đổi được lưu trực tiếp vào database."
        image="/admin-assets/products.svg"
        badges={["Admin API", "CRUD thật", "Upload ảnh"]}
      >
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Thêm sản phẩm
        </Button>
      </AdminPageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Sản phẩm đang bán"
          value={formatNumber(productStats.visibleProducts.length)}
          description="Không tính sản phẩm đã ẩn"
          icon={PackageCheck}
          tone="green"
        />
        <StatCard
          title="Tổng tồn kho"
          value={formatNumber(productStats.totalStock)}
          description="Cộng tồn kho từ admin API"
          icon={Boxes}
          tone="blue"
        />
        <StatCard
          title="Sắp hết hàng"
          value={formatNumber(productStats.lowStock)}
          description="Tồn kho từ 20 trở xuống"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          title="Có ảnh"
          value={formatNumber(productStats.withImage)}
          description="Có thumbnail lưu trong DB"
          icon={ImagePlus}
          tone="rose"
        />
      </section>

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
              {(localizeCategory(category, locale) || category).name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          {PRODUCT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="outline"
          onClick={refreshProducts}
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
          "Sản phẩm",
          "Danh mục",
          "Giá",
          "Kho",
          "Trạng thái",
          "Thao tác",
        ]}
        data={filteredProducts}
        loading={loading}
        error={loading || products.length === 0 ? error : ""}
        emptyText="Không tìm thấy sản phẩm"
        renderRow={(product) => {
          const displayProduct = localizeProduct(product, locale) || product;

          return (
          <TableRow key={product.id}>
            <TableCell className="px-4">
              <div className="flex items-center gap-3">
                {product.thumbnail ? (
                  <div
                    className="size-12 rounded-lg bg-cover bg-center ring-1 ring-border"
                    role="img"
                    aria-label={displayProduct.name}
                    style={{
                      backgroundImage: getImageBackground(product.thumbnail),
                    }}
                  />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <ImageIcon className="size-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{displayProduct.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {product.slug}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4">
              {displayProduct.categoryName || "N/A"}
            </TableCell>
            <TableCell className="px-4 font-medium">
              {formatCurrency(product.price)}
            </TableCell>
            <TableCell className="px-4">
              {formatNumber(product.stock)} {displayProduct.unit || ""}
            </TableCell>
            <TableCell className="px-4">
              <StatusBadge status={product.status} />
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
                  title="Ẩn sản phẩm"
                  aria-label="Ẩn sản phẩm"
                  disabled={deletingId === String(product.id)}
                  onClick={() => handleRemove(product)}
                >
                  {deletingId === String(product.id) ? (
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
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}
              </DialogTitle>
              <DialogDescription>
                Thao tác này gọi API admin, lưu trực tiếp vào database và hỗ trợ tải ảnh lên server.
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
                      {(localizeCategory(category, locale) || category).name}
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
                  {PRODUCT_STATUS_OPTIONS.filter(
                    (option) => option.value !== "all"
                  ).map((option) => (
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
                  min="1"
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
                <Input
                  id="product-thumbnail-file"
                  type="file"
                  accept="image/*"
                  disabled={uploadingImage}
                  onChange={(event) =>
                    handleThumbnailFile(event.target.files?.[0] || null)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Chọn ảnh từ máy để tải lên server và tự điền đường dẫn.
                </p>
                {uploadingImage && (
                  <p className="text-xs font-medium text-emerald-700">
                    Đang tải ảnh lên server...
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
              <div className="space-y-2">
                <Label htmlFor="product-images">
                  Ảnh bổ sung, mỗi dòng một đường dẫn
                </Label>
                <Textarea
                  id="product-images"
                  value={form.images}
                  onChange={(event) => updateForm("images", event.target.value)}
                  rows={4}
                  placeholder="uploads/products/example-1.jpg"
                />
              </div>
              <div
                className="h-32 rounded-lg border bg-muted bg-cover bg-center"
                role="img"
                aria-label="Ảnh sản phẩm đang chọn"
                style={{
                  backgroundImage: form.thumbnail
                    ? getImageBackground(form.thumbnail)
                    : "none",
                }}
              />
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
                disabled={saving || uploadingImage}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={saving || uploadingImage}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving
                  ? "Đang lưu..."
                  : uploadingImage
                    ? "Đang tải ảnh..."
                    : editingProduct
                      ? "Lưu thay đổi"
                      : "Tạo sản phẩm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
