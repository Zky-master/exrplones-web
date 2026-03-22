const MEMBERS_DATA_URL = "data/members.json";
const MEMBER_PLACEHOLDER = "assets/images/members/placeholder.svg";
const membersStore = window.EXRPLONES_MEMBERS_STORE;
let allMembers = [];

function formatInstagram(username) {
  return username ? `https://instagram.com/${username}` : "#";
}

function handleFallbackImage(image) {
  image.addEventListener(
    "error",
    () => {
      image.src = MEMBER_PLACEHOLDER;
    },
    { once: true },
  );
}

function renderMemberCard(member) {
  const photo = member.photo_url || member.photo || MEMBER_PLACEHOLDER;
  const secondaryText = member.instagram
    ? `@${member.instagram}`
    : member.username
      ? `@${member.username}`
      : "anggota exrplones";

  return `
    <article class="member-card card-surface" data-reveal>
      <button
        class="member-card__photo pressable"
        type="button"
        data-open-photo
        data-photo="${photo}"
        data-name="${member.name}"
        data-role="${member.role}"
      >
        <img src="${photo}" alt="${member.name}" loading="lazy" />
      </button>
      <div class="member-card__body">
        <div class="member-card__main">
          <a class="member-card__name" href="member.html?id=${member.id}">${member.name}</a>
          <span class="member-card__role">${member.role}</span>
        </div>
        <p class="member-card__username">${secondaryText}</p>
        <div class="member-card__actions">
          <button
            class="member-inline-action pressable"
            type="button"
            data-open-photo
            data-photo="${photo}"
            data-name="${member.name}"
            data-role="${member.role}"
          >
            Lihat PP
          </button>
          ${
            member.instagram
              ? `
                <a
                  class="member-inline-action pressable"
                  href="${formatInstagram(member.instagram)}"
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              `
              : `<span class="member-inline-action">IG menyusul</span>`
          }
          <a class="button button--solid pressable" href="member.html?id=${member.id}">
            Detail
          </a>
        </div>
      </div>
    </article>
  `;
}

function renderRoleChips(members) {
  const chipRow = document.querySelector("[data-members-roles]");
  if (!chipRow) {
    return;
  }

  const roles = [...new Set(members.map((member) => member.role))];
  chipRow.innerHTML = roles.map((role) => `<span class="chip">${role}</span>`).join("");
}

function updateMemberStats(members) {
  const totalNode = document.querySelector("[data-members-count]");
  const roleNode = document.querySelector("[data-role-count]");
  const instagramNode = document.querySelector("[data-instagram-count]");
  const resultNode = document.querySelector("[data-members-result]");

  if (totalNode) {
    totalNode.textContent = String(allMembers.length);
  }

  if (roleNode) {
    roleNode.textContent = String(new Set(allMembers.map((member) => member.role)).size);
  }

  if (instagramNode) {
    instagramNode.textContent = String(allMembers.filter((member) => member.instagram).length);
  }

  if (resultNode) {
    resultNode.textContent = String(members.length);
  }
}

function bindMemberInteractions(container) {
  container.querySelectorAll("img").forEach(handleFallbackImage);

  container.querySelectorAll("[data-open-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      window.EXRPLONES_MODAL?.openImageModal({
        src: button.dataset.photo,
        alt: button.dataset.name,
        caption: `${button.dataset.name} - ${button.dataset.role}`,
      });
    });
  });
}

function renderError(container, message) {
  container.innerHTML = `
    <article class="empty-state card-surface">
      <h2>Data belum bisa dimuat</h2>
      <p>${message}</p>
    </article>
  `;
}

function renderMembersList(members) {
  const grid = document.querySelector("[data-members-grid]");
  if (!grid) {
    return;
  }

  if (!members.length) {
    grid.innerHTML = `
      <article class="empty-state card-surface">
        <h2>Anggota tidak ditemukan</h2>
        <p>Coba pakai kata kunci nama atau username yang lain.</p>
      </article>
    `;
    updateMemberStats([]);
    return;
  }

  grid.innerHTML = members.map(renderMemberCard).join("");
  updateMemberStats(members);
  bindMemberInteractions(grid);
  window.EXRPLONES?.refreshReveals();
}

function bindMemberSearch() {
  const searchInput = document.querySelector("[data-members-search]");
  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", () => {
    const needle = searchInput.value.trim().toLowerCase();
    const filtered = allMembers.filter((member) => {
      return (
        member.name.toLowerCase().includes(needle) ||
        member.username.toLowerCase().includes(needle) ||
        member.instagram.toLowerCase().includes(needle)
      );
    });

    renderMembersList(filtered);
  });
}

async function loadMembersPage() {
  const grid = document.querySelector("[data-members-grid]");
  if (!grid) {
    return;
  }

  try {
    allMembers = await membersStore.loadMembersCollection(MEMBERS_DATA_URL);
    if (!allMembers.length) {
      renderError(grid, "Belum ada anggota yang ditampilkan saat ini.");
      updateMemberStats([]);
      renderRoleChips([]);
      return;
    }

    renderRoleChips(allMembers);
    renderMembersList(allMembers);
    bindMemberSearch();
  } catch (error) {
    renderError(
      grid,
      "Pastikan project dijalankan lewat local server supaya fetch JSON dan komponen bisa aktif.",
    );
  }
}

document.addEventListener("DOMContentLoaded", loadMembersPage);
