export const VIETNAM_PHONE_REGEX = /^(?:\+84|84|0)(3|5|7|8|9|2)\d{8}$/;

export function sanitizeVietnamPhone(value) {
  return String(value || "")
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "")
    .slice(0, 12);
}

export function normalizeVietnamPhone(value) {
  const cleanValue = sanitizeVietnamPhone(value).trim();

  if (cleanValue.startsWith("+84")) {
    return `0${cleanValue.slice(3)}`;
  }

  if (cleanValue.startsWith("84")) {
    return `0${cleanValue.slice(2)}`;
  }

  return cleanValue;
}

export function getVietnamPhoneError(value) {
  const cleanValue = sanitizeVietnamPhone(value).trim();

  if (!cleanValue) {
    return "Vui lòng nhập số điện thoại.";
  }

  if (!VIETNAM_PHONE_REGEX.test(cleanValue)) {
    const normalizedValue = normalizeVietnamPhone(cleanValue);
    if (/^\d+$/.test(normalizedValue) && normalizedValue.length !== 10) {
      return "Số điện thoại phải gồm 10 chữ số.";
    }

    return "Số điện thoại không hợp lệ.";
  }

  return "";
}
