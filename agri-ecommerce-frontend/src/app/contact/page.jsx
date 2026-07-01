import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";

import { ContactSection } from "@/components/contact/contact-section";

export const metadata = {
  title: "Liên hệ | AgriMarket",
  description: "Gửi yêu cầu hỗ trợ, tư vấn sản phẩm hoặc góp ý cho AgriMarket.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f6faef] text-slate-950">
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-emerald-600 text-white shadow-sm">
              <Leaf className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-emerald-950">
                AgriMarket
              </p>
              <p className="hidden text-xs font-medium text-emerald-700 sm:block">
                Nông sản tươi từ nông trại
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-emerald-100 bg-white px-4 text-sm font-black text-emerald-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
          >
            <ArrowLeft className="size-4" />
            Trang chủ
          </Link>
        </div>
      </header>

      <ContactSection className="py-12" />
    </main>
  );
}
