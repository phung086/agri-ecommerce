export function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) {
    return "Chưa có";
  }

  const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function getAssetUrl(path) {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const backendRoot = apiBaseUrl.replace(/\/api\/?$/, "");

  if (!backendRoot) {
    return `/${path.replace(/^\/+/, "")}`;
  }

  return `${backendRoot}/${path.replace(/^\/+/, "")}`;
}

export function getApiErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "Bạn cần đăng nhập bằng tài khoản admin để xem dữ liệu này.";
  }

  return error?.message || "Không thể tải dữ liệu. Vui lòng thử lại.";
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
