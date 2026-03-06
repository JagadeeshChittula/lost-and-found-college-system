const api = {
  async post(url, data, isForm = false) {
    const res = await fetch(url, {
      method: "POST",
      headers: isForm ? {} : { "Content-Type": "application/json" },
      body: isForm ? data : JSON.stringify(data),
    });
    return res.json();
  },
  async get(url) {
    const res = await fetch(url);
    return res.json();
  },
};

const themeToggle = document.getElementById("themeToggle");
const themeStorageKey = "theme";

function getEffectiveTheme() {
  const stored = localStorage.getItem(themeStorageKey);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme, persist = false) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
  }
  if (persist) {
    localStorage.setItem(themeStorageKey, theme);
  }
  if (themeToggle) {
    const isDark = theme === "dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  }
}

if (themeToggle) {
  applyTheme(getEffectiveTheme());
  themeToggle.addEventListener("click", () => {
    const next = getEffectiveTheme() === "dark" ? "light" : "dark";
    applyTheme(next, true);
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!localStorage.getItem(themeStorageKey)) {
      applyTheme(getEffectiveTheme());
    }
  });
}

const lostForm = document.getElementById("lostForm");
const foundForm = document.getElementById("foundForm");
const lostStatus = document.getElementById("lostStatus");
const foundStatus = document.getElementById("foundStatus");

async function submitItem(form, statusEl, type) {
  const formData = new FormData(form);
  formData.append("type", type);
  const res = await api.post("/api/items", formData, true);
  if (res.ok) {
    statusEl.textContent = `${type} item submitted.`;
    form.reset();
  } else {
    statusEl.textContent = res.error || "Please login to submit.";
  }
}

if (lostForm) {
  lostForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitItem(lostForm, lostStatus, "lost");
  });
}

if (foundForm) {
  foundForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitItem(foundForm, foundStatus, "found");
  });
}

const itemsList = document.getElementById("itemsList");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const searchBtn = document.getElementById("searchBtn");

let currentChatItem = null;
let socket = null;

async function loadItems() {
  if (!itemsList) return;
  const q = searchInput ? searchInput.value.trim() : "";
  const type = typeFilter ? typeFilter.value : "all";
  const data = await api.get(`/api/items?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}`);
  itemsList.innerHTML = "";
  data.items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-media ${item.photo_path ? "has-photo" : "no-photo"}" style="${item.photo_path ? `background-image: url('${item.photo_path}')` : ""}">
        <div class="item-badge">${item.type.toUpperCase()}</div>
      </div>
      <div class="item-details">
        <div class="item-title">${item.name}</div>
        <div class="item-desc">${item.description || "No description"}</div>
        <div class="item-contact">Contact: ${item.contact} ${item.email ? `| ${item.email}` : ""}</div>
        <div class="item-actions">
          <button class="btn ghost btn-claim" data-claim="${item.id}" data-name="${item.name}">Belongs to me</button>
          ${item.can_chat ? `<button class="btn btn-chat" data-chat="${item.id}" data-name="${item.name}">Chat</button>` : `<span class="muted">${item.has_claim ? "Claim pending" : "Claim to enable chat"}</span>`}
        </div>
      </div>
    `;
    itemsList.appendChild(card);
  });
}

if (searchBtn) {
  searchBtn.addEventListener("click", loadItems);
  typeFilter.addEventListener("change", loadItems);
  loadItems();
}

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatItemName = document.getElementById("chatItemName");
const chatPanel = document.getElementById("chatPanel");
const chatHelper = document.getElementById("chatHelper");

function ensureSocket() {
  if (!socket) {
    if (typeof io !== "function") {
      return;
    }
    socket = io();
    socket.on("message", (payload) => {
      if (String(payload.item_id) === String(currentChatItem)) {
        appendMessage(payload.id, payload.sender, payload.body);
      }
    });
  }
}

function appendMessage(id, sender, body) {
  const wrap = document.createElement("div");
  wrap.className = "chat-line";
  wrap.innerHTML = `
    <span class="muted">${sender}: ${body}</span>
    ${id ? `<button class="report-btn" data-report="${id}">Report</button>` : ""}
  `;
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function openChat(itemId, itemName) {
  currentChatItem = itemId;
  if (chatPanel) {
    chatPanel.classList.remove("is-hidden");
  }
  if (chatHelper) {
    chatHelper.classList.add("is-hidden");
  }
  if (chatItemName) chatItemName.textContent = itemName;
  chatMessages.innerHTML = "";
  const data = await api.get(`/api/chat/messages?item_id=${itemId}`);
  if (data.error) {
    alert(data.error);
    return;
  }
  data.messages.forEach((m) => appendMessage(m.id, m.sender_name, m.body));
  ensureSocket();
  socket.emit("join", { item_id: itemId });
}

if (itemsList) {
  itemsList.addEventListener("click", async (e) => {
    const claimBtn = e.target.closest("button[data-claim]");
    const chatBtn = e.target.closest("button[data-chat]");
    if (claimBtn) {
      const itemId = claimBtn.getAttribute("data-claim");
      const res = await api.post("/api/claim", { item_id: itemId });
      if (!res.ok) {
        alert(res.error || "Please login to claim.");
        return;
      }
      alert("Claim submitted. You can open chat now.");
    }
    if (chatBtn) {
      const itemId = chatBtn.getAttribute("data-chat");
      const itemName = chatBtn.getAttribute("data-name");
      openChat(itemId, itemName);
    }
  });
}

if (chatMessages) {
  chatMessages.addEventListener("click", async (e) => {
    const reportBtn = e.target.closest("button[data-report]");
    if (!reportBtn) return;
    const messageId = reportBtn.getAttribute("data-report");
    const reason = prompt("Report reason?") || "Reported";
    const res = await api.post("/api/chat/report", { message_id: messageId, reason });
    if (res.ok) alert("Report submitted.");
  });
}

if (chatSend) {
  chatSend.addEventListener("click", async () => {
    if (!currentChatItem) {
      alert("Select an item to chat first.");
      return;
    }
    const body = chatInput.value.trim();
    if (!body) return;
    const res = await api.post("/api/chat/messages", { item_id: currentChatItem, body });
    if (res.ok) {
      chatInput.value = "";
      appendMessage(res.id || null, "You", body);
    } else {
      alert(res.error || "Please login to chat.");
    }
  });
}

const fileInputs = document.querySelectorAll(".file-input");
fileInputs.forEach((input) => {
  input.addEventListener("change", () => {
    const nameEl = input.parentElement?.querySelector(".file-name");
    if (!nameEl) return;
    const fileName = input.files && input.files.length ? input.files[0].name : "";
    nameEl.textContent = fileName || nameEl.getAttribute("data-empty") || "No file chosen";
  });
});
