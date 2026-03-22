const PROJECTS_DATA_URL = "data/projects.json";
const PROJECT_FALLBACK_IMAGE = "assets/images/projects/placeholder.svg";
const contentStore = window.EXRPLONES_CONTENT_STORE;

function attachProjectFallback(image) {
  image.addEventListener(
    "error",
    () => {
      image.src = PROJECT_FALLBACK_IMAGE;
    },
    { once: true },
  );
}

function renderProjectCard(project) {
  const image = project.image || PROJECT_FALLBACK_IMAGE;
  const techStack = Array.isArray(project.tech) ? project.tech : [];
  return `
    <article class="project-card card-surface" data-reveal>
      <div class="project-card__image">
        <img src="${image}" alt="${project.title}" loading="lazy" />
      </div>
      <div>
        <span class="badge">${project.status || "In Progress"}</span>
        <h2 class="project-card__title">${project.title}</h2>
        <p>${project.description}</p>
      </div>
      <div class="project-card__stack">
        ${techStack.map((item) => `<span class="chip">${item}</span>`).join("")}
      </div>
      <div class="project-card__meta">
        <span>${project.year || "2026"}</span>
        <span>${project.category || "RPL Project"}</span>
      </div>
      <a class="button button--solid pressable" href="project.html?id=${project.id}">Lihat Detail</a>
    </article>
  `;
}

function renderProjectDetail(project, relatedProjects) {
  const image = project.image || PROJECT_FALLBACK_IMAGE;
  const techStack = Array.isArray(project.tech) ? project.tech : [];
  const features = Array.isArray(project.features) ? project.features : [];

  return `
    <article class="detail-card card-surface" data-reveal>
      <div class="detail-grid">
        <div class="detail-media">
          <div class="project-card__image">
            <img src="${image}" alt="${project.title}" />
          </div>
          <div class="card-surface detail-card">
            <p class="eyebrow">${project.category || "Project"}</p>
            <h1>${project.title}</h1>
            <p class="page-header__lead">${project.summary || project.description}</p>
          </div>
        </div>
        <div class="detail-section">
          <div class="card-surface detail-card detail-section">
            <h2>Overview</h2>
            <p>${project.overview || project.description}</p>
          </div>
          <div class="card-surface detail-card detail-section">
            <h3>Tech Stack</h3>
            <div class="tag-list">
              ${techStack.map((item) => `<span class="badge">${item}</span>`).join("")}
            </div>
          </div>
          <div class="card-surface detail-card detail-section">
            <h3>Highlight Fitur</h3>
            <ul class="detail-list">
              ${
                features.length
                  ? features
                      .map(
                        (feature) => `
                          <li>
                            <strong>Fitur</strong>
                            <span>${feature}</span>
                          </li>
                        `,
                      )
                      .join("")
                  : `
                    <li>
                      <strong>Status</strong>
                      <span>Belum ada fitur yang ditulis.</span>
                    </li>
                  `
              }
            </ul>
          </div>
        </div>
      </div>
    </article>

    <section class="detail-card card-surface" data-reveal>
      <p class="eyebrow">Project Terkait</p>
      <h2>Masih satu orbit dengan karya lain di EXRPLONES.</h2>
      <div class="projects-grid">
        ${relatedProjects.map(renderProjectCard).join("")}
      </div>
    </section>
  `;
}

function renderProjectError(container, message) {
  container.innerHTML = `
    <article class="empty-state card-surface">
      <h2>Project belum tersedia</h2>
      <p>${message}</p>
    </article>
  `;
}

async function loadProjectsPage() {
  const grid = document.querySelector("[data-projects-grid]");
  const detail = document.querySelector("[data-project-detail]");
  if (!grid && !detail) {
    return;
  }

  try {
    const projects = await contentStore.loadProjects(PROJECTS_DATA_URL);

    if (grid) {
      if (!projects.length) {
        renderProjectError(grid, "Halaman project masih dikosongkan untuk sekarang.");
      } else {
        grid.innerHTML = projects.map(renderProjectCard).join("");
        grid.querySelectorAll("img").forEach(attachProjectFallback);
      }
    }

    if (detail) {
      if (!projects.length) {
        renderProjectError(detail, "Belum ada project yang diisi.");
        return;
      }

      const id = Number(new URLSearchParams(window.location.search).get("id"));
      const project = projects.find((item) => item.id === id);
      if (!project) {
        renderProjectError(detail, "Gunakan `project.html?id=...` yang sesuai dengan data.");
        return;
      }

      const relatedProjects = projects.filter((item) => item.id !== project.id).slice(0, 3);
      detail.innerHTML = renderProjectDetail(project, relatedProjects);
      detail.querySelectorAll("img").forEach(attachProjectFallback);
    }

    window.EXRPLONES?.refreshReveals();
  } catch (error) {
    const message =
      "Pastikan project dijalankan lewat local server supaya file JSON bisa di-fetch dengan benar.";
    if (grid) {
      renderProjectError(grid, message);
    }
    if (detail) {
      renderProjectError(detail, message);
    }
  }
}

document.addEventListener("DOMContentLoaded", loadProjectsPage);
