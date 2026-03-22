const MEMBER_DETAIL_URL = "data/members.json";
const MEMBER_FALLBACK_PHOTO = "assets/images/members/placeholder.svg";
const membersStore = window.EXRPLONES_MEMBERS_STORE;

function attachFallbackImage(image) {
  image.addEventListener(
    "error",
    () => {
      image.src = MEMBER_FALLBACK_PHOTO;
    },
    { once: true },
  );
}

function renderMemberDetail(member, relatedMembers) {
  const photo = member.photo || MEMBER_FALLBACK_PHOTO;
  const instagramMarkup = member.instagram
    ? `
      <a
        class="button button--ghost pressable"
        href="https://instagram.com/${member.instagram}"
        target="_blank"
        rel="noreferrer"
      >
        Instagram
      </a>
    `
    : `<span class="button button--ghost">IG menyusul</span>`;
  const skills = Array.isArray(member.skills) ? member.skills : [];
  const projects = Array.isArray(member.projects) ? member.projects : [];
  const relatedMarkup = relatedMembers
    .map(
      (item) => `
        <a class="related-card card-surface pressable" href="member.html?id=${item.id}">
          <img
            class="related-card__thumb"
            src="${item.photo || MEMBER_FALLBACK_PHOTO}"
            alt="${item.name}"
            loading="lazy"
          />
          <span class="related-card__title">${item.name}</span>
          <p class="detail-note">${item.role}</p>
        </a>
      `,
    )
    .join("");

  return `
    <article class="detail-card card-surface" data-reveal>
      <div class="detail-grid">
        <div class="detail-media">
          <button class="detail-media__photo pressable" type="button" data-detail-photo>
            <img src="${photo}" alt="${member.name}" />
          </button>
          <div class="card-surface detail-card">
            <p class="eyebrow">${member.role}</p>
            <h1>${member.name}</h1>
            <p class="page-header__lead">${member.headline || "Profil anggota EXRPLONES."}</p>
            <div class="detail-actions">
              <a class="button button--solid pressable" href="members.html">Kembali ke Members</a>
              ${instagramMarkup}
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="card-surface detail-card">
            <h2>Ringkasan</h2>
            <p>${member.bio || "Profil lengkap akan diperbarui setelah data anggota dilengkapi."}</p>
          </div>

          <div class="card-surface detail-card detail-meta">
            <h3>Informasi Inti</h3>
            <ul class="meta-list">
              <li>
                <strong>Username</strong>
                <span>@${member.username}</span>
              </li>
              <li>
                <strong>Fokus</strong>
                <span>${member.focus || member.role}</span>
              </li>
              <li>
                <strong>Lokasi</strong>
                <span>${member.location || "Indonesia"}</span>
              </li>
            </ul>
          </div>

          <div class="card-surface detail-card detail-section">
            <h3>Skill Stack</h3>
            <div class="tag-list">
              ${
                skills.length
                  ? skills.map((skill) => `<span class="badge">${skill}</span>`).join("")
                  : '<span class="detail-note">Belum ada skill yang diisi.</span>'
              }
            </div>
          </div>

          <div class="card-surface detail-card detail-section">
            <h3>Kontribusi / Project</h3>
            <ul class="detail-list">
              ${
                projects.length
                  ? projects
                      .map(
                        (project) => `
                          <li>
                            <strong>Project</strong>
                            <span>${project}</span>
                          </li>
                        `,
                      )
                      .join("")
                  : `
                    <li>
                      <strong>Status</strong>
                      <span>Belum ada daftar project yang ditautkan.</span>
                    </li>
                  `
              }
            </ul>
          </div>
        </div>
      </div>
    </article>

    <section class="detail-card card-surface" data-reveal>
      <p class="eyebrow">Anggota Lain</p>
      <h2>Lanjut eksplor profil lain tanpa balik ke awal.</h2>
      <div class="related-grid">
        ${relatedMarkup}
      </div>
    </section>
  `;
}

function renderDetailError(container, message) {
  container.innerHTML = `
    <article class="empty-state card-surface">
      <h2>Profil tidak ditemukan</h2>
      <p>${message}</p>
      <p style="margin-top: 1rem;">
        <a class="button button--solid pressable" href="members.html">Balik ke daftar anggota</a>
      </p>
    </article>
  `;
}

async function loadMemberDetailPage() {
  const container = document.querySelector("[data-member-detail]");
  if (!container) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  if (!id) {
    renderDetailError(container, "Tambahkan parameter `?id=` yang valid pada URL.");
    return;
  }

  try {
    const members = await membersStore.loadMembersCollection(MEMBER_DETAIL_URL);
    const member = members.find((item) => item.id === id);
    if (!member) {
      renderDetailError(container, "ID anggota tidak ada di `members.json`.");
      return;
    }

    const relatedMembers = members.filter((item) => item.id !== member.id).slice(0, 3);
    container.innerHTML = renderMemberDetail(member, relatedMembers);

    container.querySelectorAll("img").forEach(attachFallbackImage);
    const photoButton = container.querySelector("[data-detail-photo]");
    photoButton?.addEventListener("click", () => {
      window.EXRPLONES_MODAL?.openImageModal({
        src: member.photo || MEMBER_FALLBACK_PHOTO,
        alt: member.name,
        caption: `${member.name} - ${member.role}`,
      });
    });

    window.EXRPLONES?.refreshReveals();
  } catch (error) {
    renderDetailError(
      container,
      "Pastikan project dijalankan lewat local server supaya JSON bisa di-fetch dengan benar.",
    );
  }
}

document.addEventListener("DOMContentLoaded", loadMemberDetailPage);
