import { useState, useRef, useEffect } from "react";
import { chatApi } from "../utils/api";
import { MessageCircle, X, Send, Bot, User, Sparkles } from "lucide-react";

const SUGGESTIONS = [
    "How many orders are there in total?",
    "What is the total revenue?",
    "How many orders are pending?",
    "What did Alice order?",
    "Show me all shipped orders",
];

const TypingIndicator = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", background: "rgba(26,26,38,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px 16px 16px 4px", maxWidth: "80px" }}>
        {[0, 1, 2].map((i) => (
            <span key={i} style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: "#6366F1",
                display: "inline-block",
                animation: "chatBounce 1.2s infinite ease-in-out",
                animationDelay: `${i * 0.2}s`,
            }} />
        ))}
    </div>
);

const BotAvatar = () => (
    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Bot size={14} color="#fff" />
    </div>
);

const UserAvatar = () => (
    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#0EA5E9,#6366F1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <User size={14} color="#fff" />
    </div>
);

export default function ChatWidget() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([
        { role: "bot", text: "👋 Hi! I'm your **Order Assistant** powered by Gemini AI.\n\nI can answer questions about your orders, status, revenue, and customers. Try asking me something!" }
    ]);
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const send = async (question) => {
        const q = (question || input).trim();
        if (!q || loading) return;

        setInput("");
        setMessages((prev) => [...prev, { role: "user", text: q }]);
        setLoading(true);

        try {
            const data = await chatApi.ask(q);
            setMessages((prev) => [...prev, { role: "bot", text: data.answer }]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { role: "bot", text: `⚠️ ${err.message || "Something went wrong. Please try again."}`, error: true },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    const renderText = (text) =>
        text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .split("\n")
            .map((line, i) => `<span key="${i}">${line}</span>`)
            .join("<br/>");

    const isFirstMessage = messages.length === 1;

    return (
        <>
            {/* Keyframes injected once */}
            <style>{`
        @keyframes chatBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes chatSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chat-msg { animation: chatFadeIn 0.25s ease-out both; }
        .chat-btn-fab { transition: transform 0.2s, box-shadow 0.2s; }
        .chat-btn-fab:hover { transform: scale(1.08); box-shadow: 0 8px 30px rgba(99,102,241,0.45) !important; }
        .chat-send:hover { background: #818CF8 !important; }
        .chat-sugg:hover { border-color: #6366F1 !important; color: #A5B4FC !important; background: rgba(99,102,241,0.12) !important; }
        .chat-input:focus { outline: none; border-color: #6366F1 !important; }
      `}</style>

            {/* Floating Action Button */}
            <button
                id="chat-widget-fab"
                className="chat-btn-fab"
                onClick={() => setOpen((o) => !o)}
                aria-label="Toggle chat assistant"
                style={{
                    position: "fixed", bottom: "28px", right: "28px", zIndex: 9999,
                    width: "56px", height: "56px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                    border: "none", cursor: "pointer", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
                }}
            >
                {open ? <X size={22} /> : <MessageCircle size={22} />}
            </button>

            {/* Chat Panel */}
            {open && (
                <div
                    id="chat-widget-panel"
                    style={{
                        position: "fixed", bottom: "96px", right: "28px", zIndex: 9998,
                        width: "360px", height: "520px",
                        background: "rgba(14,14,22,0.97)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(99,102,241,0.25)",
                        borderRadius: "20px",
                        display: "flex", flexDirection: "column",
                        boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                        animation: "chatSlideIn 0.25s ease-out both",
                        fontFamily: "'DM Sans', sans-serif",
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)",
                        display: "flex", alignItems: "center", gap: "10px",
                        background: "rgba(99,102,241,0.08)", borderRadius: "20px 20px 0 0",
                    }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Sparkles size={16} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "14px", color: "#F1F5F9" }}>Order Assistant</div>
                            <div style={{ fontSize: "11px", color: "#6366F1", display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
                                Powered by Gemini AI
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: "4px", borderRadius: "6px" }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        {messages.map((m, i) => (
                            <div key={i} className="chat-msg" style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                                {m.role === "bot" ? <BotAvatar /> : <UserAvatar />}
                                <div style={{
                                    maxWidth: "78%",
                                    padding: "10px 14px",
                                    borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                    background: m.role === "user"
                                        ? "linear-gradient(135deg,#6366F1,#8B5CF6)"
                                        : m.error ? "rgba(244,63,94,0.12)" : "rgba(26,26,38,0.9)",
                                    border: m.role === "user" ? "none" : m.error ? "1px solid rgba(244,63,94,0.3)" : "1px solid rgba(255,255,255,0.08)",
                                    color: "#F1F5F9",
                                    fontSize: "13px",
                                    lineHeight: "1.5",
                                }}>
                                    <span dangerouslySetInnerHTML={{ __html: renderText(m.text) }} />
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="chat-msg" style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                                <BotAvatar />
                                <TypingIndicator />
                            </div>
                        )}

                        {/* Suggested questions shown only when chat is fresh */}
                        {isFirstMessage && !loading && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                                <p style={{ fontSize: "11px", color: "#64748B", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Try asking…</p>
                                {SUGGESTIONS.map((s, i) => (
                                    <button
                                        key={i}
                                        className="chat-sugg"
                                        onClick={() => send(s)}
                                        style={{
                                            background: "rgba(99,102,241,0.07)",
                                            border: "1px solid rgba(99,102,241,0.2)",
                                            borderRadius: "10px",
                                            color: "#94A3B8",
                                            fontSize: "12px",
                                            padding: "8px 12px",
                                            cursor: "pointer",
                                            textAlign: "left",
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input bar */}
                    <div style={{
                        padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)",
                        display: "flex", gap: "8px", alignItems: "flex-end",
                    }}>
                        <textarea
                            ref={inputRef}
                            className="chat-input"
                            id="chat-input-box"
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder="Ask about orders, status, revenue…"
                            disabled={loading}
                            style={{
                                flex: 1,
                                background: "rgba(26,26,38,0.8)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "12px",
                                color: "#F1F5F9",
                                fontSize: "13px",
                                padding: "10px 14px",
                                resize: "none",
                                fontFamily: "inherit",
                                maxHeight: "80px",
                                overflowY: "auto",
                                transition: "border-color 0.2s",
                                lineHeight: "1.4",
                            }}
                        />
                        <button
                            id="chat-send-btn"
                            className="chat-send"
                            onClick={() => send()}
                            disabled={loading || !input.trim()}
                            style={{
                                width: "38px", height: "38px", borderRadius: "12px",
                                background: input.trim() && !loading ? "#6366F1" : "rgba(99,102,241,0.25)",
                                border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0, transition: "background 0.2s",
                            }}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
