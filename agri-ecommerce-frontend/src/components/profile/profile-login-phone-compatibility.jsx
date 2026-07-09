"use client";

import { useEffect } from "react";
import { profileService } from "@/services/profile.service";

const PATCH_FLAG = "__agriProfileEmailCompatibilityInstalled";

/**
 * Compatibility bridge for the existing profile page.
 *
 * - Login identifier is relaxed from email-only to email/phone so default guest
 *   accounts can log in using phone + password 123456.
 * - Profile email field is made editable and injected into updateProfile payload
 *   without rewriting the large profile page component.
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

    const observer = new MutationObserver(applyPhoneLoginCompatibility);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["type", "disabled", "class", "placeholder"],
    });

    document.addEventListener("submit", handleSubmitCapture, true);
    document.addEventListener("focusin", handleFocusCapture, true);
    document.addEventListener("input", applyPhoneLoginCompatibility, true);
    window.addEventListener("popstate", applyPhoneLoginCompatibility);
    window.addEventListener("customer-auth-session-updated", applyPhoneLoginCompatibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("submit", handleSubmitCapture, true);
      document.removeEventListener("focusin", handleFocusCapture, true);
      document.removeEventListener("input", applyPhoneLoginCompatibility, true);
      window.removeEventListener("popstate", applyPhoneLoginCompatibility);
      window.removeEventListener("customer-auth-session-updated", applyPhoneLoginCompatibility);
    };
  }, []);

  return null;
}
