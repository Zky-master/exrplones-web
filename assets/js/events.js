const EVENTS_DATA_URL = "data/events.json";
const contentStore = window.EXRPLONES_CONTENT_STORE;

function formatEventDate(dateString) {
  if (!dateString) {
    return "Tanggal menyusul";
  }

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Tanggal menyusul";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function renderEventCard(item) {
  const meta = [
    item.status ? `<span class="chip">${item.status}</span>` : "",
    item.time ? `<span class="chip">${item.time}</span>` : "",
  ]
    .filter(Boolean)
    .join("");

  return `
    <article class="timeline__item card-surface" data-reveal>
      <span class="timeline__date">${formatEventDate(item.date)}</span>
      <h3>${item.title}</h3>
      ${meta ? `<div class="chip-row">${meta}</div>` : ""}
      <p>${item.description || "Deskripsi kegiatan belum diisi."}</p>
      <p class="detail-note">${item.location || "Lokasi menyusul"}</p>
    </article>
  `;
}

function renderEventsEmpty(container) {
  container.innerHTML = `
    <article class="empty-state card-surface">
      <h2>Belum ada kegiatan yang ditampilkan</h2>
      <p>Tambah kegiatan dari panel admin untuk menampilkan agenda di halaman ini.</p>
    </article>
  `;
}

async function loadEventsPage() {
  const list = document.querySelector("[data-events-list]");
  if (!list) {
    return;
  }

  try {
    const events = await contentStore.loadEvents(EVENTS_DATA_URL);
    if (!events.length) {
      renderEventsEmpty(list);
      return;
    }

    const sorted = [...events].sort((left, right) => {
      return (right.date || "").localeCompare(left.date || "");
    });

    list.innerHTML = sorted.map(renderEventCard).join("");
    window.EXRPLONES?.refreshReveals();
  } catch (error) {
    renderEventsEmpty(list);
  }
}

document.addEventListener("DOMContentLoaded", loadEventsPage);
