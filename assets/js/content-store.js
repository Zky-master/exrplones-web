const CONTENT_STORAGE_KEYS = {
  projects: "exrplones-projects-data",
  gallery: "exrplones-gallery-data",
  events: "exrplones-events-data",
  about: "exrplones-about-data",
};
const localMediaStore = window.EXRPLONES_LOCAL_MEDIA;

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeProject(project, index) {
  const id = Number(project?.id);
  return {
    id: Number.isFinite(id) && id > 0 ? id : index + 1,
    title: normalizeText(project?.title) || `Project ${index + 1}`,
    description: normalizeText(project?.description),
    summary: normalizeText(project?.summary),
    overview: normalizeText(project?.overview),
    category: normalizeText(project?.category) || "Project",
    status: normalizeText(project?.status) || "Draft",
    year: normalizeText(project?.year) || String(new Date().getFullYear()),
    tech: normalizeArray(project?.tech),
    features: normalizeArray(project?.features),
    image: normalizeText(project?.image) || "assets/images/projects/placeholder.svg",
  };
}

async function hydrateProjectMedia(project) {
  const image = normalizeText(project?.image);
  const resolvedImage = localMediaStore
    ? await localMediaStore.resolveSource(image)
    : image;

  return {
    ...project,
    image_url: resolvedImage || image || "assets/images/projects/placeholder.svg",
  };
}

function deriveFilename(source, fallbackTitle) {
  const raw = normalizeText(source);
  if (raw) {
    const parts = raw.split("/");
    return parts[parts.length - 1];
  }

  return normalizeText(fallbackTitle) || "media";
}

function normalizeGalleryItem(item, index) {
  const id = Number(item?.id);
  const source = normalizeText(item?.source);
  const title = normalizeText(item?.title);
  const type = normalizeText(item?.type).toLowerCase() === "video" ? "video" : "photo";
  return {
    id: Number.isFinite(id) && id > 0 ? id : index + 1,
    title: title || deriveFilename(source, `Media ${index + 1}`),
    filename: normalizeText(item?.filename) || deriveFilename(source, title),
    type,
    source,
    date: normalizeText(item?.date),
  };
}

async function hydrateGalleryMedia(item) {
  const source = normalizeText(item?.source);
  const resolvedSource = localMediaStore
    ? await localMediaStore.resolveSource(source)
    : source;

  return {
    ...item,
    source_url: resolvedSource || source,
  };
}

function normalizeEventItem(item, index) {
  const id = Number(item?.id);
  return {
    id: Number.isFinite(id) && id > 0 ? id : index + 1,
    title: normalizeText(item?.title) || `Kegiatan ${index + 1}`,
    date: normalizeText(item?.date),
    time: normalizeText(item?.time),
    location: normalizeText(item?.location),
    status: normalizeText(item?.status) || "Terjadwal",
    description: normalizeText(item?.description),
  };
}

function normalizeAboutContent(content) {
  return {
    eyebrow: normalizeText(content?.eyebrow) || "Tentang Angkatan",
    title: normalizeText(content?.title),
    lead: normalizeText(content?.lead),
    body_title: normalizeText(content?.body_title),
    body_text: normalizeText(content?.body_text),
  };
}

function parseStoredContent(key, normalizer, isCollection = true) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (isCollection) {
      if (!Array.isArray(parsed)) {
        return null;
      }

      return parsed.map(normalizer);
    }

    return normalizer(parsed);
  } catch (error) {
    return null;
  }
}

async function fetchCollectionDefault(url, normalizer) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal memuat ${url}`);
  }

  const parsed = await response.json();
  return Array.isArray(parsed) ? parsed.map(normalizer) : [];
}

async function fetchSingleDefault(url, normalizer) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal memuat ${url}`);
  }

  return normalizer(await response.json());
}

async function loadCollectionContent(kind, url, normalizer) {
  const stored = parseStoredContent(CONTENT_STORAGE_KEYS[kind], normalizer, true);
  if (stored) {
    return stored;
  }

  return fetchCollectionDefault(url, normalizer);
}

async function loadHydratedCollectionContent(kind, url, normalizer, hydrator) {
  const items = await loadCollectionContent(kind, url, normalizer);
  return hydrator ? Promise.all(items.map(hydrator)) : items;
}

async function loadSingleContent(kind, url, normalizer) {
  const stored = parseStoredContent(CONTENT_STORAGE_KEYS[kind], normalizer, false);
  if (stored) {
    return stored;
  }

  return fetchSingleDefault(url, normalizer);
}

function saveCollectionContent(kind, items, normalizer) {
  const normalized = Array.isArray(items) ? items.map(normalizer) : [];
  window.localStorage.setItem(CONTENT_STORAGE_KEYS[kind], JSON.stringify(normalized));
  return normalized;
}

function saveSingleContent(kind, item, normalizer) {
  const normalized = normalizer(item || {});
  window.localStorage.setItem(CONTENT_STORAGE_KEYS[kind], JSON.stringify(normalized));
  return normalized;
}

function clearContent(kind) {
  window.localStorage.removeItem(CONTENT_STORAGE_KEYS[kind]);
}

window.EXRPLONES_CONTENT_STORE = {
  CONTENT_STORAGE_KEYS,
  normalizeProject,
  normalizeGalleryItem,
  normalizeEventItem,
  normalizeAboutContent,
  loadProjects: (url) =>
    loadHydratedCollectionContent("projects", url, normalizeProject, hydrateProjectMedia),
  saveProjects: (items) => saveCollectionContent("projects", items, normalizeProject),
  clearProjects: () => clearContent("projects"),
  loadGallery: (url) =>
    loadHydratedCollectionContent("gallery", url, normalizeGalleryItem, hydrateGalleryMedia),
  saveGallery: (items) => saveCollectionContent("gallery", items, normalizeGalleryItem),
  clearGallery: () => clearContent("gallery"),
  loadEvents: (url) => loadCollectionContent("events", url, normalizeEventItem),
  saveEvents: (items) => saveCollectionContent("events", items, normalizeEventItem),
  clearEvents: () => clearContent("events"),
  loadAbout: (url) => loadSingleContent("about", url, normalizeAboutContent),
  saveAbout: (item) => saveSingleContent("about", item, normalizeAboutContent),
  clearAbout: () => clearContent("about"),
};
