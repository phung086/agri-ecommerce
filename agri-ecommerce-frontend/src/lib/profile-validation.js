/**
 * Regex SĐT Việt Nam theo đầu số thực tế (Nghị định 49/2017/NĐ-CP và cập nhật):
 * - 02xx: cố định (020x đến 029x)
 * - 03x: Viettel (032-039)
 * - 05x: Vietnamobile/Gmobile (052, 055, 056, 058, 059)
 * - 07x: Mobifone (070, 076, 077, 078, 079)
 * - 08x: Viettel (086), Vinaphone (081-085, 088), Mobifone (089)
 * - 09x: tất cả nhà mạng (090-099)
 * Regex cho phép: 0xxx (10 chữ số), +84xxx, 84xxx (normalize về 0xxx)
 */
export const VIETNAM_PHONE_REGEX =
  /^(?:\+84|84|0)(?:2[0-9]\d|3[2-9]\d|5[25689]\d|7[06-9]\d|8[1-9]\d|9[0-9]\d)\d{6}$/;

/**
 * Regex email chuẩn RFC 5322 simplified – chấp nhận cả domain đa cấp (co.uk, com.vn...)
 */
export const EMAIL_REGEX =
  /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

export const LOGIN_CREDENTIAL_ERROR_MESSAGE =
  "Nhập email đúng mẫu, ví dụ ten@email.com, hoặc SĐT Việt Nam hợp lệ, ví dụ 0987654321.";

export const EMAIL_ERROR_MESSAGE =
  "Email phải đúng định dạng, ví dụ customer@example.com.";

/** Loại bỏ ký tự không phải số hoặc dấu + (chỉ giữ + đầu) */
export function sanitizeVietnamPhone(value) {
  return String(value || "")
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "")
    .slice(0, 13);
}

/** Chuẩn hóa về dạng 0xxxxxxxxx (10 chữ số) */
export function normalizeVietnamPhone(value) {
  const clean = sanitizeVietnamPhone(String(value || "").trim());

  if (clean.startsWith("+84")) {
    return "0" + clean.slice(3);
  }

  if (clean.startsWith("84") && clean.length >= 11) {
    return "0" + clean.slice(2);
  }

  return clean;
}

/** Trả về message lỗi chi tiết nếu SĐT không hợp lệ, chuỗi rỗng nếu hợp lệ */
export function getVietnamPhoneError(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "Vui lòng nhập số điện thoại.";
  }

  if (raw.length > 20) {
    return "Số điện thoại không được vượt quá 20 ký tự.";
  }

  // Kiểm tra ký tự lạ
  const cleanNonDigits = raw.replace(/^\+/, "");
  if (/[^\d\s.\-]/.test(cleanNonDigits)) {
    return "Số điện thoại chỉ được chứa chữ số, khoảng trắng, dấu chấm (.) hoặc dấu gạch ngang (-).";
  }

  const clean = sanitizeVietnamPhone(raw);
  const normalized = normalizeVietnamPhone(clean);

  if (!raw.startsWith("0") && !raw.startsWith("84") && !raw.startsWith("+84")) {
    return "Số điện thoại Việt Nam phải bắt đầu bằng đầu số 0, 84 hoặc +84.";
  }

  if (normalized.length !== 10) {
    return `Số điện thoại Việt Nam phải có đúng 10 chữ số (hiện tại có ${normalized.length} chữ số sau chuẩn hóa).`;
  }

  const prefix3 = normalized.slice(0, 3);
  const prefix2 = normalized.slice(0, 2);

  const isMobilePrefix = /^(03[2-9]|05[25689]|07[06-9]|08[1-9]|09[0-9])$/.test(prefix3);
  const isFixedPrefix = /^02[0-9]$/.test(prefix2);

  if (!isMobilePrefix && !isFixedPrefix) {
    return `Đầu số ${prefix3.startsWith("02") ? prefix2 : prefix3} không tồn tại hoặc không được hỗ trợ ở Việt Nam.`;
  }

  if (!VIETNAM_PHONE_REGEX.test(raw) && !VIETNAM_PHONE_REGEX.test(normalized)) {
    return "Số điện thoại không đúng định dạng nhà mạng Việt Nam.";
  }

  return "";
}

export function isValidEmailAddress(value) {
  return EMAIL_REGEX.test(String(value || "").trim());
}

export function normalizeEmailAddress(value) {
  return String(value || "").trim().toLowerCase();
}

/** Validate email chi tiết, trả về message lỗi cụ thể hoặc chuỗi rỗng nếu hợp lệ */
export function getEmailError(value, { required = true } = {}) {
  const clean = String(value || "").trim();

  if (!clean) {
    return required ? "Vui lòng nhập email." : "";
  }

  if (clean.length > 255) {
    return "Email không được vượt quá 255 ký tự.";
  }

  if (!clean.includes("@")) {
    return "Email thiếu ký tự '@' (ví dụ: customer@example.com).";
  }

  const parts = clean.split("@");
  if (parts.length > 2) {
    return "Email chỉ được phép chứa duy nhất một ký tự '@'.";
  }

  const localPart = parts[0];
  const domainPart = parts[1];

  if (!localPart) {
    return "Email thiếu phần tên người dùng trước ký tự '@'.";
  }

  if (!domainPart) {
    return "Email thiếu phần tên miền sau ký tự '@'.";
  }

  if (!domainPart.includes(".")) {
    return "Email thiếu phần đuôi tên miền hợp lệ (ví dụ: .com, .vn).";
  }

  const domainParts = domainPart.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return "Đuôi tên miền của email phải có ít nhất 2 ký tự (ví dụ: .com, .vn).";
  }

  if (!EMAIL_REGEX.test(clean)) {
    return "Email chứa ký tự không hợp lệ hoặc sai định dạng.";
  }

  return "";
}

/**
 * Validate trường login chấp nhận cả email lẫn SĐT.
 * Trả về message lỗi chi tiết nếu sai định dạng, chuỗi rỗng nếu hợp lệ.
 */
export function getLoginCredentialError(value) {
  const clean = String(value || "").trim();

  if (!clean) {
    return "Vui lòng nhập email hoặc số điện thoại.";
  }

  // Nếu chuỗi chứa toàn số, dấu cách, dấu chấm, dấu gạch ngang, dấu cộng
  const isPhone = /^[+\d\s.\-]+$/.test(clean);

  if (isPhone) {
    return getVietnamPhoneError(clean);
  } else {
    // Trả về lỗi chi tiết dạng email hoặc định nghĩa chung nếu gõ bừa
    const emailErr = getEmailError(clean);
    if (emailErr) {
      if (!clean.includes("@") && clean.length < 8) {
        return "Vui lòng nhập đúng Email hoặc Số điện thoại Việt Nam.";
      }
      return emailErr;
    }
    return "";
  }
}
