"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ImageIcon,
  ImagePlus,
  PackageCheck,
  Pencil,
  Plus,
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
import { adminService } from "@/services/admin.service";
import {
  formatCurrency,
  formatNumber,
  getApiErrorMessage,
  getImageBackground,
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
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const productStats = useMemo(() => {
    const lowStock = products.filter((product) => Number(product.stock || 0) <= 20)
      .length;
    const withImage = products.filter((product) => product.thumbnail).length;
    const totalStock = products.reduce(
      (total, product) => total + Number(product.stock || 0),
      0
    );

    return { lowStock, withImage, totalStock };
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
    const thumbnail = form.thumbnail.trim();

    return {
      name: form.name.trim(),
      slug: form.slug || slugify(form.name),
      categoryId: Number(form.categoryId),
      description: form.description,
      price: Number(form.price || 0),
      stock: Number(form.stock || 0),
      status: form.status,
      unit: form.unit,
      thumbnail,
      images: thumbnail ? [thumbnail] : [],
    };
  }

  async function handleSaveToApi(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = buildProductPayload();

      if (editingProduct) {
        const savedProduct = await adminService.updateProduct(
          editingProduct.id,
          payload
        );

        setProducts((current) =>
          current.map((product) =>
            product.id === editingProduct.id ? savedProduct : product
          )
        );
        setNotice("Đã cập nhật sản phẩm vào database.");
      } else {
        const savedProduct = await adminService.createProduct(payload);
        setProducts((current) => [savedProduct, ...current]);
        setNotice("Đã thêm sản phẩm vào database.");
      }

      setDialogOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFromApi(productId) {
    const confirmed = window.confirm("Xóa sản phẩm khỏi database?");

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await adminService.deleteProduct(productId);
      setProducts((current) =>
        current.filter((product) => product.id !== productId)
      );
      setNotice("Đã xóa sản phẩm khỏi database.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Quản lí sản phẩm"
        description="Theo dõi danh sách sản phẩm, giá bán, tồn kho, trạng thái bán và hình ảnh đại diện cho từng mặt hàng."
        image="/admin-assets/products.svg"
        badges={["Database API", "CRUD thật", "Đường dẫn ảnh"]}
      >
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Thêm sản phẩm
        </Button>
      </AdminPageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng sản phẩm"
          value={formatNumber(products.length)}
          description="Đang hiển thị trong admin"
          icon={PackageCheck}
          tone="green"
        />
        <StatCard
          title="Tổng tồn kho"
          value={formatNumber(productStats.totalStock)}
          description="Cộng tồn kho từ danh sách"
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
          description="Ảnh API hoặc ảnh chọn từ máy"
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
                      backgroundImage: getImageBackground(product.thumbnail),
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
                  title="Xóa sản phẩm"
                  aria-label="Xóa sản phẩm"
                  onClick={() => handleRemoveFromApi(product.id)}
                  disabled={saving}
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
          <form onSubmit={handleSaveToApi} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}
              </DialogTitle>
              <DialogDescription>
                Dữ liệu sẽ lưu vào database và xuất hiện trên trang khách hàng khi sản phẩm còn hàng.
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

            <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
              <div className="space-y-2">
                <Label htmlFor="product-thumbnail-file">
                  Chọn ảnh từ máy tính
                </Label>
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
                {saving
                  ? "Đang lưu..."
                  : uploadingImage
                    ? "Đang tải ảnh..."
                    : "Lưu vào database"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
