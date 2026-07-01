"use client";

import { useRef, useState } from "react";
import { Mail, MessageCircle, Phone, Send, Truck } from "lucide-react";

import { formatNumber } from "@/lib/admin-utils";
import {
  PHONE_ERROR_MESSAGE,
  PHONE_PATTERN_SOURCE,
  isValidPhoneNumber,
} from "@/lib/phone-utils";
import { marketplaceService } from "@/services/marketplace.service";

const NAME_REGEX = /^[A-Za-zÀ-ỹ\s]{2,50}$/;
const PHONE_REGEX = /^0\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONTACT_ERRORS = {
  fullName: "Họ tên chỉ được chứa chữ cái và khoảng trắng.",
  phoneNumber: "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.",
  email: "Email không hợp lệ.",
  message: "Nội dung phải từ 10 đến 255 ký tự.",
};

function sanitizeFullName(value) {
  return value
    .replace(/[^A-Za-zÀ-ỹ\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s+/, "")
    .slice(0, 50);
}

function sanitizePhoneNumber(value) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function validateContactField(key, value) {
  const trimmedValue = value.trim();

  if (key === "fullName") {
    return NAME_REGEX.test(value) && value === trimmedValue
      ? ""
      : CONTACT_ERRORS.fullName;
  }

  if (key === "phoneNumber") {
    return PHONE_REGEX.test(value) ? "" : CONTACT_ERRORS.phoneNumber;
  }

  if (key === "email") {
    return EMAIL_REGEX.test(trimmedValue) ? "" : CONTACT_ERRORS.email;
  }

  if (key === "message") {
    return trimmedValue.length >= 10 && trimmedValue.length <= 255
      ? ""
      : CONTACT_ERRORS.message;
  }

  return "";
}

export function ContactSection({ className = "" }) {
  const fullNameRef = useRef(null);
  const phoneNumberRef = useRef(null);
  const emailRef = useRef(null);
  const messageRef = useRef(null);
  const [contactForm, setContactForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    message: "",
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactNotice, setContactNotice] = useState("");
  const [contactError, setContactError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    message: "",
  });

  function updateContactForm(key, value) {
    const nextValue =
      key === "fullName"
        ? sanitizeFullName(value)
        : key === "phoneNumber"
          ? sanitizePhoneNumber(value)
          : value;

    setContactForm((current) => ({
      ...current,
      [key]: nextValue,
    }));
    setFieldErrors((current) => ({
      ...current,
      [key]: validateContactField(key, nextValue),
    }));
  }

  function validateContactForm() {
    const nextErrors = {
      fullName: validateContactField("fullName", contactForm.fullName),
      phoneNumber: validateContactField("phoneNumber", contactForm.phoneNumber),
      email: validateContactField("email", contactForm.email),
      message: validateContactField("message", contactForm.message),
    };
    setFieldErrors(nextErrors);

    const firstInvalidField = [
      "fullName",
      "phoneNumber",
      "email",
      "message",
    ].find((key) => nextErrors[key]);

    if (firstInvalidField) {
      const refs = {
        fullName: fullNameRef,
        phoneNumber: phoneNumberRef,
        email: emailRef,
        message: messageRef,
      };
      refs[firstInvalidField].current?.focus();
      return false;
    }

    return true;
  }

  async function submitContactForm(event) {
    event.preventDefault();
    setContactNotice("");
    setContactError("");
    if (!validateContactForm()) return;

    const payload = {
      fullName: contactForm.fullName.trim(),
      phoneNumber: contactForm.phoneNumber.trim(),
      email: contactForm.email.trim(),
      message: contactForm.message.trim(),
    };


    setContactSubmitting(true);

    try {
      await marketplaceService.createContact(payload);
      setContactNotice(
        "Đã gửi liên hệ thành công. AgriMarket sẽ phản hồi bạn sớm nhất."
      );
      setContactForm({
        fullName: "",
        phoneNumber: "",
        email: "",
        message: "",
      });
      setFieldErrors({
        fullName: "",
        phoneNumber: "",
        email: "",
        message: "",
      });
    } catch (error) {
      setContactError(error?.message || "Không thể gửi liên hệ. Vui lòng thử lại.");
    } finally {
      setContactSubmitting(false);
    }
  }

  return (
    <section
      id="contact"
      className={`mx-auto grid w-full max-w-[1480px] gap-5 px-4 py-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 ${className}`}
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm font-black uppercase text-emerald-700">
            Liên hệ hỗ trợ
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950">
            Cần hỏi về cửa hàng hoặc sản phẩm?
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Gửi thông tin cho AgriMarket khi bạn cần tư vấn sản phẩm, giao
            hàng, đặt số lượng lớn hoặc có thắc mắc trong quá trình mua sắm.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[8px] border border-emerald-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,61,38,0.05)]">
            <div className="flex size-10 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700">
              <MessageCircle className="size-5" />
            </div>
            <p className="mt-3 text-sm font-black text-slate-950">
              Tư vấn sản phẩm
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Hỏi về nguồn gốc, giá, tồn kho và cách chọn món phù hợp.
            </p>
          </div>
          <div className="rounded-[8px] border border-emerald-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,61,38,0.05)]">
            <div className="flex size-10 items-center justify-center rounded-[8px] bg-sky-50 text-sky-700">
              <Truck className="size-5" />
            </div>
            <p className="mt-3 text-sm font-black text-slate-950">
              Hỗ trợ giao hàng
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Kiểm tra khu vực, thời gian giao và tình trạng đơn hàng.
            </p>
          </div>
          <div className="rounded-[8px] border border-emerald-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,61,38,0.05)]">
            <div className="flex size-10 items-center justify-center rounded-[8px] bg-rose-50 text-rose-600">
              <Mail className="size-5" />
            </div>
            <p className="mt-3 text-sm font-black text-slate-950">
              Phản hồi cửa hàng
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Gửi góp ý về trải nghiệm mua sắm hoặc chất lượng dịch vụ.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={submitContactForm}
        className="rounded-[8px] border border-emerald-100 bg-white p-4 shadow-[0_16px_42px_rgba(15,61,38,0.07)] sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">
              Họ tên
            </span>
            <input
              ref={fullNameRef}
              value={contactForm.fullName}
              onChange={(event) =>
                updateContactForm("fullName", event.target.value)
              }
              maxLength={50}
              required
              className={`mt-2 h-11 w-full rounded-[8px] border px-3 text-sm font-semibold outline-none transition focus:ring-4 ${
                fieldErrors.fullName
                  ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                  : "border-emerald-100 focus:border-emerald-400 focus:ring-emerald-100"
              }`}
              placeholder="Nguyễn Văn A"
            />
            {fieldErrors.fullName && (
              <p className="mt-1 text-xs font-semibold text-red-600">
                {fieldErrors.fullName}
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">
              Số điện thoại
            </span>
            <div className="relative mt-2">
              <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={phoneNumberRef}
                value={contactForm.phoneNumber}
                onChange={(event) =>
                  updateContactForm("phoneNumber", event.target.value)
                }
                inputMode="numeric"
                maxLength={10}
                className={`h-11 w-full rounded-[8px] border pl-9 pr-3 text-sm font-semibold outline-none transition focus:ring-4 ${
                  fieldErrors.phoneNumber
                    ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                    : "border-emerald-100 focus:border-emerald-400 focus:ring-emerald-100"
                }`}
                placeholder="090..."
              />
            </div>
            {fieldErrors.phoneNumber && (
              <p className="mt-1 text-xs font-semibold text-red-600">
                {fieldErrors.phoneNumber}
              </p>
            )}
          </label>

          <label className="block sm:col-span-2">
            <span className="text-xs font-black uppercase text-slate-500">
              Email
            </span>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={emailRef}
                value={contactForm.email}
                onChange={(event) => updateContactForm("email", event.target.value)}
                type="email"
                maxLength={255}
                className={`h-11 w-full rounded-[8px] border pl-9 pr-3 text-sm font-semibold outline-none transition focus:ring-4 ${
                  fieldErrors.email
                    ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                    : "border-emerald-100 focus:border-emerald-400 focus:ring-emerald-100"
                }`}
                placeholder="email@example.com"
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1 text-xs font-semibold text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </label>

          <label className="block sm:col-span-2">
            <span className="text-xs font-black uppercase text-slate-500">
              Nội dung
            </span>
            <textarea
              ref={messageRef}
              value={contactForm.message}
              onChange={(event) => updateContactForm("message", event.target.value)}
              maxLength={255}
              required
              rows={5}
              className={`mt-2 w-full resize-none rounded-[8px] border px-3 py-3 text-sm font-semibold leading-6 outline-none transition focus:ring-4 ${
                fieldErrors.message
                  ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                  : "border-emerald-100 focus:border-emerald-400 focus:ring-emerald-100"
              }`}
              placeholder="Tôi muốn hỏi về sản phẩm, giao hàng hoặc cửa hàng..."
            />
            {fieldErrors.message && (
              <p className="mt-1 text-xs font-semibold text-red-600">
                {fieldErrors.message}
              </p>
            )}
          </label>
        </div>

        {(contactNotice || contactError) && (
          <div
            className={`mt-4 rounded-[8px] border px-3 py-2 text-sm font-semibold ${
              contactError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {contactError || contactNotice}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-semibold text-slate-500">
            {formatNumber(contactForm.message.length)}/255 ký tự
          </span>
          <button
            type="submit"
            disabled={contactSubmitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Send className="size-4" />
            {contactSubmitting ? "Đang gửi..." : "Gửi liên hệ"}
          </button>
        </div>
      </form>
    </section>
  );
}
