"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FolderTree,
  Globe2,
  ImageIcon,
  ImagePlus,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
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
  getApiErrorMessage,
  getImageBackground,
  slugify,
} from "@/lib/admin-utils";
import { useLanguage } from "@/i18n/language-provider";
import { localizeCategory } from "@/i18n/localized-fields";
import { adminService } from "@/services/admin.service";
import { marketplaceService } from "@/services/marketplace.service";

const blankCategoryForm = {
  name: "",
  slug: "",
  description: "",
  image: "",
};

function buildCategoryPayload(form) {
  return {
    name: form.name.trim(),
    slug: (form.slug || slugify(form.name)).trim(),
    description: form.description.trim() || null,
    image: form.image.trim() || null,
  };
}

export default function AdminCategoriesPage() {
  const { locale } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [publicCategories, setPublicCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [publicCategoryError, setPublicCategoryError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(blankCategoryForm);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      setLoading(true);
      setError("");
      setPublicCategoryError("");

      const [adminResult, publicResult] = await Promise.allSettled([
        adminService.getCategories(),
        marketplaceService.getCategories(),
      ]);

      if (!mounted) {
        return;
      }

      if (adminResult.status === "fulfilled") {
        setCategories(Array.isArray(adminResult.value) ? adminResult.value : []);
      } else {
        setCategories([]);
        setError(getApiErrorMessage(adminResult.reason));
      }

      if (publicResult.status === "fulfilled") {
        setPublicCategories(
          Array.isArray(publicResult.value) ? publicResult.value : []
        );
      } else {
        setPublicCategories([]);
        setPublicCategoryError(getApiErrorMessage(publicResult.reason));
      }

      setLoading(false);
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return categories.filter((category) => {
      if (!keyword) {
        return true;
      }

      return [category.name, category.nameEn, category.slug, category.description, category.descriptionEn]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [categories, searchTerm]);

  const publicCategoryKeys = useMemo(() => {
    const keys = new Set();

    publicCategories.forEach((category) => {
      if (category.id !== undefined && category.id !== null) {
        keys.add(`id:${category.id}`);
      }

      if (category.slug) {
        keys.add(`slug:${category.slug}`);
      }
    });

    return keys;
  }, [publicCategories]);

  const categoryStats = useMemo(() => {
    const withImage = categories.filter((category) => category.image).length;
    const withoutImage = categories.length - withImage;
    const notOnWeb =
      publicCategoryError || publicCategories.length === 0
        ? 0
        : categories.filter(
            (category) =>
              !publicCategoryKeys.has(`id:${category.id}`) &&
              !publicCategoryKeys.has(`slug:${category.slug}`)
          ).length;

    return { withImage, withoutImage, notOnWeb };
  }, [categories, publicCategories.length, publicCategoryError, publicCategoryKeys]);

  function isCategoryOnWeb(category) {
    return (
      publicCategoryKeys.has(`id:${category.id}`) ||
      publicCategoryKeys.has(`slug:${category.slug}`)
    );
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "name" && !editingCategory
        ? { slug: slugify(value) }
        : {}),
    }));
  }

  async function handleImageFile(file) {
    if (!file) {
      return;
    }

    setUploadingImage(true);
    setError("");
    setNotice("");

    try {
      const uploadedImage = await adminService.uploadImage(file, "category");
      updateForm("image", uploadedImage?.path || uploadedImage?.url || "");
      setNotice("Đã tải ảnh danh mục lên server.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploadingImage(false);
    }
  }

  async function refreshCategories() {
    setLoading(true);
    setError("");
    setPublicCategoryError("");
    setNotice("");

    const [adminResult, publicResult] = await Promise.allSettled([
      adminService.getCategories(),
      marketplaceService.getCategories(),
    ]);

    if (adminResult.status === "fulfilled") {
      setCategories(Array.isArray(adminResult.value) ? adminResult.value : []);
    } else {
      setCategories([]);
      setError(getApiErrorMessage(adminResult.reason));
    }

    if (publicResult.status === "fulfilled") {
      setPublicCategories(
        Array.isArray(publicResult.value) ? publicResult.value : []
      );
    } else {
      setPublicCategories([]);
      setPublicCategoryError(getApiErrorMessage(publicResult.reason));
    }

    setLoading(false);
  }

  function openCreateDialog() {
    setEditingCategory(null);
    setForm(blankCategoryForm);
    setError("");
    setDialogOpen(true);
  }

  function openEditDialog(category) {
    setEditingCategory(category);
    setForm({
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
      image: category.image || "",
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
      const payload = buildCategoryPayload(form);
      const savedCategory = editingCategory
        ? await adminService.updateCategory(editingCategory.id, payload)
        : await adminService.createCategory(payload);

      setCategories((current) => {
        if (editingCategory) {
          return current.map((category) =>
            category.id === savedCategory.id ? savedCategory : category
          );
        }

        return [savedCategory, ...current];
      });
      setPublicCategories((current) => {
        if (editingCategory) {
          return current.map((category) =>
            category.id === savedCategory.id ? savedCategory : category
          );
        }

        return [savedCategory, ...current];
      });
      setDialogOpen(false);
      setNotice(
        editingCategory
          ? `Đã cập nhật danh mục "${savedCategory.name}".`
          : `Đã tạo danh mục "${savedCategory.name}".`
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(category) {
    const confirmed = window.confirm(
      `Xóa danh mục "${category.name}" khỏi database?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(String(category.id));
    setError("");
    setNotice("");

    try {
      await adminService.deleteCategory(category.id);
      setCategories((current) =>
        current.filter((item) => item.id !== category.id)
      );
      setPublicCategories((current) =>
        current.filter((item) => item.id !== category.id)
      );
      setNotice(`Đã xóa danh mục "${category.name}".`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Quản lí danh mục"
        description="Tạo, cập nhật và xóa danh mục bằng API quản trị thật. Dữ liệu lưu trực tiếp vào database."
        image="/admin-assets/categories.svg"
        badges={["Admin API", "CRUD thật", "Upload ảnh"]}
      >
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Thêm danh mục
        </Button>
      </AdminPageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng danh mục"
          value={categories.length}
          description="Đọc từ admin API"
          icon={FolderTree}
          tone="green"
        />
        <StatCard
          title="Có ảnh đại diện"
          value={categoryStats.withImage}
          description="Có ảnh hiển thị"
          icon={ImagePlus}
          tone="blue"
        />
        <StatCard
          title="Đang hiện trên web"
          value={publicCategoryError ? "!" : publicCategories.length}
          description={
            publicCategoryError ? "Chưa đối soát được" : "Đọc từ public API"
          }
          icon={Globe2}
          tone="green"
        />
        <StatCard
          title="Lệch với web"
          value={categoryStats.notOnWeb}
          description="Có trong admin nhưng chưa thấy ở public"
          icon={Layers}
          tone="amber"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm danh mục theo tên, slug, mô tả"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={refreshCategories}
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

      {!error && publicCategoryError && (
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Chưa đối soát được danh mục với public API: {publicCategoryError}
        </div>
      )}

      <DataTable
        columns={["Danh mục", "Slug", "Mô tả", "Nguồn", "Thao tác"]}
        data={filteredCategories}
        loading={loading}
        error={loading || categories.length === 0 ? error : ""}
        emptyText="Không tìm thấy danh mục"
        renderRow={(category) => {
          const displayCategory = localizeCategory(category, locale) || category;
          const categoryOnWeb =
            !publicCategoryError && isCategoryOnWeb(category);

          return (
          <TableRow key={category.id}>
            <TableCell className="px-4">
              <div className="flex items-center gap-3">
                {category.image ? (
                  <div
                    className="size-11 rounded-lg bg-cover bg-center ring-1 ring-border"
                    role="img"
                    aria-label={displayCategory.name}
                    style={{
                      backgroundImage: getImageBackground(category.image),
                    }}
                  />
                ) : (
                  <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <ImageIcon className="size-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{displayCategory.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    ID #{category.id}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4">{category.slug}</TableCell>
            <TableCell className="max-w-xs whitespace-normal px-4 text-muted-foreground">
              {displayCategory.description || "Chưa có mô tả"}
            </TableCell>
            <TableCell className="px-4">
              <span
                className={`rounded-md px-2 py-1 text-xs font-bold ${
                  categoryOnWeb
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {categoryOnWeb
                  ? "Trên web"
                  : publicCategoryError
                    ? "Chưa đối soát"
                    : "Chưa thấy trên web"}
              </span>
            </TableCell>
            <TableCell className="px-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  title="Sửa danh mục"
                  aria-label="Sửa danh mục"
                  onClick={() => openEditDialog(category)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  title="Xóa danh mục"
                  aria-label="Xóa danh mục"
                  disabled={deletingId === String(category.id)}
                  onClick={() => handleRemove(category)}
                >
                  {deletingId === String(category.id) ? (
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
                {editingCategory ? "Sửa danh mục" : "Thêm danh mục"}
              </DialogTitle>
              <DialogDescription>
                Thao tác này gọi API admin, lưu trực tiếp vào database và hỗ trợ tải ảnh lên server.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category-name">Tên danh mục</Label>
                <Input
                  id="category-name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-slug">Slug</Label>
                <Input
                  id="category-slug"
                  value={form.slug}
                  onChange={(event) => updateForm("slug", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-image-file">Ảnh danh mục</Label>
              <Input
                id="category-image-file"
                type="file"
                accept="image/*"
                disabled={uploadingImage}
                onChange={(event) => {
                  handleImageFile(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                Chọn ảnh từ máy để tải lên server.
              </p>
              {uploadingImage && (
                <p className="text-xs font-medium text-emerald-700">
                  Đang tải ảnh lên server...
                </p>
              )}
              {form.image && (
                <div className="relative">
                  <div
                    className="h-28 rounded-lg border bg-cover bg-center"
                    role="img"
                    aria-label="Ảnh danh mục đang chọn"
                    style={{ backgroundImage: getImageBackground(form.image) }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-xs"
                    className="absolute right-1 top-1 bg-background/90"
                    onClick={() => updateForm("image", "")}
                  >
                    <Trash2 className="size-3" />
                    <span className="sr-only">Xóa ảnh danh mục</span>
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">Mô tả</Label>
              <Textarea
                id="category-description"
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
                    : editingCategory
                      ? "Lưu thay đổi"
                      : "Tạo danh mục"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
