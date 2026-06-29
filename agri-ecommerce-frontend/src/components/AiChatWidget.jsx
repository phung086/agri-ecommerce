"use client";
import { useEffect, useRef, useState } from "react";
import { getAssetUrl } from "@/lib/admin-utils";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const GUEST_TOKEN_KEY = "agri_chat_guest_token";

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GUEST_TOKEN_KEY);
}

function saveToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_TOKEN_KEY, token);
}

/**
 * Render markdown đơn giản: **bold**, dòng trống, danh sách
 */
function MarkdownText({ text }) {
  return (
    <div className="space-y-1">
      {text.split("\n").map((line, i) => {
        // Danh sách bullet
        if (line.trimStart().startsWith("- ") || line.trimStart().startsWith("* ")) {
          const content = line.replace(/^[\s\-\*]+/, "");
          const parts = content.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={i} className="flex items-start gap-1">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                {parts.map((p, j) =>
                  j % 2 === 1 ? <strong key={j}>{p}</strong> : <span key={j}>{p}</span>
                )}
              </span>
            </p>
          );
        }

        // Dòng trống
        if (line.trim() === "") return <div key={i} className="h-1" />;

        // Dòng thường với bold
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i}>
            {parts.map((p, j) =>
              j % 2 === 1 ? <strong key={j}>{p}</strong> : <span key={j}>{p}</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <a
      href={product.productUrl || `/products/${product.slug}`}
      className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-white p-2 text-sm shadow-sm hover:border-emerald-300 hover:shadow-md transition"
    >
      {product.imageUrl && (
        <img
          src={getAssetUrl(product.imageUrl)}
          alt={product.name}
          className="h-10 w-10 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-900 text-xs">{product.name}</p>
        <p className="text-xs text-emerald-700 font-semibold">
          {Number(product.price).toLocaleString("vi-VN")}đ
          {product.unit ? `/${product.unit}` : ""}
        </p>
        <p className="text-xs text-slate-400">Còn {product.stock ?? "?"}</p>
      </div>
      <svg
        className="h-4 w-4 shrink-0 text-slate-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}

const QUICK_QUESTIONS = [
  "Có rau gì ngon không?",
  "Trái cây dưới 50k?",
  "Gợi ý ngân sách 100k",
];

/**
 * AiChatWidget — Floating chat button + chat window
 *
 * Sử dụng: import vào layout.js hoặc page.js
 *   import AiChatWidget from "@/components/AiChatWidget";
 *   ...
 *   <AiChatWidget />
 *
 * Backend endpoint: POST /api/public/ai-chat/messages
 * Env: NEXT_PUBLIC_API_URL (default: http://localhost:8080)
 */
export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "bot",
      text: "Xin chào! 🌿 Tôi là trợ lý tư vấn **AgriMarket**.\nBạn cần tìm sản phẩm nông sản gì hôm nay?",
      products: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestToken, setGuestToken] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load guestToken từ localStorage
  useEffect(() => {
    const stored = getStoredToken();
    if (stored) setGuestToken(stored);
  }, []);

  // Focus input khi mở chat
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto scroll xuống cuối
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const trimmed = text?.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: trimmed, products: [] },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/public/ai-chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          guestToken: guestToken || undefined,
        }),
      });

      const json = await res.json();
      const data = json?.data || {};

      // Lưu guestToken mới nếu backend tạo
      if (data.guestToken && data.guestToken !== guestToken) {
        setGuestToken(data.guestToken);
        saveToken(data.guestToken);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          text: data.reply || "Xin lỗi, tôi chưa hiểu câu hỏi này. Bạn thử hỏi lại nhé?",
          products: data.suggestedProducts || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          text: "Xin lỗi, có lỗi kết nối. Vui lòng thử lại sau.",
          products: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const hasUserMessage = messages.some((m) => m.role === "user");

  return (
    <>
      {/* ===== FAB Button ===== */}
      <button
        id="ai-chat-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-700 hover:scale-110 active:scale-95 transition-all duration-200"
        aria-label={open ? "Đóng chat tư vấn" : "Mở chat tư vấn AI"}
        title="Tư vấn nông sản AI"
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            {/* Badge pulse */}
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-300" />
            </span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </>
        )}
      </button>

      {/* ===== Chat Window ===== */}
      {open && (
        <div
          id="ai-chat-window"
          role="dialog"
          aria-label="Chat tư vấn nông sản AI"
          className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 bg-emerald-600 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg">
              🌿
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white">Trợ lý AgriMarket</p>
              <p className="text-xs text-emerald-100">Tư vấn nông sản · Powered by AI</p>
            </div>
            <div className="ml-auto flex h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_0_2px_rgba(255,255,255,0.3)]" />
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "bot" && (
                  <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs">
                    🌿
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-md bg-emerald-600 text-white"
                      : "rounded-bl-md border border-slate-100 bg-slate-50 text-slate-800"
                  }`}
                >
                  {msg.role === "bot" ? (
                    <MarkdownText text={msg.text} />
                  ) : (
                    <p>{msg.text}</p>
                  )}

                  {/* Sản phẩm gợi ý */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        Sản phẩm gợi ý
                      </p>
                      {msg.products.slice(0, 3).map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-end justify-start gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs">
                  🌿
                </div>
                <div className="rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick questions (chỉ hiện khi chưa chat) */}
          {!hasUserMessage && (
            <div className="shrink-0 flex flex-wrap gap-1.5 px-4 pb-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="shrink-0 flex items-end gap-2 border-t border-slate-100 bg-white px-3 py-3">
            <textarea
              id="ai-chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi về sản phẩm nông sản..."
              rows={1}
              disabled={loading}
              maxLength={1000}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
              style={{ maxHeight: "80px" }}
            />
            <button
              id="ai-chat-send-btn"
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-40"
              aria-label="Gửi tin nhắn"
            >
              <svg className="h-4 w-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
