export const api = {
  async get(url) {
    try {
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    } catch (_err) {
      return { error: "backend_unreachable", message: "Backend server is not running or cannot be reached." };
    }
  },
  async post(url, data, isForm = false) {
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: isForm ? {} : { "Content-Type": "application/json" },
        body: isForm ? data : JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) json.__status = res.status;
      return json;
    } catch (_err) {
      return { error: "backend_unreachable", message: "Backend server is not running or cannot be reached." };
    }
  }
};
