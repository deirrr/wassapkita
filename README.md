# Wassapkita

Aplikasi desktop open-source untuk otomasi WhatsApp berbasis WhatsApp Web.  
Dibangun dengan Electron, Node.js, dan Vue.

Wassapkita dirancang agar pengguna non-teknis bisa mengirim pesan WhatsApp secara efisien melalui aplikasi desktop—tanpa perlu instal Node.js atau melakukan proses konfigurasi teknis.  
Developer dapat berkontribusi secara langsung melalui repositori ini.

---

## Status Proyek

Proyek saat ini sudah berada pada tahap awal tetapi *sudah memiliki fitur inti* pertama, yaitu:

### ✔ Login WhatsApp via QR (mirip WhatsApp Web)
- QR otomatis berganti setiap beberapa detik (expiry cycle WhatsApp)
- Sesi login tersimpan menggunakan `LocalAuth`
- Saat login berhasil, aplikasi menampilkan nomor WhatsApp & nama akun

Fitur rencana selanjutnya:

- Pengiriman pesan individual melalui UI
- Broadcast / kirim massal dari file Excel (dengan jeda aman)
- Template pesan (reminder, ucapan, follow-up pasien, dll)
- Log pesan terkirim dan export hasil
- Halaman dashboard
- Manajemen perangkat & auto reconnect

---

## Teknologi yang Digunakan

- **Electron** — Kemasan aplikasi desktop
- **Node.js** — Backend internal & koneksi WhatsApp
- **Vue 3 (SPA style)** — Antarmuka pengguna (renderer)
- **whatsapp-web.js** — Integrasi WhatsApp Web + QR Login
- **LocalAuth** — Penyimpanan sesi login WhatsApp

---

## Struktur Proyek (Saat Ini)

Struktur sudah mulai modular dan terpisah antara:
- proses utama (Electron)
- renderer (Vue)
- asset CSS

```

wassapkita/
├─ main.js                 # Entry utama Electron (backend + WA client)
├─ preload.js              # Jembatan IPC ke renderer
├─ index.html              # Shell HTML utama
├─ renderer/
│  ├─ app.js               # Entry Vue (SPA sederhana)
│  └─ app.css              # Styling utama aplikasi
├─ package.json
└─ .gitignore

````

Struktur ini memudahkan penambahan halaman lain:
- Dashboard
- Settings
- Broadcast page
- Template manager
- Log viewer

---

## Roadmap

Tahapan pengembangan selanjutnya:

### 1. UI Dasar & Routing Sederhana
- Menambahkan router sederhana untuk login → dashboard
- Menampilkan status koneksi real-time

### 2. Fitur WhatsApp
- Kirim pesan ke 1 nomor
- Kirim broadcast Excel
- Template pesan
- Jeda aman (anti-ban)

### 3. Tools & Utility
- Log aktifitas
- Export laporan
- Pengaturan aplikasi & folder penyimpanan

### 4. Packaging & Distribusi
- Build installer `.exe` menggunakan `electron-builder`
- Auto-update (opsional)
- CI/CD untuk auto-release ke GitHub

---

## Menjalankan Secara Lokal (Development)

1. Clone repositori:

```bash
git clone https://github.com/deirrr/wassapkita.git
cd wassapkita
````

2. Install dependency:

```bash
npm install
```

3. Jalankan aplikasi:

```bash
npm start
```

Aplikasi akan membuka window Electron dengan halaman login QR.

---

## Kontribusi

Kontribusi sangat terbuka untuk semua orang.

Kamu bisa:

* Membuat **issue** (bug, fitur baru, diskusi)
* Mengirim **pull request**
* Membantu dokumentasi
* Memberi masukan terkait UX / UI dan arsitektur

`CONTRIBUTING.md` akan ditambahkan setelah struktur inti stabil.

---

## Lisensi

Proyek ini direncanakan menggunakan lisensi **MIT**.
File `LICENSE` akan ditambahkan pada rilis mendatang.

---

## Kredit & Pengembang

Dikembangkan oleh komunitas open-source Indonesia.
Aplikasi ini dibuat untuk membantu bisnis, klinik, UMKM, dan para developer yang membutuhkan otomasi WhatsApp yang **etis, aman, dan mudah digunakan**.

