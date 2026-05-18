import React, { useState, useEffect, useRef } from "react";
import { Send, X, Minus } from "lucide-react";

// ── Lightweight markdown renderer ─────────────────────────────────────────────
// Handles: **bold**, *italic*, bullet lists (- / *), numbered lists, blank-line paragraphs
function MarkdownMessage({ text }) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines between blocks
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Bullet list block
    if (/^[-*]\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-0.5 my-1 pl-1">
          {items.map((item, j) => (
            <li key={j} className="text-[13px] leading-snug">
              {inlineFormat(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list block
    if (/^\d+\.\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-0.5 my-1 pl-1">
          {items.map((item, j) => (
            <li key={j} className="text-[13px] leading-snug">
              {inlineFormat(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Regular paragraph line
    elements.push(
      <p key={i} className="text-[13px] leading-snug">
        {inlineFormat(line)}
      </p>,
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

// Converts **bold** and *italic* inline
function inlineFormat(text) {
  const parts = [];
  // Split on **bold** and *italic* tokens
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[0].startsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-gray-900">
          {match[2]}
        </strong>,
      );
    } else {
      parts.push(
        <em key={match.index} className="italic">
          {match[3]}
        </em>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

// ── Chatbot ───────────────────────────────────────────────────────────────────
export default function Chatbot({ token }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I'm **FitChat**, your AI fitness assistant.\n\nHow can I help you?\n ",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Sorry, I'm having trouble connecting. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-white w-[340px] h-[480px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/40">
                <img
                  src="/FitChat.jpeg"
                  alt="FitChat"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">
                  FitChat
                </p>
                <p className="text-indigo-200 text-[10px] mt-0.5">
                  AI Fitness Assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 px-3 py-3 overflow-y-auto space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "bot" && (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-0.5 border border-indigo-100">
                    <img
                      src="/FitChat.jpeg"
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[82%] text-gray-700 shadow-sm
                  ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-white border border-gray-100 rounded-bl-sm"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="text-[13px] leading-snug">{m.text}</p>
                  ) : (
                    <MarkdownMessage text={m.text} />
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-0.5 border border-indigo-100">
                  <img
                    src="/FitChat.jpeg"
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <input
                className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSend()
                }
                placeholder="Ask about workouts, nutrition..."
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="w-7 h-7 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded-full shadow-lg transition-transform hover:scale-110"
        >
          <img
            src="/FitChat.jpeg"
            alt="Open Chat"
            className="w-14 h-14 object-cover rounded-full"
          />
        </button>
      )}
    </div>
  );
}
