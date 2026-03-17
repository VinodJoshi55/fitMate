import React, { useState } from "react";

export default function Chatbot({ token }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm FitChat, your AI-powered chat assistant. How can I help you today?" },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
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
        body: JSON.stringify({ message: input }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry, I'm having trouble connecting." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 text-black">
      {isOpen ? (
        <div className="bg-white w-80 h-96 rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          <div className="bg-indigo-600 p-4 text-white font-bold flex justify-between">
            <span>FitChat</span>
            <button onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-2 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg ${m.role === "user" ? "bg-indigo-100 ml-auto" : "bg-gray-100 mr-auto"} max-w-[80%]`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="text-gray-400 italic text-xs">Thinking...</div>
            )}
          </div>
          <div className="p-3 border-t flex">
            <input
              className="flex-1 outline-none text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about exercises..."
            />
            <button
              onClick={handleSend}
              className="text-indigo-600 font-bold ml-2"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110"
        >
          <img
            src="/FitChat.jpeg"
            alt="Open Chat"
            className="w-12 h-12 object-cover transition-opacity group-hover:opacity-90"
          />
        </button>
      )}
    </div>
  );
}
