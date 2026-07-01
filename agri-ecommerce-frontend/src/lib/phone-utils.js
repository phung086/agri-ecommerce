export const PHONE_PATTERN_SOURCE = "^(0[2-9][0-9]{8}|\\+84[2-9][0-9]{8})$";
export const PHONE_ERROR_MESSAGE =
  "Số điện thoại phải đúng định dạng Việt Nam, ví dụ 0987654321 hoặc +84987654321.";

const phoneRegex = new RegExp(PHONE_PATTERN_SOURCE);

export function isValidPhoneNumber(value, { required = false } = {}) {
  const phone = String(value || "").trim();

  if (!phone) {
    return !required;
  }

  return phoneRegex.test(phone);
}
