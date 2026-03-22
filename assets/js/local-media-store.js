const LOCAL_MEDIA_DB_NAME = "exrplones-local-media-db";
const LOCAL_MEDIA_STORE_NAME = "media-files";
const LOCAL_MEDIA_REF_PREFIX = "media://";
const localMediaUrlCache = new Map();

let localMediaDbPromise = null;

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function sanitizeMediaName(name) {
  return String(name || "media")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "media";
}

function createMediaRef(file, scope = "asset") {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `${LOCAL_MEDIA_REF_PREFIX}${scope}/${stamp}-${random}-${sanitizeMediaName(file?.name)}`;
}

function isLocalMediaRef(source) {
  return String(source || "").startsWith(LOCAL_MEDIA_REF_PREFIX);
}

function openLocalMediaDb() {
  if (!canUseIndexedDb()) {
    return Promise.reject(new Error("IndexedDB tidak tersedia."));
  }

  if (!localMediaDbPromise) {
    localMediaDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(LOCAL_MEDIA_DB_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(LOCAL_MEDIA_STORE_NAME)) {
          database.createObjectStore(LOCAL_MEDIA_STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error("Gagal membuka database media lokal."));
      };
    });
  }

  return localMediaDbPromise;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result || ""));
    };
    reader.onerror = () => {
      reject(reader.error || new Error("Gagal membaca file."));
    };
    reader.readAsDataURL(file);
  });
}

async function saveLocalMediaFile(file, options = {}) {
  if (!(file instanceof Blob)) {
    return "";
  }

  const ref = options.ref && isLocalMediaRef(options.ref)
    ? options.ref
    : createMediaRef(file, options.scope);

  try {
    const database = await openLocalMediaDb();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(LOCAL_MEDIA_STORE_NAME, "readwrite");
      const store = transaction.objectStore(LOCAL_MEDIA_STORE_NAME);
      store.put({
        id: ref,
        blob: file,
        name: file.name || "media",
        type: file.type || "",
        size: Number(file.size) || 0,
        updatedAt: Date.now(),
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Gagal menyimpan file."));
      transaction.onabort = () => reject(transaction.error || new Error("Penyimpanan file dibatalkan."));
    });

    return ref;
  } catch (error) {
    return readFileAsDataUrl(file);
  }
}

async function readLocalMediaEntry(ref) {
  if (!isLocalMediaRef(ref)) {
    return null;
  }

  const database = await openLocalMediaDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LOCAL_MEDIA_STORE_NAME, "readonly");
    const store = transaction.objectStore(LOCAL_MEDIA_STORE_NAME);
    const request = store.get(ref);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Gagal membaca media lokal."));
  });
}

async function resolveLocalMediaSource(source) {
  const value = String(source || "").trim();
  if (!value) {
    return "";
  }

  if (!isLocalMediaRef(value)) {
    return value;
  }

  if (localMediaUrlCache.has(value)) {
    return localMediaUrlCache.get(value);
  }

  try {
    const entry = await readLocalMediaEntry(value);
    if (!entry?.blob) {
      return "";
    }

    const objectUrl = URL.createObjectURL(entry.blob);
    localMediaUrlCache.set(value, objectUrl);
    return objectUrl;
  } catch (error) {
    return "";
  }
}

async function deleteLocalMediaSource(source) {
  const value = String(source || "").trim();
  if (!isLocalMediaRef(value)) {
    return;
  }

  const cachedUrl = localMediaUrlCache.get(value);
  if (cachedUrl) {
    URL.revokeObjectURL(cachedUrl);
    localMediaUrlCache.delete(value);
  }

  try {
    const database = await openLocalMediaDb();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(LOCAL_MEDIA_STORE_NAME, "readwrite");
      const store = transaction.objectStore(LOCAL_MEDIA_STORE_NAME);
      store.delete(value);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error || new Error("Gagal menghapus media lokal."));
      transaction.onabort = () =>
        reject(transaction.error || new Error("Penghapusan media lokal dibatalkan."));
    });
  } catch (error) {
    // noop
  }
}

window.EXRPLONES_LOCAL_MEDIA = {
  LOCAL_MEDIA_REF_PREFIX,
  isLocalMediaRef,
  saveFile: saveLocalMediaFile,
  resolveSource: resolveLocalMediaSource,
  deleteSource: deleteLocalMediaSource,
};
