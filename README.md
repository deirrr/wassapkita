# Wassapkita

Aplikasi desktop open-source untuk otomasi WhatsApp berbasis WhatsApp Web. Dibangun dengan Electron, Node.js, dan Vue.
Wassapkita dirancang agar pengguna non-teknis bisa mengirim pesan WhatsApp secara efisien melalui aplikasi desktop, tanpa perlu instal Node.js atau konfigurasi teknis lainnya. Developer tetap dapat berkontribusi melalui repositori ini.

---

## Status Proyek

Saat ini proyek berada pada tahap awal.  
Versi pertama baru menampilkan jendela Electron sederhana dengan teks **"Hello Wassapkita"**.

Fitur yang direncanakan pada versi-versi selanjutnya:

- Integrasi WhatsApp Web menggunakan `whatsapp-web.js`
- Manajemen sesi login (scan QR sekali, sesi tersimpan)
- Pengiriman pesan individual melalui UI
- Pengiriman pesan broadcast dengan daftar kontak (EXCEL)
- Template pesan (reminder, ucapan, pemberitahuan, dll)
- Log pesan terkirim dan export laporan

---

## Teknologi yang Digunakan

- **Electron** — untuk aplikasi desktop
- **Node.js** — backend internal aplikasi
- **(Rencana)** Vue 3 + Vite — frontend UI
- **(Rencana)** whatsapp-web.js — integrasi WhatsApp Web

---

## Struktur Proyek (Sementara)

Saat ini struktur masih minimal:

```
wassapkita/
├─ main.js          # Entry utama Electron
├─ preload.js       # Jembatan IPC (masih kosong)
├─ index.html       # Tampilan awal (Hello Wassapkita)
├─ package.json     # Konfigurasi proyek
└─ .gitignore
```

Struktur akan diperluas setelah integrasi Vue dan WhatsApp API ditambahkan.

---

## Roadmap

Tahapan berikutnya yang akan dikembangkan:

1. Merapikan struktur project (memisahkan folder Electron & frontend)
2. Setup Vue 3 + Vite sebagai UI utama
3. Integrasi `whatsapp-web.js`:

   * Scan QR
   * Menyimpan sesi login (LocalAuth)
   * Kirim pesan dari UI
4. Fitur broadcast (dengan jeda aman & anti-ban)
5. Template pesan & variabel dinamis
6. Log pesan terkirim
7. Build installer `.exe` menggunakan `electron-builder`
8. CI/CD untuk auto-release ke GitHub

---

## Kontribusi

Kontribusi sangat terbuka untuk semua orang.

Kamu bisa:

* Membuat **issue** (bug, fitur baru, diskusi)
* Mengirim **pull request**
* Membantu dokumentasi
* Memberi masukan arsitektur atau UX

Panduan kontribusi resmi (CONTRIBUTING.md) akan ditambahkan setelah struktur utama stabil.

---

## Lisensi

Proyek ini direncanakan menggunakan lisensi **MIT**.
File LICENSE akan ditambahkan pada rilis mendatang.

---

## Kredit & Pengembang

Dikembangkan oleh komunitas open-source Indonesia.
Aplikasi ini dibuat untuk membantu bisnis, klinik, UMKM, dan developer yang membutuhkan otomasi WhatsApp dengan cara yang etis dan aman.

