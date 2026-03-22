const GALLERY_DATA_URL = "data/gallery.json";
const GALLERY_PLACEHOLDER = "assets/images/gallery/placeholder.svg";
const contentStore = window.EXRPLONES_CONTENT_STORE;

function formatGalleryDate(dateString) {
  if (!dateString) {
    return "Dokumentasi";
  }

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Dokumentasi";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function sortGalleryItems(items) {
  return [...items].sort((left, right) => {
    const leftDate = left.date || "";
    const rightDate = right.date || "";
    if (leftDate !== rightDate) {
      return rightDate.localeCompare(leftDate);
    }

    if (left.type !== right.type) {
      return left.type === "photo" ? -1 : 1;
    }

    return right.filename.localeCompare(left.filename);
  });
}

function renderGalleryCard(item) {
  const safeSource = item.source_url || item.source || GALLERY_PLACEHOLDER;
  const meta = `
    <div class="media-card__meta">
      <span>${item.type === "video" ? "Video" : "Foto"}</span>
      <span>${formatGalleryDate(item.date)}</span>
    </div>
  `;

  if (item.type === "video") {
    return `
      <article class="media-card card-surface" data-reveal>
        <button
          class="media-card__button media-card__button--video pressable"
          type="button"
          data-gallery-video
          data-source="${safeSource}"
          data-caption="${item.filename}"
        >
          <video class="media-card__video" preload="metadata" muted playsinline>
            <source src="${safeSource}" type="video/mp4" />
          </video>
          <span class="media-card__play">Buka video</span>
        </button>
        <div class="media-card__body">
          <h2 class="media-card__title">${item.filename}</h2>
          ${meta}
        </div>
      </article>
    `;
  }

  return `
    <article class="media-card card-surface" data-reveal>
      <button
        class="media-card__button pressable"
        type="button"
        data-gallery-photo
        data-source="${safeSource}"
        data-caption="${item.filename}"
      >
        <img class="media-card__image" src="${safeSource}" alt="${item.filename}" loading="lazy" />
      </button>
      <div class="media-card__body">
        <h2 class="media-card__title">${item.filename}</h2>
        ${meta}
      </div>
    </article>
  `;
}

function updateGalleryStats(items) {
  const totalNode = document.querySelector("[data-gallery-total]");
  const photosNode = document.querySelector("[data-gallery-photos]");
  const videosNode = document.querySelector("[data-gallery-videos]");
  const photos = items.filter((item) => item.type === "photo").length;
  const videos = items.filter((item) => item.type === "video").length;

  if (totalNode) {
    totalNode.textContent = String(items.length);
  }

  if (photosNode) {
    photosNode.textContent = String(photos);
  }

  if (videosNode) {
    videosNode.textContent = String(videos);
  }
}

function bindGalleryInteractions(container) {
  container.querySelectorAll("img").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        image.src = GALLERY_PLACEHOLDER;
      },
      { once: true },
    );
  });

  container.querySelectorAll("[data-gallery-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      window.EXRPLONES_MODAL?.openImageModal({
        src: button.dataset.source,
        alt: button.dataset.caption,
        caption: button.dataset.caption,
      });
    });
  });

  container.querySelectorAll("[data-gallery-video]").forEach((button) => {
    button.addEventListener("click", () => {
      window.EXRPLONES_MODAL?.openVideoModal({
        src: button.dataset.source,
        caption: `${button.dataset.caption} - nyalakan volume untuk suara`,
      });
    });
  });
}

function renderGalleryError(container, message) {
  container.innerHTML = `
    <article class="empty-state card-surface">
      <h2>Gallery belum bisa dimuat</h2>
      <p>${message}</p>
    </article>
  `;
}

async function loadGalleryPage() {
  const grid = document.querySelector("[data-gallery-grid]");
  if (!grid) {
    return;
  }

  try {
    const rawItems = await contentStore.loadGallery(GALLERY_DATA_URL);
    const items = sortGalleryItems(rawItems);
    if (!items.length) {
      renderGalleryError(grid, "Belum ada media yang diisi untuk gallery.");
      updateGalleryStats([]);
      return;
    }

    grid.innerHTML = items.map(renderGalleryCard).join("");
    updateGalleryStats(items);
    bindGalleryInteractions(grid);
    window.EXRPLONES?.refreshReveals();
  } catch (error) {
    renderGalleryError(
      grid,
      "Pastikan local server aktif supaya file JSON, foto, dan video bisa dibaca lewat browser.",
    );
  }
}

document.addEventListener("DOMContentLoaded", loadGalleryPage);
