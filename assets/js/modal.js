function createModal() {
  const modal = document.createElement("div");
  modal.className = "image-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="image-modal__backdrop" data-close-modal></div>
    <figure class="image-modal__dialog">
      <button class="image-modal__close pressable" type="button" aria-label="Tutup modal">
        x
      </button>
      <img class="image-modal__image" alt="" />
      <video class="image-modal__video" controls playsinline></video>
      <figcaption class="image-modal__caption"></figcaption>
    </figure>
  `;

  document.body.appendChild(modal);
  return modal;
}

function ensureModal() {
  return document.querySelector(".image-modal") || createModal();
}

function closeImageModal() {
  const modal = ensureModal();
  const image = modal.querySelector(".image-modal__image");
  const video = modal.querySelector(".image-modal__video");

  image.removeAttribute("src");
  image.alt = "";
  image.hidden = true;

  video.pause();
  video.removeAttribute("src");
  video.load();
  video.hidden = true;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-modal-open");
}

function openImageModal({ src, alt, caption }) {
  const modal = ensureModal();
  const image = modal.querySelector(".image-modal__image");
  const video = modal.querySelector(".image-modal__video");
  const captionNode = modal.querySelector(".image-modal__caption");

  video.pause();
  video.removeAttribute("src");
  video.load();
  video.hidden = true;

  image.src = src;
  image.alt = alt || "";
  image.hidden = false;
  captionNode.textContent = caption || "";
  captionNode.hidden = !caption;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-modal-open");
}

function openVideoModal({ src, caption }) {
  const modal = ensureModal();
  const image = modal.querySelector(".image-modal__image");
  const video = modal.querySelector(".image-modal__video");
  const captionNode = modal.querySelector(".image-modal__caption");

  image.removeAttribute("src");
  image.alt = "";
  image.hidden = true;

  video.src = src;
  video.hidden = false;
  video.currentTime = 0;
  video.muted = false;
  captionNode.textContent = caption || "";
  captionNode.hidden = !caption;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-modal-open");

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

document.addEventListener("click", (event) => {
  const modal = event.target.closest(".image-modal");
  const closeTrigger = event.target.closest("[data-close-modal], .image-modal__close");

  if (modal && closeTrigger) {
    closeImageModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeImageModal();
  }
});

window.EXRPLONES_MODAL = {
  openImageModal,
  openVideoModal,
  closeImageModal,
};
