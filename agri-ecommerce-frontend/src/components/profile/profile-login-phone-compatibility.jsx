"use client";

import { useEffect } from "react";
import { profileService } from "@/services/profile.service";

const PATCH_FLAG = "__agriProfileEmailCompatibilityInstalled";
const PROFILE_TIMEOUT_FLAG = "__agriProfileGetProfileTimeoutInstalled";
const PROFILE_REQUEST_TIMEOUT_MS = 10000;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const VIETNAM_PHONE_REGEX = /^(0[2-9][0-9]{8}|84[2-9][0-9]{8}|\+84[2-9][0-9]{8})$/;
const CREDENTIAL_ERROR = "Nhập email đúng mẫu, ví dụ ten@email.com, hoặc SĐT Việt Nam hợp lệ, ví dụ 0987654321.";
const EMAIL_ERROR = "Email phải đúng định dạng, ví dụ customer@example.com.";
const PHONE_ERROR = "Số điện thoại phải đúng đầu số Việt Nam, ví dụ 0987654321 hoặc +84987654321.";
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

function cleanPhoneLike(value) {
  return String(value || "")
    .trim()
    .replace(/[\s.-]/g, "");
}

function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value || "").trim());
}

function isValidVietnamPhone(value) {
  return VIETNAM_PHONE_REGEX.test(cleanPhoneLike(value));
}

function isProbablyPhone(value) {
  return /^[+\d\s.-]+$/.test(String(value || "").trim());
}

function isValidCredential(value) {
  const credential = String(value || "").trim();
  return isValidEmail(credential) || isValidVietnamPhone(credential);
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
      // Some input types do not support selection. Ignore safely.
    }
  }
}

function forceLtrInput(input, options = {}) {
  if (!input) return;

  preserveSelection(input, () => {
    input.setAttribute("dir", "ltr");
    input.style.direction = "ltr";
    input.style.unicodeBidi = "plaintext";
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

function showFieldError(input, message) {
  if (!input) return;
  input.setCustomValidity(message || "");
  setFieldVisualState(input, Boolean(message));

  const wrapper = input.closest(".space-y-2") || input.closest(".space-y-1\.5") || input.parentElement;
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

function validateEmailInput(input, { required = true, report = false } = {}) {
  if (!input) return true;
  const value = input.value.trim();
  const message = (!value && required) || (value && !isValidEmail(value)) ? EMAIL_ERROR : "";
  showFieldError(input, message);
  if (message && report) input.reportValidity();
  return !message;
}

function validatePhoneInput(input, { required = false, report = false } = {}) {
  if (!input) return true;
  const value = input.value.trim();
  const message = (!value && required) || (value && !isValidVietnamPhone(value)) ? PHONE_ERROR : "";
  showFieldError(input, message);
  if (message && report) input.reportValidity();
  return !message;
}

function validateLoginCredential({ report = false } = {}) {
  const loginInput = document.getElementById("login-email");
  if (!loginInput) return true;
  const value = loginInput.value.trim();
  const message = isValidCredential(value) ? "" : CREDENTIAL_ERROR;
  showFieldError(loginInput, message);
  if (message && report) loginInput.reportValidity();
  return !message;
}

function validateProfileEmail({ report = false } = {}) {
  const emailInput = document.getElementById("profile-email");
  return validateEmailInput(emailInput, { required: false, report });
}

function applyLoginInputMode(loginInput) {
  if (!loginInput) return;
  const value = loginInput.value.trim();
  forceLtrInput(loginInput, {
    type: "text",
    removePattern: true,
    autocomplete: "username",
    placeholder: "Email hoặc số điện thoại",
    inputMode: isProbablyPhone(value) ? "tel" : "email",
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
      placeholder: "customer@example.com",
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

  ["admin-email", "del-email"].forEach((id) => {
    const emailInput = document.getElementById(id);
    if (emailInput) {
      forceLtrInput(emailInput, {
        type: "email",
        autocomplete: "email",
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
}

/**
 * Compatibility bridge for auth/profile forms while the large profile/delivery pages are being refactored.
 * It only applies direction/validation attributes and never replaces page containers.
 */
export function ProfileLoginPhoneCompatibility() {
  useEffect(() => {
    if (!profileService[PATCH_FLAG]) {
      const originalUpdateProfile = profileService.updateProfile.bind(profileService);
      profileService.updateProfile = async (payload = {}) => {
        let nextPayload = { ...payload };
        if (typeof document !== "undefined" && window.location.pathname === "/profile") {
          if (!validateProfileEmail({ report: true })) {
            throw new Error(EMAIL_ERROR);
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

      if (form.querySelector("#login-email") && !validateLoginCredential({ report: true })) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (form.querySelector("#register-email") && !validateEmailInput(form.querySelector("#register-email"), { report: true })) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (form.querySelector("#register-phone") && !validatePhoneInput(form.querySelector("#register-phone"), { required: true, report: true })) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (form.querySelector("#admin-email") && !validateEmailInput(form.querySelector("#admin-email"), { report: true })) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (form.querySelector("#del-email") && !validateEmailInput(form.querySelector("#del-email"), { report: true })) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (form.querySelector("#track-phone") && !validatePhoneInput(form.querySelector("#track-phone"), { required: true, report: true })) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (form.querySelector("#profile-email") && !validateProfileEmail({ report: true })) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    function handleInputCapture(event) {
      const target = event.target;
      if (!target?.id) return;

      if (target.id === "login-email") {
        applyLoginInputMode(target);
        validateLoginCredential();
      }
      if (["register-email", "admin-email", "del-email", "profile-email"].includes(target.id)) {
        forceLtrInput(target, { type: "email", autocomplete: "email", inputMode: "email" });
        validateEmailInput(target, { required: target.id !== "profile-email" });
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
