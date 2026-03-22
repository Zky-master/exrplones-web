const ABOUT_DATA_URL = "data/about.json";
const contentStore = window.EXRPLONES_CONTENT_STORE;

function renderAboutEmpty(container) {
  container.innerHTML = `
    <section class="page-header container" data-reveal>
      <p class="eyebrow">Tentang Angkatan</p>
      <h1>Konten about belum diisi.</h1>
      <p class="page-header__lead">Bagian ini bisa diatur dari panel admin.</p>
    </section>
    <section class="section container">
      <article class="empty-state card-surface" data-reveal>
        <h2>Belum ada deskripsi angkatan</h2>
        <p>Tambah isi about dari admin supaya halaman ini tampil lengkap.</p>
      </article>
    </section>
  `;
}

function renderAboutContent(about) {
  return `
    <section class="page-header container" data-reveal>
      <p class="eyebrow">${about.eyebrow || "Tentang Angkatan"}</p>
      <h1>${about.title || "Tentang EXRPLONES"}</h1>
      <p class="page-header__lead">${about.lead || "Konten halaman ini dikelola dari admin."}</p>
    </section>

    <section class="section container">
      <article class="detail-card card-surface" data-reveal>
        <h2>${about.body_title || "Tentang EXRPLONES"}</h2>
        <p>${about.body_text || "Konten lengkap belum diisi."}</p>
      </article>
    </section>
  `;
}

async function loadAboutPage() {
  const shell = document.querySelector("[data-about-shell]");
  if (!shell) {
    return;
  }

  try {
    const about = await contentStore.loadAbout(ABOUT_DATA_URL);
    if (!about.title && !about.lead && !about.body_text) {
      renderAboutEmpty(shell);
      return;
    }

    shell.innerHTML = renderAboutContent(about);
    window.EXRPLONES?.refreshReveals();
  } catch (error) {
    renderAboutEmpty(shell);
  }
}

document.addEventListener("DOMContentLoaded", loadAboutPage);
