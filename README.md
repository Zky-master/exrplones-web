# EXRPLONES

Portal EXRPLONES dengan mode static dan mode full-stack.

Live saat ini: `https://zky-master.github.io/exrplones-web/`

## Mode yang tersedia

- Static mode:
  - cocok untuk preview cepat atau GitHub Pages
  - admin masih fallback ke browser/local storage kalau backend tidak aktif
- Full-stack mode:
  - memakai backend Express
  - admin login pakai session server
  - upload PP, project image, foto, dan video bisa jadi URL publik
  - publik dan admin membaca sumber data yang sama

## Jalankan lokal backend

1. Salin `.env.example` jadi `.env`
2. Isi nilai yang diperlukan
3. Install package
4. Jalankan server

```powershell
cmd /c npm install
cmd /c npm start
```

Lalu buka `http://127.0.0.1:3000`.

Kalau port `3000` bentrok, ganti di `.env`:

```env
PORT=4300
PUBLIC_APP_URL=http://127.0.0.1:4300
```

## Konfigurasi Cloudinary

Isi env berikut supaya upload media langsung masuk Cloudinary:

```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=exrplones
```

Kalau env Cloudinary belum diisi, backend tetap bisa upload file ke storage lokal server.

## Login admin backend

Default backend:

```text
username: exrplones_admin
password: XRpl#Team2025
```

Sebaiknya ganti lewat `.env`:

```env
ADMIN_USERNAME=exrplones_admin
ADMIN_PASSWORD=XRpl#Team2025
SESSION_SECRET=ganti-ke-random-string-yang-panjang
```

## Validasi

```powershell
node scripts/validate-site.mjs
```

## Build folder publish

```powershell
node scripts/build-pages-dir.mjs
```

Hasil publish bersih ada di folder `_site`. Build ini otomatis mengabaikan aset duplikat yang tidak dipakai di `assets/js/images`.

## Deploy backend

Repo ini sudah punya `render.yaml`, jadi paling mudah deploy full-stack lewat Render:

1. Push repo ke GitHub
2. Import repo ke Render sebagai `Web Service`
3. Render akan pakai:
   - build command: `npm install`
   - start command: `npm start`
4. Isi environment variables dari `.env.example`
5. Setelah deploy berhasil, buka URL `onrender.com` dari service itu

Catatan:

- Untuk admin lintas perangkat, frontend dan backend paling aman disajikan dari origin yang sama.
- Kalau backend dipisah origin dengan frontend, atur `CLIENT_ORIGIN`, `COOKIE_SAME_SITE=none`, dan `COOKIE_SECURE=true`.
- Media publik paling aman pakai Cloudinary.
- Data konten backend saat ini disimpan di file `server/storage/content.json`, jadi untuk production jangka panjang sebaiknya pakai persistent disk atau database.

## Publish GitHub Pages

Workflow deploy GitHub Pages tetap ada di `.github/workflows/deploy-pages.yml` untuk mode static.

Contoh:

```powershell
git remote add origin https://github.com/USERNAME/REPO.git
git add .
git commit -m "Prepare EXRPLONES for public deploy"
git push -u origin main
```

## Custom domain pendek

Kalau ingin pakai domain pendek seperti `exrplones.com`, domain itu harus aktif dulu di penyedia domain/DNS. Saat ini `exrplones.com` belum punya DNS aktif.

Rekomendasi sekarang:

- pakai custom domain di backend host full-stack, bukan GitHub Pages
- arahkan root domain `exrplones.com` ke web service backend
- arahkan `www.exrplones.com` ke host yang sama lalu redirect ke root domain
- verifikasi domain di dashboard host setelah DNS aktif

## Catatan penting admin

Kalau backend tidak aktif, admin otomatis fallback ke `localStorage` browser seperti mode lama.
