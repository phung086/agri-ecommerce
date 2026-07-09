"use client";

import { useEffect } from "react";
import { profileService } from "@/services/profile.service";

const PATCH_FLAG = "__agriProfileEmailCompatibilityInstalled";
const PROFILE_TIMEOUT_FLAG = "__agriProfileGetProfileTimeoutInstalled";
const PROFILE_REQUEST_TIMEOUT_MS = 10000;

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  });
}

/**
 * Compatibility bridge for the existing profile page.
 *
 * - Login identifier is relaxed from email-only to email/phone so default guest
 *   accounts can log in using phone + password 123456.
 * - Profile email field is made editable and injected into updateProfile payload
 *   without rewriting the large profile page component.
 * - Profile auth check is guarded with a timeout so the page never stays forever
 *   at "Đang kiểm tra phiên đăng nhập" when an old token or deploy hiccup blocks
 *   the profile API response.
 */
export function ProfileLoginPhoneCompatibility() {
  useEffect(() => {
    if (!profileService[PATCH_FLAG]) {
      const originalUpdateProfile = profileService.updateProfile.bind(profileService);
      profileService.updateProfile = async (payload = {}) => {
        let nextPayload = { ...payload };
        if (typeof document !== "undefined" && window.location.pathname === "/profile") {
          const emailInput = document.getElementById("profile-email");
          const email = String(emailInput?.value || "").trim();
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

    function applyPhoneLoginCompatibility() {
      if (typeof window === "undefined" || window.location.pathname !== "/profile") {
        return;
      }

      const loginInput = document.getElementById("login-email");
      if (loginInput) {
        loginInput.type = "text";
        loginInput.removeAttribute("pattern");
        loginInput.setAttribute("inputmode", "text");
        loginInput.setAttribute("autocomplete", "username");
        loginInput.setAttribute("placeholder", "Email hoặc số điện thoại");
      }

      const loginLabel = document.querySelector('label[for="login-email"]');
      if (loginLabel) {
        loginLabel.textContent = "Email hoặc số điện thoại";
      }

      const profileEmailInput = document.getElementById("profile-email");
      if (profileEmailInput) {
        profileEmailInput.disabled = false;
        profileEmailInput.removeAttribute("disabled");
        profileEmailInput.type = "email";
        profileEmailInput.setAttribute("autocomplete", "email");
        profileEmailInput.setAttribute("placeholder", "email@example.com");
        profileEmailInput.classList.remove("cursor-not-allowed", "bg-slate-100", "text-slate-500");
        profileEmailInput.classList.add("bg-slate-50/50");
      }
    }

    function handleSubmitCapture() {
      applyPhoneLoginCompatibility();
    }

    function handleFocusCapture(event) {
      if (event.target?.id === "login-email" || event.target?.id === "profile-email") {
        applyPhoneLoginCompatibility();
      }
    }

    applyPhoneLoginCompatibility();

    const intervalId = window.setInterval(applyPhoneLoginCompatibility, 700);

    document.addEventListener("submit", handleSubmitCapture, true);
    document.addEventListener("focusin", handleFocusCapture, true);
    window.addEventListener("popstate", applyPhoneLoginCompatibility);
    window.addEventListener("customer-auth-session-updated", applyPhoneLoginCompatibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("submit", handleSubmitCapture, true);
      document.removeEventListener("focusin", handleFocusCapture, true);
      window.removeEventListener("popstate", applyPhoneLoginCompatibility);
      window.removeEventListener("customer-auth-session-updated", applyPhoneLoginCompatibility);
    };
  }, []);

  return null;
}
