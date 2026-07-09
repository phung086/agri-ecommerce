"use client";

import { useEffect } from "react";

/**
 * Compatibility bridge for the existing profile login form.
 *
 * The profile page keeps its current component structure, while this bridge only
 * relaxes the login identifier input from email-only to text so default guest
 * accounts can log in by phone number + default password.
 */
export function ProfileLoginPhoneCompatibility() {
  useEffect(() => {
    function applyPhoneLoginCompatibility() {
      if (typeof window === "undefined" || window.location.pathname !== "/profile") {
        return;
      }

      const input = document.getElementById("login-email");
      if (input) {
        input.setAttribute("type", "text");
        input.setAttribute("inputmode", "text");
        input.setAttribute("autocomplete", "username");
        input.setAttribute("placeholder", "Email hoặc số điện thoại");
      }

      const label = document.querySelector('label[for="login-email"]');
      if (label && label.textContent?.trim() === "Địa chỉ email") {
        label.textContent = "Email hoặc số điện thoại";
      }
    }

    applyPhoneLoginCompatibility();

    const observer = new MutationObserver(applyPhoneLoginCompatibility);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("popstate", applyPhoneLoginCompatibility);
    window.addEventListener("customer-auth-session-updated", applyPhoneLoginCompatibility);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", applyPhoneLoginCompatibility);
      window.removeEventListener("customer-auth-session-updated", applyPhoneLoginCompatibility);
    };
  }, []);

  return null;
}
