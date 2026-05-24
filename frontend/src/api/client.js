const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 45000;

function apiUrl(path) {
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) {
    return { error: "empty_response", message: "Server returned an empty response. Please try again." };
  }
  try {
    return JSON.parse(text);
  } catch (_err) {
    if (res.status >= 502 && res.status <= 504) {
      return {
        error: "server_waking",
        message: "Server is starting up (this can take up to a minute on free hosting). Wait and try again."
      };
    }
    return {
      error: "invalid_response",
      message: `Unexpected server response (${res.status}). Please try again.`
    };
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      return {
        error: "timeout",
        message: "Request timed out. The server may be waking up — wait a moment and try again."
      };
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return {
        error: "offline",
        message: "You appear to be offline. Check your internet connection."
      };
    }
    return {
      error: "backend_unreachable",
      message:
        import.meta.env.DEV
          ? "Backend not reachable. Run `npm run dev` from the project root (starts frontend and backend)."
          : "Cannot reach the server. On free hosting it may be sleeping — refresh, wait 30–60 seconds, then try again."
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request(method, path, data, isForm = false) {
  const url = apiUrl(path);
  const options = {
    method,
    credentials: "include"
  };

  if (method !== "GET" && data !== undefined) {
    if (isForm) {
      options.body = data;
    } else {
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(data);
    }
  }

  const result = await fetchWithTimeout(url, options);
  if (result?.error) return result;

  const json = await parseJsonResponse(result);
  if (!result.ok) json.__status = result.status;
  return json;
}

export const api = {
  get(url) {
    return request("GET", url);
  },
  post(url, data, isForm = false) {
    return request("POST", url, data, isForm);
  }
};
