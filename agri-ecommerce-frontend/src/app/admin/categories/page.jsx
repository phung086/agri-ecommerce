"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FolderTree,
  ImageIcon,
  ImagePlus,
  Layers,
  Pencil,
  Plus,
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
import { adminService } from "@/services/admin.service";
import { getApiErrorMessage, getImageBackground, slugify } from "@/lib/admin-utils";

const blankCategoryForm = {
  name: "",
  slug: "",
  description: "",
  image: "",
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(blankCategoryForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      setLoading(true);
      setError("");

      try {
        const response = await adminService.getCategories();
        if (mounted) {
          setCategories(Array.isArray(response) ? response : []);
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

      return [category.name, category.slug, category.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [categories, searchTerm]);

  const categoryStats = useMemo(() => {
    const withImage = categories.filter((category) => category.image).length;

    return { withImage };
  }, [categories]);

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
      updateForm("image", uploadedImage.path);
      setNotice("Đã tải ảnh danh mục lên server.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploadingImage(false);
    }
  }

  function openCreateDialog() {
    setEditingCategory(null);
    setForm(blankCategoryForm);
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
    setDialogOpen(true);
  }

  function buildCategoryPayload() {
    return {
      name: form.name.trim(),
      slug: form.slug || slugify(form.name),
      description: form.description,
      image: form.image.trim(),
    };
  }

  async function handleSaveToApi(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = buildCategoryPayload();

      if (editingCategory) {
        const savedCategory = await adminService.updateCategory(
          editingCategory.id,
          payload
        );

        setCategories((current) =>
          current.map((category) =>
            category.id === editingCategory.id ? savedCategory : category
          )
        );
        setNotice("Đã cập nhật danh mục vào database.");
      } else {
        const savedCategory = await adminService.createCategory(payload);
        setCategories((current) => [savedCategory, ...current]);
        setNotice("Đã thêm danh mục vào database.");
      }

      setDialogOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFromApi(categoryId) {
    const confirmed = window.confirm("Xóa danh mục khỏi database?");

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await adminService.deleteCategory(categoryId);
      setCategories((current) =>
        current.filter((category) => category.id !== categoryId)
      );
      setNotice("Đã xóa danh mục khỏi database.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Quản lí danh mục"
        description="Tổ chức sản phẩm theo nhóm, cập nhật mô tả, slug và ảnh đại diện để khách hàng duyệt cửa hàng nhanh hơn."
        image="/admin-assets/categories.svg"
        badges={["Database API", "CRUD thật"]}
      >
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Thêm danh mục
        </Button>
      </AdminPageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Tổng danh mục"
          value={categories.length}
          description="Đọc từ database API"
          icon={FolderTree}
          tone="green"
        />
        <StatCard
          title="Có ảnh đại diện"
          value={categoryStats.withImage}
          description="Hiển thị trong bảng và form"
          icon={ImagePlus}
          tone="blue"
        />
        <StatCard
          title="Dữ liệu database"
          value={categories.length}
          description="Lưu bền sau khi tải lại"
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
      </div>

      {notice && (
        <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          {notice}
        </div>
      )}

      <DataTable
        columns={["Danh mục", "Slug", "Mô tả", "Nguồn", "Thao tác"]}
        data={filteredCategories}
        loading={loading}
        error={error}
        emptyText="Không tìm thấy danh mục"
        renderRow={(category) => (
          <TableRow key={category.id}>
            <TableCell className="px-4">
              <div className="flex items-center gap-3">
                {category.image ? (
                  <div
                    className="size-11 rounded-lg bg-cover bg-center ring-1 ring-border"
                    role="img"
                    aria-label={category.name}
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
                  <p className="truncate font-medium">{category.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    ID #{category.id}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4">{category.slug}</TableCell>
            <TableCell className="max-w-xs whitespace-normal px-4 text-muted-foreground">
              {category.description || "Chưa có mô tả"}
            </TableCell>
            <TableCell className="px-4">
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                API
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
                  onClick={() => handleRemoveFromApi(category.id)}
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
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleSaveToApi} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Sửa danh mục" : "Thêm danh mục"}
              </DialogTitle>
              <DialogDescription>
                Dữ liệu sẽ lưu vào database và xuất hiện trên trang khách hàng.
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
              <Label htmlFor="category-image">Đường dẫn ảnh</Label>
              <Input
                id="category-image"
                value={form.image}
                onChange={(event) => updateForm("image", event.target.value)}
                placeholder="uploads/categories/example.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-image-file">Chọn ảnh từ máy tính</Label>
              <Input
                id="category-image-file"
                type="file"
                accept="image/*"
                disabled={uploadingImage}
                onChange={(event) =>
                  handleImageFile(event.target.files?.[0] || null)
                }
              />
              {uploadingImage && (
                <p className="text-xs font-medium text-emerald-700">
                  Đang tải ảnh lên server...
                </p>
              )}
              {form.image && (
                <div
                  className="h-28 rounded-lg border bg-cover bg-center"
                  role="img"
                  aria-label="Ảnh danh mục đang chọn"
                  style={{ backgroundImage: getImageBackground(form.image) }}
                />
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
