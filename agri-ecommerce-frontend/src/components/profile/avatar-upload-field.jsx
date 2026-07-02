"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAssetUrl } from "@/lib/admin-utils";

const ACCEPTED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ACCEPTED_AVATAR_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

function formatFileSize(size = 0) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function validateAvatarFile(file) {
  if (!file) return "";

  if (
    !ACCEPTED_AVATAR_TYPES.has(file.type) ||
    !ACCEPTED_AVATAR_EXTENSIONS.test(file.name)
  ) {
    return "Chỉ hỗ trợ ảnh JPG, JPEG, PNG hoặc WEBP.";
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return "Ảnh đại diện không được vượt quá 5MB.";
  }

  return "";
}

export function AvatarUploadField({
  id,
  value,
  disabled,
  uploading,
  onChange,
  onUpload,
  onUploadStart,
  onUploadEnd,
  onUploadSuccess,
  onUploadError,
}) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileMeta, setFileMeta] = useState(null);
  const [message, setMessage] = useState("");

  const imageUrl = previewUrl || getAssetUrl(value);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const validationMessage = validateAvatarFile(file);
    if (validationMessage) {
      setMessage(validationMessage);
      onUploadError?.(validationMessage);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextPreviewUrl;
    });
    setFileMeta({ name: file.name, size: file.size });
    setMessage("");

    if (!onUpload) {
      // TODO: Tích hợp upload API nếu backend chưa hỗ trợ upload avatar.
      return;
    }

    onUploadStart?.();
    try {
      const uploaded = await onUpload(file);
      const nextAvatar =
        uploaded?.avatar || uploaded?.path || uploaded?.url || value || "";

      if (nextAvatar) {
        onChange(nextAvatar);
      }
      onUploadSuccess?.("Đã upload ảnh đại diện.");
    } catch (error) {
      const errorMessage =
        error?.message || "Không thể upload ảnh đại diện. Vui lòng thử lại.";
      setMessage(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      onUploadEnd?.();
    }
  }

  function handleRemove() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    setFileMeta(null);
    setMessage("");
    onChange("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-emerald-100 bg-emerald-50 text-emerald-700">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Avatar preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="size-6" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-slate-700">
            {fileMeta?.name || value || "Chưa chọn ảnh"}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {fileMeta ? formatFileSize(fileMeta.size) : "JPG, JPEG, PNG, WEBP - tối đa 5MB"}
          </p>
          {message && (
            <p className="mt-1 text-xs font-semibold text-red-600">{message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          variant="outline"
          className="h-10 border-emerald-100 bg-white text-emerald-800"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : value || fileMeta ? (
            <Upload className="size-4" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {value || fileMeta ? "Chọn ảnh khác" : "Chọn ảnh"}
        </Button>
        {(value || fileMeta) && (
          <Button
            type="button"
            variant="outline"
            className="h-10 border-red-100 bg-white text-red-700 hover:bg-red-50"
            onClick={handleRemove}
            disabled={disabled || uploading}
          >
            <Trash2 className="size-4" />
            Xóa ảnh
          </Button>
        )}
      </div>
    </div>
  );
}
