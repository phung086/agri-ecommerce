"use client";

import AiChatWidget from "@/components/AiChatWidget";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CheckoutGuestPaymentCompatibility } from "@/components/checkout/checkout-guest-payment-compatibility";
import { CustomerOrderExperienceCompatibility } from "@/components/profile/customer-order-experience-compatibility";
import { ProfileLoginPhoneCompatibility } from "@/components/profile/profile-login-phone-compatibility";
import { LanguageProvider } from "@/i18n/language-provider";
import { LocalizedTextBoundary } from "@/i18n/localized-text-boundary";

export function I18nClientRoot({ children }) {
  return (
    <LanguageProvider>
      <LocalizedTextBoundary />
      <CheckoutGuestPaymentCompatibility />
      <CustomerOrderExperienceCompatibility />
      <ProfileLoginPhoneCompatibility />
      {children}
      <AiChatWidget />
      <LanguageSwitcher />
    </LanguageProvider>
  );
}
