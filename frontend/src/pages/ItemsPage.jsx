import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { api } from "../api/client.js";

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [currentChatItem, setCurrentChatItem] = useState(null);
  const [chatName, setChatName] = useState("Select an item to chat");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const socket = useMemo(() => io("/", { autoConnect: false, withCredentials: true }), []);

  const loadItems = useCallback(async () => {
    const data = await api.get(`/api/items?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}`);
    setItems(data.items || []);
  }, [q, type]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    socket.on("message", (payload) => {
      if (String(payload.item_id) === String(currentChatItem)) {
        setMessages((existing) => [...existing, { id: payload.id, sender_name: payload.sender, body: payload.body }]);
      }
    });
    return () => socket.off("message");
  }, [socket, currentChatItem]);

  async function claim(itemId) {
    const res = await api.post("/api/claim", { item_id: itemId });
    if (!res.ok) {
      alert(res.error || "Please login to claim.");
      return;
    }
    alert("Claim submitted. You can open chat now.");
    loadItems();
  }

  async function openChat(item) {
    const data = await api.get(`/api/chat/messages?item_id=${item.id}`);
    if (data.error) {
      alert(data.error);
      return;
    }
    setCurrentChatItem(item.id);
    setChatName(item.name);
    setMessages(data.messages || []);
    if (!socket.connected) socket.connect();
    socket.emit("join", { item_id: item.id });
  }

  async function sendChat() {
    if (!currentChatItem) return alert("Select an item to chat first.");
    const body = chatInput.trim();
    if (!body) return;
    const res = await api.post("/api/chat/messages", { item_id: currentChatItem, body });
    if (res.ok) {
      setChatInput("");
      setMessages((existing) => [...existing, { id: res.id || null, sender_name: "You", body }]);
    } else {
      alert(res.error || "Please login to chat.");
    }
  }

  async function report(messageId) {
    const reason = prompt("Report reason?") || "Reported";
    const res = await api.post("/api/chat/report", { message_id: messageId, reason });
    if (res.ok) alert("Report submitted.");
  }

  return (
    <section className="items">
      <div className="items-header">
        <h2>All Lost & Found Items</h2>
        <div className="items-controls">
          <input value={q} onChange={(event) => setQ(event.target.value)} type="text" placeholder="Search items..." />
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
          <button className="btn ghost" onClick={loadItems}>
            Search
          </button>
        </div>
      </div>

      <div className="items-layout">
        <div className="items-left">
          <div className="items-grid">
            {items.map((item) => (
              <div className="item-card" key={item.id}>
                <div className={`item-media ${item.imageUrl ? "has-photo" : "no-photo"}`}>
                  {item.imageUrl ? <img className="item-photo" src={item.imageUrl} alt="Lost Item" /> : null}
                  <div className="item-badge">{item.type.toUpperCase()}</div>
                </div>
                <div className="item-details">
                  <div className="item-title">{item.name}</div>
                  <div className="item-desc">{item.description || "No description"}</div>
                  <div className="item-contact">
                    Contact: {item.contact} {item.email ? `| ${item.email}` : ""}
                  </div>
                  <div className="item-actions">
                    <button className="btn ghost btn-claim" onClick={() => claim(item.id)}>
                      Belongs to me
                    </button>
                    {item.can_chat ? (
                      <button className="btn btn-chat" onClick={() => openChat(item)}>
                        Chat
                      </button>
                    ) : (
                      <span className="muted">{item.has_claim ? "Claim pending" : "Claim to enable chat"}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="items-right">
          {!currentChatItem ? (
            <div className="helper-card">
              <div className="helper-title">How to claim safely</div>
              <ul className="helper-list">
                <li>Open an item and click "Belongs to me".</li>
                <li>Wait for approval, then use chat to verify.</li>
                <li>Share identifiers (serials, photos) instead of personal info.</li>
                <li>Meet in public campus areas only.</li>
              </ul>
            </div>
          ) : (
            <div className="chat-panel">
              <div className="chat-header">
                <div>Chat</div>
                <div className="muted">{chatName}</div>
              </div>
              <div className="chat-messages">
                {messages.map((message) => (
                  <div className="chat-line" key={message.id || `${message.sender_name}-${message.body}`}>
                    <span className="muted">
                      {message.sender_name}: {message.body}
                    </span>
                    {message.id ? (
                      <button className="report-btn" onClick={() => report(message.id)}>
                        Report
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} type="text" placeholder="Type a message..." />
                <button className="btn" onClick={sendChat}>
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
