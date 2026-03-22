import fs from "fs";
import path from "path";

const root = process.cwd();
const outDir = path.join(root, "_site");
const includeEntries = [
  "index.html",
  "members.html",
  "member.html",
  "projects.html",
  "project.html",
  "gallery.html",
  "events.html",
  "about.html",
  "admin",
  "assets",
  "components",
  "data",
];

function shouldSkip(relativePath) {
  return (
    relativePath === "_site" ||
    relativePath.startsWith(`assets${path.sep}js${path.sep}images`)
  );
}

function copyRecursive(source, destination) {
  const stats = fs.statSync(source);
  const relative = path.relative(root, source);

  if (relative && shouldSkip(relative)) {
    return;
  }

  if (stats.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(
        path.join(source, entry),
        path.join(destination, entry),
      );
    }
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function main() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  for (const entry of includeEntries) {
    copyRecursive(path.join(root, entry), path.join(outDir, entry));
  }

  fs.writeFileSync(path.join(outDir, ".nojekyll"), "", "utf8");
  console.log(`Build Pages selesai di ${outDir}`);
}

main();
