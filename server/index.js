const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

dotenv.config();

const app = express();
const rootDir = path.resolve(__dirname, "..");
const storageDir = path.join(__dirname, "storage");
const uploadsDir = path.join(storageDir, "uploads");
const contentStorePath = path.join(storageDir, "content.json");
const htmlPages = [
  "index.html",
  "members.html",
  "member.html",
  "projects.html",
  "project.html",
  "gallery.html",
  "events.html",
  "about.html",
];
const dataPaths = {
  members: path.join(rootDir, "data", "members.json"),
  projects: path.join(rootDir, "data", "projects.json"),
  gallery: path.join(rootDir, "data", "gallery.json"),
  events: path.join(rootDir, "data", "events.json"),
  about: path.join(rootDir, "data", "about.json"),
};
const collectionKinds = new Set(["members", "projects", "gallery", "events"]);
const singletonKinds = new Set(["about"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

let writeQueue = Promise.resolve();

function boolFromEnv(value, fallback = false) {
  if (value == null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function normalizeOriginList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAdminCredentials() {
  return {
    username: String(process.env.ADMIN_USERNAME || "exrplones_admin").trim(),
    password: String(process.env.ADMIN_PASSWORD || "XRpl#Team2025").trim(),
  };
}

function getCloudinaryFolder(scope) {
  const baseFolder = String(process.env.CLOUDINARY_FOLDER || "exrplones").trim();
  const safeScope = String(scope || "misc")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");

  return safeScope ? `${baseFolder}/${safeScope}` : baseFolder;
}

function cloudinaryReady() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function configureCloudinary() {
  if (!cloudinaryReady()) {
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

async function ensureStorage() {
  await fsp.mkdir(storageDir, { recursive: true });
  await fsp.mkdir(uploadsDir, { recursive: true });

  if (!fs.existsSync(contentStorePath)) {
    const defaults = await loadDefaultContent();
    await fsp.writeFile(contentStorePath, `${JSON.stringify(defaults, null, 2)}\n`, "utf8");
  }
}

async function loadDefaultContent() {
  const entries = await Promise.all(
    Object.entries(dataPaths).map(async ([kind, filePath]) => {
      const raw = await fsp.readFile(filePath, "utf8");
      return [kind, JSON.parse(raw)];
    }),
  );

  return Object.fromEntries(entries);
}

async function readContentStore() {
  await ensureStorage();
  const raw = await fsp.readFile(contentStorePath, "utf8");
  return JSON.parse(raw);
}

async function writeContentStore(nextContent) {
  await ensureStorage();

  writeQueue = writeQueue.then(async () => {
    await fsp.writeFile(contentStorePath, `${JSON.stringify(nextContent, null, 2)}\n`, "utf8");
  });

  return writeQueue;
}

function getPublicBaseUrl(request) {
  const configured = String(process.env.PUBLIC_APP_URL || "").trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return `${request.protocol}://${request.get("host")}`;
}

function sanitizeFilename(name) {
  return String(name || "file")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "file";
}

function detectUploadExtension(file) {
  const originalExt = path.extname(String(file?.originalname || "")).trim();
  if (originalExt) {
    return originalExt.toLowerCase();
  }

  const mime = String(file?.mimetype || "").toLowerCase();
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("mp4")) return ".mp4";
  if (mime.includes("webm")) return ".webm";
  if (mime.includes("ogg")) return ".ogg";
  if (mime.includes("quicktime")) return ".mov";
  return "";
}

async function saveUploadLocally(file, scope, request) {
  const safeScope = String(scope || "misc")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "misc";
  const scopeDir = path.join(uploadsDir, safeScope);
  await fsp.mkdir(scopeDir, { recursive: true });

  const extension = detectUploadExtension(file);
  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${sanitizeFilename(
    path.basename(String(file?.originalname || "upload"), extension),
  )}${extension}`;
  const filePath = path.join(scopeDir, fileName);
  await fsp.writeFile(filePath, file.buffer);

  const relativePath = path.relative(uploadsDir, filePath).replace(/\\/g, "/");
  return {
    url: `${getPublicBaseUrl(request)}/uploads/${relativePath}`,
    filename: file.originalname || fileName,
    provider: "local",
    resourceType: String(file.mimetype || "").startsWith("video/") ? "video" : "image",
  };
}

async function uploadToCloudinary(file, scope) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: getCloudinaryFolder(scope),
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Upload Cloudinary gagal."));
          return;
        }

        resolve({
          url: result.secure_url,
          filename: file.originalname || result.original_filename || "media",
          provider: "cloudinary",
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      },
    );

    stream.end(file.buffer);
  });
}

function contentKindIsValid(kind) {
  return collectionKinds.has(kind) || singletonKinds.has(kind);
}

function authRequired(request, response, next) {
  if (request.session?.authenticated) {
    next();
    return;
  }

  response.status(401).json({ error: "Login admin diperlukan." });
}

function withJsonError(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

configureCloudinary();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = normalizeOriginList(process.env.CLIENT_ORIGIN);
      if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin tidak diizinkan untuk API ini."));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    name: "exrplones.sid",
    secret: String(process.env.SESSION_SECRET || "change-this-session-secret"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: String(process.env.COOKIE_SAME_SITE || "lax"),
      secure: boolFromEnv(process.env.COOKIE_SECURE, false),
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.get(
  "/api/health",
  withJsonError(async (request, response) => {
    const content = await readContentStore();
    response.json({
      ok: true,
      mode: cloudinaryReady() ? "cloudinary" : "local-upload",
      dataKinds: Object.keys(content),
    });
  }),
);

app.get("/api/auth/session", (request, response) => {
  response.json({
    authenticated: Boolean(request.session?.authenticated),
    username: request.session?.username || "",
  });
});

app.post("/api/auth/login", (request, response) => {
  const { username, password } = request.body || {};
  const admin = getAdminCredentials();

  if (
    String(username || "").trim() !== admin.username ||
    String(password || "").trim() !== admin.password
  ) {
    response.status(401).json({ error: "Username atau password belum sesuai." });
    return;
  }

  request.session.authenticated = true;
  request.session.username = admin.username;
  response.json({
    authenticated: true,
    username: admin.username,
  });
});

app.post("/api/auth/logout", (request, response) => {
  request.session.destroy(() => {
    response.clearCookie("exrplones.sid");
    response.json({ ok: true });
  });
});

app.get(
  "/api/content/:kind",
  withJsonError(async (request, response) => {
    const kind = String(request.params.kind || "").trim();
    if (!contentKindIsValid(kind)) {
      response.status(404).json({ error: "Jenis data tidak dikenal." });
      return;
    }

    const content = await readContentStore();
    response.json({
      data: content[kind],
    });
  }),
);

app.put(
  "/api/content/:kind",
  authRequired,
  withJsonError(async (request, response) => {
    const kind = String(request.params.kind || "").trim();
    if (!contentKindIsValid(kind)) {
      response.status(404).json({ error: "Jenis data tidak dikenal." });
      return;
    }

    const content = await readContentStore();
    const incoming = request.body?.data;

    if (collectionKinds.has(kind) && !Array.isArray(incoming)) {
      response.status(400).json({ error: "Data koleksi harus berbentuk array." });
      return;
    }

    if (singletonKinds.has(kind) && (incoming == null || Array.isArray(incoming))) {
      response.status(400).json({ error: "Data tunggal harus berbentuk object." });
      return;
    }

    content[kind] = incoming;
    await writeContentStore(content);
    response.json({
      data: content[kind],
    });
  }),
);

app.post(
  "/api/content/:kind/reset",
  authRequired,
  withJsonError(async (request, response) => {
    const kind = String(request.params.kind || "").trim();
    if (!contentKindIsValid(kind)) {
      response.status(404).json({ error: "Jenis data tidak dikenal." });
      return;
    }

    const content = await readContentStore();
    const defaults = await loadDefaultContent();
    content[kind] = defaults[kind];
    await writeContentStore(content);
    response.json({
      data: content[kind],
    });
  }),
);

app.post(
  "/api/uploads",
  authRequired,
  upload.single("file"),
  withJsonError(async (request, response) => {
    if (!request.file) {
      response.status(400).json({ error: "File upload belum dipilih." });
      return;
    }

    const scope = String(request.body?.scope || "misc").trim();
    const result = cloudinaryReady()
      ? await uploadToCloudinary(request.file, scope)
      : await saveUploadLocally(request.file, scope, request);

    response.status(201).json(result);
  }),
);

app.use("/uploads", express.static(uploadsDir));
app.use("/assets", express.static(path.join(rootDir, "assets")));
app.use("/components", express.static(path.join(rootDir, "components")));
app.use("/admin", express.static(path.join(rootDir, "admin")));
app.use("/data", express.static(path.join(rootDir, "data")));

app.get("/", (request, response) => {
  response.sendFile(path.join(rootDir, "index.html"));
});

for (const page of htmlPages) {
  app.get(`/${page}`, (request, response) => {
    response.sendFile(path.join(rootDir, page));
  });
}

app.use((request, response) => {
  if (request.accepts("html")) {
    response.status(404).sendFile(path.join(rootDir, "index.html"));
    return;
  }

  response.status(404).json({ error: "Resource tidak ditemukan." });
});

app.use((error, request, response, next) => {
  console.error(error);
  if (response.headersSent) {
    next(error);
    return;
  }

  response.status(500).json({
    error: "Terjadi masalah pada server.",
    detail: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

const port = Number(process.env.PORT || 3000);

ensureStorage()
  .then(() => {
    app.listen(port, () => {
      console.log(`EXRPLONES server aktif di http://127.0.0.1:${port}`);
    });
  })
  .catch((error) => {
    console.error("Gagal menyiapkan storage server.", error);
    process.exit(1);
  });
