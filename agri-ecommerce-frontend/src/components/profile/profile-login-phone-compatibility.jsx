"use client";

import { useEffect } from "react";
import { profileService } from "@/services/profile.service";

const PATCH_FLAG = "__agriProfileEmailCompatibilityInstalled";
const PROFILE_TIMEOUT_FLAG = "__agriProfileGetProfileTimeoutInstalled";
const PROFILE_REQUEST_TIMEOUT_MS = 10000;

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const VIETNAM_PHONE_REGEX = /^(0[2-9][0-9]{8}|84[2-9][0-9]{8}|\+84[2-9][0-9]{8})$/;
const ERROR_CLASSES = ["border-red-500", "focus:border-red-500", "focus:ring-red-500", "ring-red-200"];
const NORMAL_CLASSES = ["border-emerald-200"];

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) window.clearTimeout(timeoutId);
  });
}

function cleanValue(value) {
  return String(value || "").trim();
}

function cleanPhoneLike(value) {
  return cleanValue(value).replace(/[\s.-]/g, "");
}

function normalizePhoneForLength(value) {
  const phone = cleanPhoneLike(value);
  if (phone.startsWith("+84")) return `0${phone.slice(3)}`;
  if (phone.startsWith("84")) return `0${phone.slice(2)}`;
  return phone;
}

function looksLikePhone(value) {
  return /^[+\d\s.-]+$/.test(cleanValue(value));
}

function isValidEmail(value) {
  return EMAIL_REGEX.test(cleanValue(value));
}

function isValidVietnamPhone(value) {
  return VIETNAM_PHONE_REGEX.test(cleanPhoneLike(value));
}

function getEmailError(value, { required = true, fieldLabel = "Email" } = {}) {
  const email = cleanValue(value);

  if (!email) {
    return required ? `Vui lòng nhập ${fieldLabel.toLowerCase()}.` : "";
  }

  if (/\s/.test(email)) {
    return `${fieldLabel} không được chứa khoảng trắng.`;
  }

  const atCount = (email.match(/@/g) || []).length;
  if (atCount === 0) {
    return `${fieldLabel} phải có ký tự @, ví dụ ten@email.com.`;
  }

  if (atCount > 1) {
    return `${fieldLabel} chỉ được có một ký tự @.`;
  }

  const [localPart, domainPart] = email.split("@");
  if (!localPart) {
    return `${fieldLabel} thiếu tên trước @, ví dụ ten@email.com.`;
  }

  if (!domainPart) {
    return `${fieldLabel} thiếu tên miền sau @, ví dụ ten@email.com.`;
  }

  if (!domainPart.includes(".")) {
    return `${fieldLabel} thiếu phần mở rộng tên miền, ví dụ .com hoặc .vn.`;
  }

  const domainParts = domainPart.split(".");
  if (domainParts.some((part) => !part)) {
    return `${fieldLabel} có dấu chấm tên miền không hợp lệ.`;
  }

  const tld = domainParts.at(-1) || "";
  if (tld.length < 2) {
    return `${fieldLabel} cần phần đuôi tên miền tối thiểu 2 ký tự, ví dụ .com hoặc .vn.`;
  }

  if (!EMAIL_REGEX.test(email)) {
    return `${fieldLabel} chưa đúng định dạng, ví dụ ten@email.com.`;
  }

  return "";
}

function getVietnamPhoneError(value, { required = false } = {}) {
  const raw = cleanValue(value);
  const phone = cleanPhoneLike(raw);

  if (!phone) {
    return required ? "Vui lòng nhập số điện thoại." : "";
  }

  if (!/^\+?\d+$/.test(phone)) {
    return "Số điện thoại chỉ được gồm chữ số, có thể bắt đầu bằng +84.";
  }

  const normalized = normalizePhoneForLength(phone);
  if (!/^0\d*$/.test(normalized)) {
    return "Số điện thoại Việt Nam phải bắt đầu bằng 0, 84 hoặc +84.";
  }

  if (normalized.length < 10) {
    return "Số điện thoại Việt Nam đang thiếu chữ số, cần đúng 10 chữ số, ví dụ 0987654321.";
  }

  if (normalized.length > 10) {
    return "Số điện thoại Việt Nam đang quá dài, cần đúng 10 chữ số, ví dụ 0987654321.";
  }

  if (!/^0[2-9]/.test(normalized)) {
    return "Đầu số điện thoại Việt Nam không hợp lệ. SĐT phải bắt đầu bằng 02, 03, 05, 07, 08 hoặc 09.";
  }

  if (!VIETNAM_PHONE_REGEX.test(phone)) {
    return "Số điện thoại chưa đúng định dạng Việt Nam, ví dụ 0987654321 hoặc +84987654321.";
  }

  return "";
}

function getCredentialError(value) {
  const credential = cleanValue(value);

  if (!credential) {
    return "Vui lòng nhập email hoặc số điện thoại.";
  }

  if (looksLikePhone(credential)) {
    return getVietnamPhoneError(credential, { required: true });
  }

  return getEmailError(credential, {
    required: true,
    fieldLabel: "Email đăng nhập",
  });
}

function isValidCredential(value) {
  return !getCredentialError(value);
}

function preserveSelection(input, callback) {
  const active = document.activeElement === input;
  const start = active ? input.selectionStart : null;
  const end = active ? input.selectionEnd : null;
  const direction = active ? input.selectionDirection : null;

  callback();

  if (
    active &&
    typeof start === "number" &&
    typeof end === "number" &&
    typeof input.setSelectionRange === "function"
  ) {
    try {
      input.setSelectionRange(start, end, direction || "none");
    } catch {
      // Một số type input không hỗ trợ selection range.
    }
  }
}

function forceLtrInput(input, options = {}) {
  if (!input) return;

  preserveSelection(input, () => {
    input.setAttribute("dir", "ltr");
    input.dataset.agriLtrInput = "true";
    input.style.direction = "ltr";
    input.style.unicodeBidi = "isolate";
    input.style.textAlign = "left";

    if (options.type && input.getAttribute("type") !== options.type) {
      input.setAttribute("type", options.type);
    }
    if (options.autocomplete) {
      input.setAttribute("autocomplete", options.autocomplete);
    }
    if (options.placeholder) {
      input.setAttribute("placeholder", options.placeholder);
    }
    if (options.inputMode) {
      input.setAttribute("inputmode", options.inputMode);
    }
    if (options.removePattern) {
      input.removeAttribute("pattern");
    }
  });
}

function setFieldVisualState(input, hasError) {
  if (!input) return;
  if (hasError) {
    input.classList.add(...ERROR_CLASSES);
    input.classList.remove(...NORMAL_CLASSES);
    input.setAttribute("aria-invalid", "true");
  } else {
    input.classList.remove(...ERROR_CLASSES);
    input.classList.add(...NORMAL_CLASSES);
    input.removeAttribute("aria-invalid");
  }
}

function getFieldWrapper(input) {
  return (
    input.closest("[data-auth-field]") ||
    input.closest(".space-y-2") ||
    input.closest(".space-y-1\\.5") ||
    input.parentElement?.parentElement ||
    input.parentElement
  );
}

function showFieldError(input, message) {
  if (!input) return;
  input.setCustomValidity(message || "");
  setFieldVisualState(input, Boolean(message));

  const wrapper = getFieldWrapper(input);
  let errorNode = wrapper?.querySelector("[data-profile-field-error]");
  if (message) {
    if (!errorNode && wrapper) {
      errorNode = document.createElement("p");
      errorNode.dataset.profileFieldError = "true";
      errorNode.className = "text-sm font-semibold text-red-600";
      wrapper.appendChild(errorNode);
    }
    if (errorNode) errorNode.textContent = message;
  } else if (errorNode) {
    errorNode.remove();
  }
}

function validateEmailInput(input, { required = true, report = false, fieldLabel = "Email" } = {}) {
  if (!input) return true;
  const message = getEmailError(input.value, { required, fieldLabel });
  showFieldError(input, message);
  if (message && report) input.reportValidity();
  return !message;
}

function validatePhoneInput(input, { required = false, report = false } = {}) {
  if (!input) return true;
  const message = getVietnamPhoneError(input.value, { required });
  showFieldError(input, message);
  if (message && report) input.reportValidity();
  return !message;
}

function validateLoginCredential({ report = false } = {}) {
  const loginInput = document.getElementById("login-email");
  if (!loginInput) return true;
  const message = getCredentialError(loginInput.value);
  showFieldError(loginInput, message);
  if (message && report) loginInput.reportValidity();
  return !message;
}

function validateProfileEmail({ report = false } = {}) {
  const emailInput = document.getElementById("profile-email");
  return validateEmailInput(emailInput, { required: false, report, fieldLabel: "Email" });
}

function applyLoginInputMode(loginInput) {
  if (!loginInput) return;
  const value = loginInput.value.trim();
  forceLtrInput(loginInput, {
    type: "text",
    removePattern: true,
    autocomplete: "username",
    placeholder: "Email hoặc số điện thoại",
    inputMode: looksLikePhone(value) ? "tel" : "email",
  });
}

function applyAuthFieldCompatibility() {
  if (typeof window === "undefined") return;

  const loginInput = document.getElementById("login-email");
  if (loginInput) {
    applyLoginInputMode(loginInput);
  }

  const loginLabel = document.querySelector('label[for="login-email"]');
  if (loginLabel) {
    loginLabel.textContent = "Email hoặc số điện thoại";
  }

  const registerEmailInput = document.getElementById("register-email");
  if (registerEmailInput) {
    forceLtrInput(registerEmailInput, {
      type: "email",
      autocomplete: "email",
      placeholder: "ten@email.com",
      inputMode: "email",
    });
  }

  const registerPhoneInput = document.getElementById("register-phone");
  if (registerPhoneInput) {
    forceLtrInput(registerPhoneInput, {
      type: "tel",
      autocomplete: "tel",
      placeholder: "0987654321",
      inputMode: "tel",
    });
  }

  [
    { id: "admin-email", placeholder: "admin@example.com", label: "Email quản trị" },
    { id: "del-email", placeholder: "shipper@example.com", label: "Email nhân viên giao hàng" },
  ].forEach((field) => {
    const emailInput = document.getElementById(field.id);
    if (emailInput) {
      forceLtrInput(emailInput, {
        type: "email",
        autocomplete: "email",
        placeholder: field.placeholder,
        inputMode: "email",
      });
    }
  });

  const trackPhoneInput = document.getElementById("track-phone");
  if (trackPhoneInput) {
    forceLtrInput(trackPhoneInput, {
      type: "tel",
      autocomplete: "tel",
      inputMode: "tel",
      placeholder: "0987654321",
    });
  }

  const profileEmailInput = document.getElementById("profile-email");
  if (profileEmailInput) {
    profileEmailInput.disabled = false;
    profileEmailInput.removeAttribute("disabled");
    profileEmailInput.classList.remove("cursor-not-allowed", "bg-slate-100", "text-slate-500");
    profileEmailInput.classList.add("bg-slate-50/50");
    forceLtrInput(profileEmailInput, {
      type: "email",
      autocomplete: "email",
      placeholder: "email@example.com",
      inputMode: "email",
    });
  }

  document
    .querySelectorAll('input[type="email"], input[type="tel"], input[inputmode="email"], input[inputmode="tel"], input[autocomplete="username"], input[data-agri-ltr-input="true"]')
    .forEach((input) => forceLtrInput(input));
}

export function ProfileLoginPhoneCompatibility() {
  useEffect(() => {
    if (!profileService[PATCH_FLAG]) {
      const originalUpdateProfile = profileService.updateProfile.bind(profileService);
      profileService.updateProfile = async (payload = {}) => {
        let nextPayload = { ...payload };
        if (typeof document !== "undefined" && window.location.pathname === "/profile") {
          if (!validateProfileEmail({ report: true })) {
            throw new Error(getEmailError(document.getElementById("profile-email")?.value, { required: false }));
          }
          const emailInput = document.getElementById("profile-email");
          const email = String(emailInput?.value || "").trim().toLowerCase();
          if (email) {
            nextPayload = { ...nextPayload, email };
          }
        }
        return originalUpdateProfile(nextPayload);
      };
      profileService[PATCH_FLAG] = true;
    }

    if (!profileService[PROFILE_TIMEOUT_FLAG]) {
      const originalGetProfile = profileService.getProfile.bind(profileService);
      profileService.getProfile = async (...args) => {
        if (typeof window === "undefined" || window.location.pathname !== "/profile") {
          return originalGetProfile(...args);
        }

        return withTimeout(
          originalGetProfile(...args),
          PROFILE_REQUEST_TIMEOUT_MS,
          "Phiên đăng nhập không phản hồi. Vui lòng đăng nhập lại."
        );
      };
      profileService[PROFILE_TIMEOUT_FLAG] = true;
    }

    function handleSubmitCapture(event) {
      applyAuthFieldCompatibility();
      const form = event.target;
      if (!form?.querySelector) return;

      const rules = [
        {
          selector: "#login-email",
          validate: () => validateLoginCredential({ report: true }),
        },
        {
          selector: "#register-email",
          validate: (input) => validateEmailInput(input, { report: true, fieldLabel: "Email đăng ký" }),
        },
        {
          selector: "#register-phone",
          validate: (input) => validatePhoneInput(input, { required: true, report: true }),
        },
        {
          selector: "#admin-email",
          validate: (input) => validateEmailInput(input, { report: true, fieldLabel: "Email quản trị" }),
        },
        {
          selector: "#del-email",
          validate: (input) => validateEmailInput(input, { report: true, fieldLabel: "Email nhân viên giao hàng" }),
        },
        {
          selector: "#track-phone",
          validate: (input) => validatePhoneInput(input, { required: true, report: true }),
        },
        {
          selector: "#profile-email",
          validate: () => validateProfileEmail({ report: true }),
        },
      ];

      for (const rule of rules) {
        const input = form.querySelector(rule.selector);
        if (input && !rule.validate(input)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    }

    function handleInputCapture(event) {
      const target = event.target;
      if (!target?.id) return;

      if (target.id === "login-email") {
        applyLoginInputMode(target);
        validateLoginCredential();
        return;
      }

      if (target.id === "register-email") {
        forceLtrInput(target, { type: "email", autocomplete: "email", inputMode: "email" });
        validateEmailInput(target, { required: true, fieldLabel: "Email đăng ký" });
        return;
      }

      if (target.id === "admin-email") {
        forceLtrInput(target, { type: "email", autocomplete: "email", inputMode: "email" });
        validateEmailInput(target, { required: true, fieldLabel: "Email quản trị" });
        return;
      }

      if (target.id === "del-email") {
        forceLtrInput(target, { type: "email", autocomplete: "email", inputMode: "email" });
        validateEmailInput(target, { required: true, fieldLabel: "Email nhân viên giao hàng" });
        return;
      }

      if (target.id === "profile-email") {
        forceLtrInput(target, { type: "email", autocomplete: "email", inputMode: "email" });
        validateEmailInput(target, { required: false, fieldLabel: "Email" });
        return;
      }

      if (["register-phone", "track-phone"].includes(target.id)) {
        forceLtrInput(target, { type: "tel", autocomplete: "tel", inputMode: "tel" });
        validatePhoneInput(target, { required: true });
      }
    }

    function handleFocusCapture(event) {
      if (event.target?.tagName === "INPUT") {
        applyAuthFieldCompatibility();
      }
    }

    applyAuthFieldCompatibility();

    const intervalId = window.setInterval(applyAuthFieldCompatibility, 1000);

    document.addEventListener("submit", handleSubmitCapture, true);
    document.addEventListener("input", handleInputCapture, true);
    document.addEventListener("focusin", handleFocusCapture, true);
    window.addEventListener("popstate", applyAuthFieldCompatibility);
    window.addEventListener("customer-auth-session-updated", applyAuthFieldCompatibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("submit", handleSubmitCapture, true);
      document.removeEventListener("input", handleInputCapture, true);
      document.removeEventListener("focusin", handleFocusCapture, true);
      window.removeEventListener("popstate", applyAuthFieldCompatibility);
      window.removeEventListener("customer-auth-session-updated", applyAuthFieldCompatibility);
    };
  }, []);

  return null;
}
