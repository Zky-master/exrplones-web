const fallbackComponents = {
  navbar: `
    <nav class="site-nav">
      <div class="site-nav__inner container">
        <a class="site-brand pressable" href="index.html" aria-label="EXRPLONES Home">
          <span class="site-brand__mark">EXR</span>
          <span class="site-brand__text">
            <strong>EXRPLONES</strong>
            <small>xi rpl 1</small>
          </span>
        </a>
        <button
          class="site-nav__toggle pressable"
          type="button"
          aria-expanded="false"
          aria-controls="site-menu"
          data-nav-toggle
        >
          Menu
        </button>
        <div class="site-nav__links" id="site-menu" data-nav-menu>
          <a class="pressable" href="index.html" data-nav-link="home">Beranda</a>
          <a class="pressable" href="members.html" data-nav-link="members">Anggota</a>
          <a class="pressable" href="projects.html" data-nav-link="projects">Project</a>
          <a class="pressable" href="gallery.html" data-nav-link="gallery">Galeri</a>
          <a class="pressable" href="events.html" data-nav-link="events">Kegiatan</a>
          <a class="pressable" href="about.html" data-nav-link="about">Tentang</a>
          <a class="pressable" href="admin/login.html">Admin</a>
        </div>
      </div>
    </nav>
  `,
  footer: `
    <footer class="site-footer">
      <div class="site-footer__inner container">
        <div>
          <p class="site-footer__brand">EXRPLONES</p>
          <p class="site-footer__copy">Dashboard digital anggota, galeri, dan informasi kelas EXRPLONES.</p>
        </div>
        <div class="site-footer__meta">
          <a class="pressable" href="https://instagram.com/exrplones" target="_blank" rel="noreferrer">
            @exrplones
          </a>
        </div>
      </div>
    </footer>
  `,
};

let revealObserver;

async function loadComponent(name) {
  try {
    const response = await fetch(`components/${name}.html`);
    if (!response.ok) {
      throw new Error(`Component ${name} unavailable`);
    }

    return await response.text();
  } catch (error) {
    return fallbackComponents[name] || "";
  }
}

async function mountComponents() {
  const targets = document.querySelectorAll("[data-component]");

  await Promise.all(
    Array.from(targets).map(async (target) => {
      const name = target.dataset.component;
      target.innerHTML = await loadComponent(name);
    }),
  );

  initNavigation();
}

function initNavigation() {
  const page = document.body.dataset.page;
  const navLinks = document.querySelectorAll("[data-nav-link]");
  navLinks.forEach((link) => {
    if (link.dataset.navLink === page) {
      link.classList.add("is-active");
    }
  });

  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-nav-menu]");
  if (!toggle || !menu) {
    return;
  }

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function initSmoothScroll() {
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) {
      return;
    }

    const targetSelector = anchor.getAttribute("href");
    if (!targetSelector || targetSelector === "#") {
      return;
    }

    const target = document.querySelector(targetSelector);
    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function initPressables() {
  document.addEventListener("pointerdown", (event) => {
    const pressable = event.target.closest(".pressable, .button, .member-card__photo");
    if (!pressable) {
      return;
    }

    pressable.classList.add("is-pressed");
    window.setTimeout(() => {
      pressable.classList.remove("is-pressed");
    }, 160);
  });
}

function createRevealObserver() {
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 },
  );
}

function refreshReveals() {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll("[data-reveal]").forEach((element) => {
      element.classList.add("is-visible");
    });
    return;
  }

  if (!revealObserver) {
    createRevealObserver();
  }

  document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((element) => {
    revealObserver.observe(element);
  });
}

window.EXRPLONES = {
  refreshReveals,
};

document.addEventListener("DOMContentLoaded", async () => {
  await mountComponents();
  initSmoothScroll();
  initPressables();
  refreshReveals();
});
