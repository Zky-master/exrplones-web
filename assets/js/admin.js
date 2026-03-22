const ADMIN_SESSION_KEY = "exrplones-admin-session-v2";
const ADMIN_CREDENTIALS = {
  username: "exrplones_admin",
  password: "XRpl#Team2025",
};
const ADMIN_DATA_PATHS = {
  members: "../data/members.json",
  projects: "../data/projects.json",
  gallery: "../data/gallery.json",
  events: "../data/events.json",
  about: "../data/about.json",
};
const membersStore = window.EXRPLONES_MEMBERS_STORE;
const contentStore = window.EXRPLONES_CONTENT_STORE;
const localMediaStore = window.EXRPLONES_LOCAL_MEDIA;
const adminMediaManagers = {
  memberPhoto: null,
  projectImage: null,
  gallerySource: null,
};

function getAdminPage() {
  return document.body.dataset.adminPage;
}

function isLoggedIn() {
  return window.localStorage.getItem(ADMIN_SESSION_KEY) === "active";
}

function requireAdminLogin() {
  if (getAdminPage() !== "login" && !isLoggedIn()) {
    window.location.href = "login.html";
  }
}

function initAdminLogout() {
  document.querySelectorAll("[data-admin-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      window.location.href = "login.html";
    });
  });
}

function initAdminLogin() {
  const form = document.querySelector("[data-admin-login]");
  if (!form) {
    return;
  }

  if (isLoggedIn()) {
    window.location.href = "dashboard.html";
    return;
  }

  const errorNode = document.querySelector("[data-admin-error]");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "").trim();

    if (
      username === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, "active");
      window.location.href = "dashboard.html";
      return;
    }

    if (errorNode) {
      errorNode.hidden = false;
      errorNode.textContent = "Username atau password belum sesuai.";
    }
  });
}

async function fetchAdminData(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Gagal memuat ${path}`);
  }

  return response.json();
}

function getNextId(items) {
  return items.length ? Math.max(...items.map((item) => Number(item.id) || 0)) + 1 : 1;
}

function parseListField(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSourceBasename(source) {
  const value = String(source || "").trim();
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\\/g, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1];
}

function guessMediaKind(source, fallback = "image") {
  const value = String(source || "").trim().toLowerCase();
  if (!value) {
    return fallback;
  }

  if (value.startsWith("data:video/")) {
    return "video";
  }

  if (value.startsWith("data:image/")) {
    return "image";
  }

  if (/\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/.test(value)) {
    return "video";
  }

  return "image";
}

function setUploadStatus(node, text, tone = "") {
  if (!node) {
    return;
  }

  node.textContent = text;
  if (tone) {
    node.dataset.tone = tone;
  } else {
    delete node.dataset.tone;
  }
}

function renderUploadPlaceholder(node, title, description) {
  if (!node) {
    return;
  }

  node.innerHTML = `
    <div class="admin-upload__placeholder">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(description)}</span>
    </div>
  `;
}

function renderUploadPreview(node, source, kind, label) {
  if (!node) {
    return;
  }

  if (!source) {
    renderUploadPlaceholder(
      node,
      kind === "video" ? "Belum ada video" : "Belum ada gambar",
      "Pilih file dari perangkat atau isi path media secara manual.",
    );
    return;
  }

  if (kind === "video") {
    node.innerHTML = `
      <video controls playsinline preload="metadata">
        <source src="${escapeHtml(source)}" />
      </video>
    `;
    return;
  }

  node.innerHTML = `
    <img src="${escapeHtml(source)}" alt="${escapeHtml(label || "Preview media")}" />
  `;
}

function cleanupSourceLabel(field, source) {
  if (field && !field.value.trim()) {
    field.value = getSourceBasename(source);
  }
}

function createMediaPicker(form, options) {
  if (!form) {
    return null;
  }

  const sourceField = form.elements[options.sourceField];
  const fileField = form.elements[options.fileField];
  const labelField = options.labelField ? form.elements[options.labelField] : null;
  const typeField = options.typeField ? form.elements[options.typeField] : null;
  const previewNode = form.querySelector(options.previewSelector);
  const statusNode = form.querySelector(options.statusSelector);

  if (!sourceField || !fileField || !previewNode) {
    return null;
  }

  const currentKind = () => {
    if (typeField) {
      return String(typeField.value || "").toLowerCase() === "video" ? "video" : "image";
    }

    return options.defaultKind || "image";
  };

  const syncPreview = async (source = sourceField.value) => {
    const resolvedSource = localMediaStore
      ? await localMediaStore.resolveSource(source)
      : String(source || "").trim();
    renderUploadPreview(
      previewNode,
      resolvedSource || "",
      guessMediaKind(resolvedSource || source, currentKind()),
      labelField?.value || getSourceBasename(source),
    );
  };

  const syncStatus = (source = sourceField.value) => {
    const value = String(source || "").trim();
    if (!value) {
      setUploadStatus(statusNode, options.emptyMessage, "");
      return;
    }

    if (localMediaStore?.isLocalMediaRef(value)) {
      setUploadStatus(statusNode, "File tersimpan lokal di browser ini.", "success");
      return;
    }

    if (value.startsWith("data:")) {
      setUploadStatus(statusNode, "File tersimpan sebagai data lokal.", "success");
      return;
    }

    setUploadStatus(statusNode, "Media memakai path atau URL manual.", "");
  };

  const syncAll = async (source = sourceField.value, preserveLabel = true) => {
    const value = String(source || "").trim();
    if (!preserveLabel && labelField) {
      labelField.value = "";
    }
    cleanupSourceLabel(labelField, value);
    await syncPreview(value);
    syncStatus(value);
  };

  fileField.addEventListener("change", async () => {
    const file = fileField.files?.[0];
    if (!file) {
      await syncAll(sourceField.value);
      return;
    }

    const pickedKind = file.type.startsWith("video/") ? "video" : "image";
    if (typeField) {
      typeField.value = pickedKind === "video" ? "video" : "photo";
    }

    try {
      const storedSource = localMediaStore
        ? await localMediaStore.saveFile(file, { scope: options.scope })
        : "";
      sourceField.value = storedSource;
      if (labelField) {
        labelField.value = file.name || "";
      }
      await syncAll(storedSource);
      setUploadStatus(statusNode, `${file.name} siap dipakai dari browser ini.`, "success");
    } catch (error) {
      setUploadStatus(statusNode, "File belum bisa diproses. Coba pilih ulang.", "error");
    }
  });

  sourceField.addEventListener("input", async () => {
    if (labelField && !fileField.files?.length) {
      labelField.value = getSourceBasename(sourceField.value);
    }
    await syncAll(sourceField.value);
  });

  typeField?.addEventListener("change", async () => {
    await syncAll(sourceField.value);
  });

  return {
    async reset(defaultSource = "") {
      if (fileField) {
        fileField.value = "";
      }
      sourceField.value = defaultSource;
      if (labelField) {
        labelField.value = getSourceBasename(defaultSource);
      }
      await syncAll(defaultSource);
    },
    async fill(source, label = "") {
      if (fileField) {
        fileField.value = "";
      }
      sourceField.value = source || "";
      if (labelField) {
        labelField.value = label || getSourceBasename(source);
      }
      await syncAll(source || "");
    },
  };
}

function getFormIdField(form) {
  return form?.elements?.item_id || form?.elements?.member_id || null;
}

function setFormItemId(form, value = "") {
  const field = getFormIdField(form);
  if (field) {
    field.value = String(value);
  }
}

function getFormItemId(form) {
  return Number(getFormIdField(form)?.value || 0);
}

function getSubmittedItemId(formData) {
  return Number(formData.get("item_id") || formData.get("member_id") || 0);
}

function setSubmitLabel(selector, text) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = text;
  }
}

function resetCollectionForm(form, defaults, submitLabelSelector, addLabel) {
  form.reset();
  setFormItemId(form);

  Object.entries(defaults || {}).forEach(([name, value]) => {
    if (form.elements[name]) {
      form.elements[name].value = value;
    }
  });

  if (submitLabelSelector && addLabel) {
    setSubmitLabel(submitLabelSelector, addLabel);
  }
}

function initAdminMediaManagers() {
  const memberForm = document.querySelector("[data-admin-member-form]");
  if (memberForm) {
    adminMediaManagers.memberPhoto = createMediaPicker(memberForm, {
      sourceField: "photo",
      fileField: "photo_file",
      previewSelector: "[data-admin-member-photo-preview]",
      statusSelector: "[data-admin-member-photo-status]",
      scope: "members",
      defaultKind: "image",
      emptyMessage: "Belum ada foto yang dipilih.",
    });
  }

  const projectForm = document.querySelector("[data-admin-project-form]");
  if (projectForm) {
    adminMediaManagers.projectImage = createMediaPicker(projectForm, {
      sourceField: "image",
      fileField: "image_file",
      previewSelector: "[data-admin-project-image-preview]",
      statusSelector: "[data-admin-project-image-status]",
      scope: "projects",
      defaultKind: "image",
      emptyMessage: "Belum ada gambar yang dipilih.",
    });
  }

  const galleryForm = document.querySelector("[data-admin-gallery-form]");
  if (galleryForm) {
    adminMediaManagers.gallerySource = createMediaPicker(galleryForm, {
      sourceField: "source",
      fileField: "source_file",
      labelField: "filename",
      typeField: "type",
      previewSelector: "[data-admin-gallery-preview]",
      statusSelector: "[data-admin-gallery-status]",
      scope: "gallery",
      defaultKind: "image",
      emptyMessage: "Belum ada foto atau video yang dipilih.",
    });
  }
}

async function cleanupMediaFields(item, fields = []) {
  if (!item || !Array.isArray(fields) || !fields.length || !localMediaStore) {
    return;
  }

  await Promise.all(
    fields
      .map((field) => String(item[field] || "").trim())
      .filter(Boolean)
      .filter((source) => localMediaStore.isLocalMediaRef(source))
      .map((source) => localMediaStore.deleteSource(source)),
  );
}

function renderActionButtons(id) {
  return `
    <div class="admin-table__actions">
      <button class="button button--ghost pressable" type="button" data-admin-edit="${id}">
        Edit
      </button>
      <button class="button button--ghost pressable" type="button" data-admin-delete="${id}">
        Hapus
      </button>
    </div>
  `;
}

function renderEmptyTable(colspan, text) {
  return `
    <tr>
      <td class="admin-empty" colspan="${colspan}">${text}</td>
    </tr>
  `;
}

async function setupCollectionAdminPage(config) {
  if (getAdminPage() !== config.page) {
    return;
  }

  const table = document.querySelector(config.tableSelector);
  const countNode = document.querySelector(config.countSelector);
  const searchInput = document.querySelector(config.searchSelector);
  const form = document.querySelector(config.formSelector);
  const resetButton = document.querySelector(config.resetFormSelector);
  const resetStorageButton = document.querySelector(config.resetStorageSelector);

  if (!table || !form) {
    return;
  }

  let items = await config.load();

  const render = () => {
    const query = String(searchInput?.value || "").trim().toLowerCase();
    const filtered = items.filter((item) => config.searchText(item).includes(query));

    table.innerHTML = filtered.length
      ? config.renderRows(filtered)
      : renderEmptyTable(config.emptyColspan, config.emptyText);

    if (countNode) {
      countNode.textContent = query
        ? `${filtered.length} dari ${items.length} ${config.countLabel}`
        : `${items.length} ${config.countLabel}`;
    }
  };

  const switchToAddMode = async () => {
    resetCollectionForm(form, config.defaults, config.submitLabelSelector, config.addLabel);
    await config.onResetForm?.(form);
  };

  await switchToAddMode();
  render();

  searchInput?.addEventListener("input", render);

  resetButton?.addEventListener("click", () => {
    switchToAddMode();
  });

  resetStorageButton?.addEventListener("click", async () => {
    const confirmed = window.confirm(config.resetStorageMessage);
    if (!confirmed) {
      return;
    }

    await config.clear();
    items = await config.load();
    await switchToAddMode();
    render();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = await config.readForm(form);
    if (!config.isValid(payload)) {
      return;
    }

    if (payload.id) {
      const previousItem = items.find((item) => item.id === payload.id);
      if (previousItem) {
        await cleanupMediaFields(
          Object.fromEntries(
            (config.mediaFields || []).map((field) => [field, previousItem[field] !== payload[field] ? previousItem[field] : ""]),
          ),
          config.mediaFields,
        );
      }
      items = items.map((item) => {
        return item.id === payload.id ? { ...item, ...payload } : item;
      });
    } else {
      items = [
        ...items,
        {
          ...payload,
          id: getNextId(items),
        },
      ];
    }

    items = config.save(items);
    await switchToAddMode();
    render();
  });

  table.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-admin-edit]");
    const deleteButton = event.target.closest("[data-admin-delete]");

    if (editButton) {
      const itemId = Number(editButton.dataset.adminEdit);
      const item = items.find((entry) => entry.id === itemId);
      if (!item) {
        return;
      }

      await config.fillForm(form, item);
      if (config.submitLabelSelector) {
        setSubmitLabel(config.submitLabelSelector, config.editLabel);
      }
      if (form.elements[config.focusField]) {
        form.elements[config.focusField].focus();
      }
      return;
    }

    if (deleteButton) {
      const itemId = Number(deleteButton.dataset.adminDelete);
      const item = items.find((entry) => entry.id === itemId);
      if (!item) {
        return;
      }

      const confirmed = window.confirm(config.deleteMessage(item));
      if (!confirmed) {
        return;
      }

      items = items.filter((entry) => entry.id !== itemId);
      await cleanupMediaFields(item, config.mediaFields);
      items = config.save(items);
      if (getFormItemId(form) === itemId) {
        await switchToAddMode();
      }
      render();
    }
  });
}

async function loadAdminDashboard() {
  if (getAdminPage() !== "dashboard") {
    return;
  }

  const [members, projects, gallery, events, about] = await Promise.all([
    membersStore.loadMembersCollection(ADMIN_DATA_PATHS.members),
    contentStore.loadProjects(ADMIN_DATA_PATHS.projects),
    contentStore.loadGallery(ADMIN_DATA_PATHS.gallery),
    contentStore.loadEvents(ADMIN_DATA_PATHS.events),
    contentStore.loadAbout(ADMIN_DATA_PATHS.about),
  ]);

  const photos = gallery.filter((item) => item.type === "photo").length;
  const videos = gallery.filter((item) => item.type === "video").length;
  const aboutStatus = about.title || about.lead || about.body_text ? "terisi" : "kosong";

  const mapping = [
    ["[data-admin-members-total]", members.length],
    ["[data-admin-projects-total]", projects.length],
    ["[data-admin-photos-total]", photos],
    ["[data-admin-videos-total]", videos],
    ["[data-admin-events-total]", events.length],
    ["[data-admin-about-status]", aboutStatus],
  ];

  mapping.forEach(([selector, value]) => {
    const node = document.querySelector(selector);
    if (node) {
      node.textContent = String(value);
    }
  });
}

function renderMemberRows(members) {
  return members
    .map((member) => {
      return `
        <tr>
          <td>${member.id}</td>
          <td>${member.name}</td>
          <td>@${member.username}</td>
          <td>${member.role}</td>
          <td>${renderActionButtons(member.id)}</td>
        </tr>
      `;
    })
    .join("");
}

function readMemberForm(form) {
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();

  return {
    id: getSubmittedItemId(formData),
    name,
    username:
      String(formData.get("username") || "").trim() || membersStore.slugifyMemberName(name),
    role: String(formData.get("role") || "").trim() || "Anggota",
    instagram: String(formData.get("instagram") || "").trim().replace(/^@+/, ""),
    location: String(formData.get("location") || "").trim(),
    photo:
      String(formData.get("photo") || "").trim() || membersStore.MEMBER_PLACEHOLDER_PHOTO,
    headline: String(formData.get("headline") || "").trim(),
    bio: String(formData.get("bio") || "").trim(),
  };
}

async function fillMemberForm(form, member) {
  setFormItemId(form, member.id);
  form.elements.name.value = member.name || "";
  form.elements.username.value = member.username || "";
  form.elements.role.value = member.role || "Anggota";
  form.elements.instagram.value = member.instagram || "";
  form.elements.location.value = member.location || "";
  form.elements.photo.value = member.photo || membersStore.MEMBER_PLACEHOLDER_PHOTO;
  form.elements.headline.value = member.headline || "";
  form.elements.bio.value = member.bio || "";
  await adminMediaManagers.memberPhoto?.fill(
    member.photo || membersStore.MEMBER_PLACEHOLDER_PHOTO,
  );
}

function renderProjectRows(projects) {
  return projects
    .map((project) => {
      return `
        <tr>
          <td>${project.id}</td>
          <td>${project.title}</td>
          <td>${project.category}</td>
          <td>${project.status}</td>
          <td>${renderActionButtons(project.id)}</td>
        </tr>
      `;
    })
    .join("");
}

function readProjectForm(form) {
  const formData = new FormData(form);
  return {
    id: getSubmittedItemId(formData),
    title: String(formData.get("title") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    status: String(formData.get("status") || "").trim(),
    year: String(formData.get("year") || "").trim(),
    image: String(formData.get("image") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    summary: String(formData.get("summary") || "").trim(),
    overview: String(formData.get("overview") || "").trim(),
    tech: parseListField(formData.get("tech")),
    features: parseListField(formData.get("features")),
  };
}

async function fillProjectForm(form, project) {
  setFormItemId(form, project.id);
  form.elements.title.value = project.title || "";
  form.elements.category.value = project.category || "";
  form.elements.status.value = project.status || "";
  form.elements.year.value = project.year || "";
  form.elements.image.value = project.image || "";
  form.elements.description.value = project.description || "";
  form.elements.summary.value = project.summary || "";
  form.elements.overview.value = project.overview || "";
  form.elements.tech.value = Array.isArray(project.tech) ? project.tech.join(", ") : "";
  form.elements.features.value = Array.isArray(project.features)
    ? project.features.join(", ")
    : "";
  await adminMediaManagers.projectImage?.fill(project.image || "");
}

function renderGalleryRows(items) {
  return items
    .map((item) => {
      return `
        <tr>
          <td>${item.id}</td>
          <td>${item.title}</td>
          <td>${item.type}</td>
          <td>${item.date || "-"}</td>
          <td>${renderActionButtons(item.id)}</td>
        </tr>
      `;
    })
    .join("");
}

function readGalleryForm(form) {
  const formData = new FormData(form);
  const source = String(formData.get("source") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const filename =
    String(formData.get("filename") || "").trim() ||
    getSourceBasename(source) ||
    title;

  return {
    id: getSubmittedItemId(formData),
    title,
    type: String(formData.get("type") || "photo").trim(),
    source,
    filename,
    date: String(formData.get("date") || "").trim(),
  };
}

async function fillGalleryForm(form, item) {
  setFormItemId(form, item.id);
  form.elements.title.value = item.title || "";
  form.elements.type.value = item.type || "photo";
  form.elements.source.value = item.source || "";
  form.elements.date.value = item.date || "";
  form.elements.filename.value = item.filename || "";
  await adminMediaManagers.gallerySource?.fill(item.source || "", item.filename || "");
}

function renderEventRows(events) {
  return events
    .map((item) => {
      const schedule = [item.date || "-", item.time || ""].filter(Boolean).join(" ");
      return `
        <tr>
          <td>${item.id}</td>
          <td>${item.title}</td>
          <td>${schedule}</td>
          <td>${item.location || "-"}</td>
          <td>${item.status || "Terjadwal"}</td>
          <td>${renderActionButtons(item.id)}</td>
        </tr>
      `;
    })
    .join("");
}

function readEventForm(form) {
  const formData = new FormData(form);
  return {
    id: getSubmittedItemId(formData),
    title: String(formData.get("title") || "").trim(),
    date: String(formData.get("date") || "").trim(),
    time: String(formData.get("time") || "").trim(),
    location: String(formData.get("location") || "").trim(),
    status: String(formData.get("status") || "").trim() || "Terjadwal",
    description: String(formData.get("description") || "").trim(),
  };
}

function fillEventForm(form, item) {
  setFormItemId(form, item.id);
  form.elements.title.value = item.title || "";
  form.elements.date.value = item.date || "";
  form.elements.time.value = item.time || "";
  form.elements.location.value = item.location || "";
  form.elements.status.value = item.status || "Terjadwal";
  form.elements.description.value = item.description || "";
}

async function loadAdminAbout() {
  if (getAdminPage() !== "about") {
    return;
  }

  const form = document.querySelector("[data-admin-about-form]");
  const status = document.querySelector("[data-admin-about-form-status]");
  const resetButton = document.querySelector("[data-admin-about-form-reset]");
  const resetStorageButton = document.querySelector("[data-admin-about-reset-storage]");
  if (!form) {
    return;
  }

  const loadCurrent = async () => {
    const about = await contentStore.loadAbout(ADMIN_DATA_PATHS.about);
    form.elements.eyebrow.value = about.eyebrow || "Tentang Angkatan";
    form.elements.title.value = about.title || "";
    form.elements.lead.value = about.lead || "";
    form.elements.body_title.value = about.body_title || "";
    form.elements.body_text.value = about.body_text || "";
    if (status) {
      status.textContent = about.title || about.lead || about.body_text ? "terisi" : "kosong";
    }
  };

  await loadCurrent();

  resetButton?.addEventListener("click", () => {
    form.reset();
    form.elements.eyebrow.value = "Tentang Angkatan";
  });

  resetStorageButton?.addEventListener("click", async () => {
    const confirmed = window.confirm("Kembalikan konten about ke data awal?");
    if (!confirmed) {
      return;
    }

    contentStore.clearAbout();
    await loadCurrent();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    contentStore.saveAbout({
      eyebrow: String(formData.get("eyebrow") || "").trim(),
      title: String(formData.get("title") || "").trim(),
      lead: String(formData.get("lead") || "").trim(),
      body_title: String(formData.get("body_title") || "").trim(),
      body_text: String(formData.get("body_text") || "").trim(),
    });

    if (status) {
      status.textContent = "tersimpan";
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  requireAdminLogin();
  initAdminLogin();
  initAdminLogout();
  initAdminMediaManagers();

  try {
    await Promise.all([
      loadAdminDashboard(),
      setupCollectionAdminPage({
        page: "members",
        load: () => membersStore.loadMembersCollection(ADMIN_DATA_PATHS.members),
        save: (items) => membersStore.saveMembersCollection(items),
        clear: () => membersStore.clearMembersCollection(),
        tableSelector: "[data-admin-members-table]",
        countSelector: "[data-admin-members-count]",
        searchSelector: "[data-admin-search]",
        formSelector: "[data-admin-member-form]",
        resetFormSelector: "[data-admin-form-reset]",
        resetStorageSelector: "[data-admin-reset-storage]",
        submitLabelSelector: "[data-admin-submit-label]",
        addLabel: "Tambah Anggota",
        editLabel: "Simpan Perubahan",
        defaults: {
          role: "Anggota",
          photo: membersStore.MEMBER_PLACEHOLDER_PHOTO,
        },
        mediaFields: ["photo"],
        countLabel: "anggota",
        emptyColspan: 5,
        emptyText: "Belum ada anggota yang cocok.",
        focusField: "name",
        renderRows: renderMemberRows,
        readForm: readMemberForm,
        fillForm: fillMemberForm,
        onResetForm: async () =>
          adminMediaManagers.memberPhoto?.reset(membersStore.MEMBER_PLACEHOLDER_PHOTO),
        isValid: (item) => Boolean(item.name),
        searchText: (item) =>
          `${item.name} ${item.username} ${item.instagram} ${item.role}`.toLowerCase(),
        deleteMessage: (item) => `Hapus anggota ${item.name}?`,
        resetStorageMessage: "Kembalikan data anggota ke isi file awal?",
      }),
      setupCollectionAdminPage({
        page: "projects",
        load: () => contentStore.loadProjects(ADMIN_DATA_PATHS.projects),
        save: (items) => contentStore.saveProjects(items),
        clear: () => contentStore.clearProjects(),
        tableSelector: "[data-admin-projects-table]",
        countSelector: "[data-admin-projects-count]",
        searchSelector: "[data-admin-projects-search]",
        formSelector: "[data-admin-project-form]",
        resetFormSelector: "[data-admin-project-form-reset]",
        resetStorageSelector: "[data-admin-project-reset-storage]",
        submitLabelSelector: "[data-admin-project-submit-label]",
        addLabel: "Tambah Project",
        editLabel: "Simpan Perubahan",
        defaults: {
          image: "assets/images/projects/placeholder.svg",
        },
        mediaFields: ["image"],
        countLabel: "project",
        emptyColspan: 5,
        emptyText: "Belum ada project yang cocok.",
        focusField: "title",
        renderRows: renderProjectRows,
        readForm: readProjectForm,
        fillForm: fillProjectForm,
        onResetForm: async () =>
          adminMediaManagers.projectImage?.reset("assets/images/projects/placeholder.svg"),
        isValid: (item) => Boolean(item.title),
        searchText: (item) =>
          `${item.title} ${item.category} ${item.status}`.toLowerCase(),
        deleteMessage: (item) => `Hapus project ${item.title}?`,
        resetStorageMessage: "Kembalikan data project ke isi file awal?",
      }),
      setupCollectionAdminPage({
        page: "gallery",
        load: () => contentStore.loadGallery(ADMIN_DATA_PATHS.gallery),
        save: (items) => contentStore.saveGallery(items),
        clear: () => contentStore.clearGallery(),
        tableSelector: "[data-admin-gallery-table]",
        countSelector: "[data-admin-gallery-count]",
        searchSelector: "[data-admin-gallery-search]",
        formSelector: "[data-admin-gallery-form]",
        resetFormSelector: "[data-admin-gallery-form-reset]",
        resetStorageSelector: "[data-admin-gallery-reset-storage]",
        submitLabelSelector: "[data-admin-gallery-submit-label]",
        addLabel: "Tambah Media",
        editLabel: "Simpan Perubahan",
        defaults: { type: "photo" },
        mediaFields: ["source"],
        countLabel: "media",
        emptyColspan: 5,
        emptyText: "Belum ada media yang cocok.",
        focusField: "title",
        renderRows: renderGalleryRows,
        readForm: readGalleryForm,
        fillForm: fillGalleryForm,
        onResetForm: async (form) => {
          form.elements.filename.value = "";
          await adminMediaManagers.gallerySource?.reset("");
        },
        isValid: (item) => Boolean(item.title && item.source),
        searchText: (item) =>
          `${item.title} ${item.filename} ${item.source} ${item.type}`.toLowerCase(),
        deleteMessage: (item) => `Hapus media ${item.title}?`,
        resetStorageMessage: "Kembalikan data gallery ke isi file awal?",
      }),
      setupCollectionAdminPage({
        page: "events",
        load: () => contentStore.loadEvents(ADMIN_DATA_PATHS.events),
        save: (items) => contentStore.saveEvents(items),
        clear: () => contentStore.clearEvents(),
        tableSelector: "[data-admin-events-table]",
        countSelector: "[data-admin-events-count]",
        searchSelector: "[data-admin-events-search]",
        formSelector: "[data-admin-event-form]",
        resetFormSelector: "[data-admin-event-form-reset]",
        resetStorageSelector: "[data-admin-event-reset-storage]",
        submitLabelSelector: "[data-admin-event-submit-label]",
        addLabel: "Tambah Kegiatan",
        editLabel: "Simpan Perubahan",
        defaults: {
          status: "Terjadwal",
        },
        countLabel: "kegiatan",
        emptyColspan: 6,
        emptyText: "Belum ada kegiatan yang cocok.",
        focusField: "title",
        renderRows: renderEventRows,
        readForm: readEventForm,
        fillForm: fillEventForm,
        isValid: (item) => Boolean(item.title),
        searchText: (item) =>
          `${item.title} ${item.location} ${item.date} ${item.time} ${item.status}`.toLowerCase(),
        deleteMessage: (item) => `Hapus kegiatan ${item.title}?`,
        resetStorageMessage: "Kembalikan data kegiatan ke isi file awal?",
      }),
      loadAdminAbout(),
    ]);
  } catch (error) {
    console.error(error);
  }
});
