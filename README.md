# EXRPLONES

Portal static untuk anggota, galeri, kegiatan, dan panel admin EXRPLONES.

Live saat ini: `https://zky-master.github.io/exrplones-web/`

## Jalankan lokal

Gunakan local server, jangan buka file HTML langsung.

```powershell
python -m http.server 4173
```

Lalu buka `http://127.0.0.1:4173`.

## Validasi

```powershell
node scripts/validate-site.mjs
```

## Build folder publish

```powershell
node scripts/build-pages-dir.mjs
```

Hasil publish bersih ada di folder `_site`. Build ini otomatis mengabaikan aset duplikat yang tidak dipakai di `assets/js/images`.

## Publish ke GitHub Pages

Workflow deploy sudah disiapkan di `.github/workflows/deploy-pages.yml`.

Langkah publish:

1. Buat repository GitHub baru.
2. Tambahkan remote ke project ini.
3. Push branch `main`.
4. Di repository GitHub, aktifkan GitHub Pages dengan source `GitHub Actions`.

Contoh command setelah repo GitHub sudah ada:

```powershell
git remote add origin https://github.com/USERNAME/REPO.git
git add .
git commit -m "Prepare EXRPLONES for public deploy"
git push -u origin main
```

## Custom domain pendek

Kalau ingin pakai domain pendek seperti `exrplones.com`, domain itu harus aktif dulu di penyedia domain/DNS.

- Saat ini `exrplones.com` belum punya DNS aktif.
- Setelah domain aktif, arahkan DNS ke GitHub Pages.
- Baru setelah itu custom domain bisa dipasang di pengaturan Pages repository.

## Catatan penting admin

Panel admin saat ini masih berbasis `localStorage` browser. Artinya:

- perubahan dari admin hanya tersimpan di browser perangkat yang dipakai login
- perubahan itu belum otomatis menulis balik ke file `data/*.json`
- perubahan itu belum otomatis terlihat ke publik lintas perangkat setelah deploy

Kalau kamu mau admin yang benar-benar global untuk web publik, next step-nya perlu backend atau CMS yang terhubung ke hosting/repository.
