"use client";

import { useEffect } from "react";
import { profileService } from "@/services/profile.service";
import {
  getEmailError as getStdEmailError,
  getVietnamPhoneError as getStdPhoneError,
  getLoginCredentialError as getStdCredentialError,
} from "@/lib/profile-validation";

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
  const err = getStdEmailError(value, { required });
  if (err && fieldLabel !== "Email") {
    // If it's a generic message we can customize it or just keep the detailed standard error message
    return err;
  }
  return err;
}

function getVietnamPhoneError(value, { required = false } = {}) {
  const clean = cleanValue(value);
  if (!clean && !required) return "";
  return getStdPhoneError(clean);
}

function getCredentialError(value) {
  return getStdCredentialError(value);
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
  if (!wrapper) return;

  let errorNode = wrapper.querySelector("[data-profile-field-error]");

  // Check if there is another error element rendered by React in the same wrapper
  const otherErrorNodes = Array.from(wrapper.querySelectorAll("p, span, div")).filter(
    el => el !== errorNode && (
      el.classList.contains("text-red-600") || 
      el.classList.contains("text-red-700") ||
      el.classList.contains("text-red-500") ||
      (el.className && String(el.className).includes("text-red-"))
    )
  );

  const hasReactError = otherErrorNodes.length > 0;

  if (message) {
    if (hasReactError) {
      if (errorNode) {
        errorNode.remove();
      }
    } else {
      if (!errorNode) {
        errorNode = document.createElement("p");
        errorNode.dataset.profileFieldError = "true";
        errorNode.className = "text-sm font-semibold text-red-600";
        wrapper.appendChild(errorNode);
      }
      errorNode.textContent = message;
    }
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

  // Email fields compatibility - use type="text"
  ["register-email", "admin-email", "del-email", "profile-email", "guest-email"].forEach((id) => {
    const emailInput = document.getElementById(id);
    if (emailInput) {
      forceLtrInput(emailInput, {
        type: "text",
        autocomplete: "email",
        placeholder: id === "guest-email" ? "Bỏ trống nếu không dùng email" : undefined,
        inputMode: "email",
      });
    }
  });

  // Phone fields compatibility
  ["register-phone", "track-phone", "address-phone", "edit-address-phone", "admin-phone", "shipper-phone"].forEach((id) => {
    const phoneInput = document.getElementById(id);
    if (phoneInput) {
      forceLtrInput(phoneInput, {
        type: "tel",
        autocomplete: "tel",
        placeholder: id === "address-phone" || id === "edit-address-phone" ? "0987654321" : undefined,
        inputMode: "tel",
      });
    }
  });

  const profileEmailInput = document.getElementById("profile-email");
  if (profileEmailInput) {
    profileEmailInput.disabled = false;
    profileEmailInput.removeAttribute("disabled");
    profileEmailInput.classList.remove("cursor-not-allowed", "bg-slate-100", "text-slate-500");
    profileEmailInput.classList.add("bg-slate-50/50");
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
        {
          selector: "#address-phone",
          validate: (input) => validatePhoneInput(input, { required: true, report: true }),
        },
        {
          selector: "#edit-address-phone",
          validate: (input) => validatePhoneInput(input, { required: true, report: true }),
        },
        {
          selector: "#admin-phone",
          validate: (input) => validatePhoneInput(input, { required: true, report: true }),
        },
        {
          selector: "#shipper-phone",
          validate: (input) => validatePhoneInput(input, { required: true, report: true }),
        },
        {
          selector: "#guest-email",
          validate: (input) => validateEmailInput(input, { required: false, report: true, fieldLabel: "Email nhận hóa đơn" }),
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

      if (["register-email", "admin-email", "del-email", "profile-email", "guest-email"].includes(target.id)) {
        forceLtrInput(target, { type: "text", autocomplete: "email", inputMode: "email" });
        validateEmailInput(target, {
          required: !["profile-email", "guest-email"].includes(target.id),
          fieldLabel: target.id === "register-email" ? "Email đăng ký" :
                      target.id === "admin-email" ? "Email quản trị" :
                      target.id === "del-email" ? "Email nhân viên giao hàng" : "Email"
        });
        return;
      }

      if (["register-phone", "track-phone", "address-phone", "edit-address-phone", "admin-phone", "shipper-phone"].includes(target.id)) {
        forceLtrInput(target, { type: "tel", autocomplete: "tel", inputMode: "tel" });
        validatePhoneInput(target, { required: true });
        return;
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
