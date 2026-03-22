import fs from "fs";
import path from "path";

const root = process.cwd();

const htmlFiles = [
  "index.html",
  "members.html",
  "member.html",
  "projects.html",
  "project.html",
  "gallery.html",
  "events.html",
  "about.html",
  "admin/login.html",
  "admin/dashboard.html",
  "admin/members.html",
  "admin/projects.html",
  "admin/gallery.html",
  "admin/events.html",
  "admin/about.html",
];

const dataFiles = [
  "data/members.json",
  "data/projects.json",
  "data/gallery.json",
  "data/events.json",
  "data/about.json",
];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function isLocalRef(value) {
  return (
    value &&
    !value.startsWith("#") &&
    !value.startsWith("http://") &&
    !value.startsWith("https://") &&
    !value.startsWith("mailto:") &&
    !value.startsWith("tel:") &&
    !value.startsWith("javascript:")
  );
}

function resolveLocalRef(fromFile, ref) {
  const clean = ref.split("?")[0].split("#")[0];
  return path.resolve(path.dirname(path.join(root, fromFile)), clean);
}

function collectHtmlRefs() {
  const missing = [];

  for (const file of htmlFiles) {
    const fullPath = path.join(root, file);
    const content = readText(fullPath);
    const matches = [
      ...content.matchAll(/(?:href|src|poster)="([^"]+)"/g),
    ];

    for (const match of matches) {
      const ref = match[1];
      if (!isLocalRef(ref)) {
        continue;
      }

      const target = resolveLocalRef(file, ref);
      if (!fs.existsSync(target)) {
        missing.push(`${file} -> ${ref}`);
      }
    }
  }

  return missing;
}

function parseJson(file) {
  return JSON.parse(readText(path.join(root, file)));
}

function collectDataRefs() {
  const members = parseJson("data/members.json");
  const projects = parseJson("data/projects.json");
  const gallery = parseJson("data/gallery.json");
  const refs = [];

  members.forEach((item) => {
    if (item.photo) {
      refs.push({ file: "data/members.json", ref: item.photo });
    }
  });

  projects.forEach((item) => {
    if (item.image) {
      refs.push({ file: "data/projects.json", ref: item.image });
    }
  });

  gallery.forEach((item) => {
    if (item.source) {
      refs.push({ file: "data/gallery.json", ref: item.source });
    }
  });

  return refs
    .filter(({ ref }) => !fs.existsSync(path.join(root, ref)))
    .map(({ file, ref }) => `${file} -> ${ref}`);
}

function ensureNoBrokenJson() {
  for (const file of dataFiles) {
    parseJson(file);
  }
}

function warnUnusedDuplicateAssets() {
  const duplicateDir = path.join(root, "assets", "js", "images");
  if (fs.existsSync(duplicateDir)) {
    console.warn(
      "[warn] Folder assets/js/images masih ada. Folder ini tidak dipakai deploy dan akan diabaikan saat build Pages.",
    );
  }
}

function main() {
  ensureNoBrokenJson();

  const missingHtmlRefs = collectHtmlRefs();
  const missingDataRefs = collectDataRefs();
  const failures = [...missingHtmlRefs, ...missingDataRefs];

  warnUnusedDuplicateAssets();

  if (failures.length) {
    console.error("Validasi site gagal:");
    failures.forEach((item) => console.error(`- ${item}`));
    process.exit(1);
  }

  console.log("Validasi site berhasil.");
}

main();
