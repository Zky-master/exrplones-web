const MEMBERS_STORAGE_KEY = "exrplones-members-data";
const MEMBER_PLACEHOLDER_PHOTO = "assets/images/members/placeholder.svg";
const localMediaStore = window.EXRPLONES_LOCAL_MEDIA;

function slugifyMemberName(name) {
  const value = String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return value || "anggota-exrplones";
}

function normalizeMember(member, index) {
  const name = String(member?.name || "").trim();
  const id = Number(member?.id);

  return {
    id: Number.isFinite(id) && id > 0 ? id : index + 1,
    name: name || `Anggota ${index + 1}`,
    username: String(member?.username || "").trim() || slugifyMemberName(name),
    role: String(member?.role || "").trim() || "Anggota",
    instagram: String(member?.instagram || "").trim(),
    photo: String(member?.photo || "").trim() || MEMBER_PLACEHOLDER_PHOTO,
    headline: String(member?.headline || "").trim(),
    bio: String(member?.bio || "").trim(),
    focus: String(member?.focus || "").trim(),
    location: String(member?.location || "").trim(),
    skills: Array.isArray(member?.skills) ? member.skills : [],
    projects: Array.isArray(member?.projects) ? member.projects : [],
  };
}

async function hydrateMemberMedia(member) {
  const photo = String(member?.photo || "").trim();
  const resolvedPhoto = localMediaStore
    ? await localMediaStore.resolveSource(photo)
    : photo;

  return {
    ...member,
    photo_url: resolvedPhoto || photo || MEMBER_PLACEHOLDER_PHOTO,
  };
}

function parseStoredMembers() {
  try {
    const raw = window.localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.map(normalizeMember);
  } catch (error) {
    return null;
  }
}

async function fetchDefaultMembers(dataUrl) {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(`Gagal memuat ${dataUrl}`);
  }

  const parsed = await response.json();
  return Array.isArray(parsed) ? parsed.map(normalizeMember) : [];
}

async function loadMembersCollection(dataUrl) {
  const storedMembers = parseStoredMembers();
  if (storedMembers) {
    return Promise.all(storedMembers.map(hydrateMemberMedia));
  }

  const defaultMembers = await fetchDefaultMembers(dataUrl);
  return Promise.all(defaultMembers.map(hydrateMemberMedia));
}

function saveMembersCollection(members) {
  const normalized = Array.isArray(members) ? members.map(normalizeMember) : [];
  window.localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function clearMembersCollection() {
  window.localStorage.removeItem(MEMBERS_STORAGE_KEY);
}

window.EXRPLONES_MEMBERS_STORE = {
  MEMBERS_STORAGE_KEY,
  MEMBER_PLACEHOLDER_PHOTO,
  slugifyMemberName,
  normalizeMember,
  loadMembersCollection,
  saveMembersCollection,
  clearMembersCollection,
};
