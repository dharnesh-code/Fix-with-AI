import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../api";

export default function ChatWindow({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      const { reply } = await sendChatMessage(sessionId, text);
      setMessages((prev) => [...prev, { role: "model", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "model", content: "Sorry, that follow-up couldn't be sent. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="blueprint-frame chat-panel">
      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-empty">Ask a follow-up — e.g. "what if the leak continues?"</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {sending && <div className="chat-bubble model">Thinking…</div>}
      </div>
      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type a follow-up question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={!input.trim() || sending}>
          Send
        </button>
      </form>
    </div>
  );
}
