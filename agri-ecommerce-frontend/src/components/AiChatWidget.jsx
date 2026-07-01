"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Bot, Leaf, Loader2, MessageCircle, Send, X } from "lucide-react";
import { getAssetUrl } from "@/lib/admin-utils";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api"
).replace(/\/+$/, "");
const GUEST_TOKEN_KEY = "agrimarket_ai_guest_token";

const QUICK_PROMPTS = [
  "Gợi ý rau củ dưới 50k",
  "Hôm nay có cá gì tươi?",
  "Tư vấn giỏ hàng khoảng 100k",
];

function readGuestToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(GUEST_TOKEN_KEY);
}

function writeGuestToken(token) {
  if (typeof window === "undefined" || !token) {
    return;
  }
  localStorage.setItem(GUEST_TOKEN_KEY, token);
}

function MessageText({ text }) {
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {String(text || "")}
    </div>
  );
}

function SuggestedProduct({ product }) {
  const imageUrl = product.imageUrl ? getAssetUrl(product.imageUrl) : "";
  const productUrl = product.productUrl || `/products/${product.slug}`;

  return (
    <a
      href={productUrl}
      className="grid grid-cols-[44px_1fr] gap-2 rounded-md border border-emerald-100 bg-white p-2 text-left transition hover:border-emerald-300"
    >
      <div className="h-11 w-11 overflow-hidden rounded-md bg-emerald-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            width={44}
            height={44}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-emerald-700">
            <Leaf size={18} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-slate-950">
          {product.name}
        </p>
        <p className="text-xs font-semibold text-emerald-700">
          {Number(product.price || 0).toLocaleString("vi-VN")} đ
          {product.unit ? `/${product.unit}` : ""}
        </p>
        <p className="text-xs text-slate-500">
          Tồn kho: {product.stock ?? "N/A"}
        </p>
      </div>
    </a>
  );
}

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Xin chào, tôi có thể gợi ý nông sản theo nhu cầu, ngân sách và tình trạng còn hàng.",
      products: [],
    },
  ]);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const guestTokenRef = useRef(null);

  useEffect(() => {
    guestTokenRef.current = readGuestToken();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  async function sendMessage(rawMessage) {
    const message = rawMessage.trim();
    if (!message || loading) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: message, products: [] },
    ]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/public/ai-chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          guestToken: guestTokenRef.current || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Chat request failed");
      }

      const data = payload.data || {};
      if (data.guestToken && data.guestToken !== guestTokenRef.current) {
        guestTokenRef.current = data.guestToken;
        writeGuestToken(data.guestToken);
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text:
            data.reply ||
            "Tôi chưa có câu trả lời phù hợp. Bạn thử hỏi cụ thể hơn nhé.",
          products: data.suggestedProducts || [],
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Kết nối tư vấn đang gián đoạn. Bạn thử lại sau một chút nhé.",
          products: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
        aria-label={open ? "Đóng tư vấn AI" : "Mở tư vấn AI"}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <section
          className="fixed bottom-24 right-5 z-50 flex h-[560px] w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-2xl shadow-slate-950/20"
          aria-label="Tư vấn nông sản AI"
        >
          <header className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-700 px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <Bot size={19} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black">Tư vấn AgriMarket</h2>
              <p className="text-xs text-emerald-50">Gợi ý theo dữ liệu sản phẩm</p>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-3">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[86%] rounded-lg px-3 py-2 ${
                      isUser
                        ? "bg-emerald-700 text-white"
                        : "border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <MessageText text={message.text} />
                    {message.products?.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.products.slice(0, 3).map((product) => (
                          <SuggestedProduct
                            key={product.id}
                            product={product}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                  <Loader2 size={15} className="animate-spin" />
                  Đang trả lời
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3 py-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 border-t border-slate-100 p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(input);
                }
              }}
              maxLength={1000}
              rows={1}
              placeholder="Nhập nhu cầu của bạn"
              className="max-h-24 min-h-10 flex-1 resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Gửi tin nhắn"
            >
              <Send size={17} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
