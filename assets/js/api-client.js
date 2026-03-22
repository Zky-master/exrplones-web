function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function joinApiUrl(base, path) {
  const normalizedBase = normalizeApiBase(base);
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}

function getApiCandidates() {
  const runtimeBase = normalizeApiBase(window.EXRPLONES_RUNTIME_CONFIG?.apiBaseUrl);
  const candidates = [];

  if (runtimeBase) {
    candidates.push(runtimeBase);
  }

  if (window.location?.origin && /^https?:/i.test(window.location.origin)) {
    candidates.push("");
  }

  return [...new Set(candidates)];
}

let detectedApiBasePromise = null;

async function detectApiBase() {
  if (!detectedApiBasePromise) {
    detectedApiBasePromise = (async () => {
      for (const candidate of getApiCandidates()) {
        try {
          const response = await fetch(joinApiUrl(candidate, "/api/health"), {
            method: "GET",
            credentials: "include",
          });
          if (response.ok) {
            return candidate;
          }
        } catch (error) {
          // noop
        }
      }

      return null;
    })();
  }

  return detectedApiBasePromise;
}

async function hasBackend() {
  return (await detectApiBase()) !== null;
}

async function requestApi(path, options = {}) {
  const apiBase = await detectApiBase();
  if (apiBase === null) {
    throw new Error("Backend API belum aktif.");
  }

  const response = await fetch(joinApiUrl(apiBase, path), {
    credentials: "include",
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : null;

  if (!response.ok) {
    throw new Error(payload?.error || `Request API gagal (${response.status}).`);
  }

  return payload;
}

async function getContent(kind) {
  const payload = await requestApi(`/api/content/${kind}`);
  return payload?.data;
}

async function saveContent(kind, data) {
  const payload = await requestApi(`/api/content/${kind}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
  });
  return payload?.data;
}

async function resetContent(kind) {
  const payload = await requestApi(`/api/content/${kind}/reset`, {
    method: "POST",
  });
  return payload?.data;
}

async function uploadMedia(file, scope = "misc") {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("scope", scope);

  return requestApi("/api/uploads", {
    method: "POST",
    body: formData,
  });
}

async function login(username, password) {
  return requestApi("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
}

async function logout() {
  return requestApi("/api/auth/logout", {
    method: "POST",
  });
}

async function getSession() {
  return requestApi("/api/auth/session");
}

window.EXRPLONES_API = {
  hasBackend,
  getContent,
  saveContent,
  resetContent,
  uploadMedia,
  login,
  logout,
  getSession,
};
