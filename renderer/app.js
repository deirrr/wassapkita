// renderer/app.js
// Entry Vue untuk Wassapkita (struktur ala SPA sederhana)

import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js";

// Halaman login / QR WhatsApp
const LoginView = {
  name: "LoginView",
  template: `
    <div class="app-shell">
      <div class="card">
        <div class="title">Wassapkita</div>
        <div class="subtitle">
          Scan QR berikut dengan aplikasi WhatsApp kamu.
        </div>

        <div class="qr-box">
          <img
            v-if="qrImage"
            :src="qrImage"
            alt="QR Code"
          />
          <div v-else class="status">
            Menunggu QR dari WhatsApp...
          </div>
        </div>

        <div class="status">
          {{ statusText }}
        </div>

        <div
          v-if="meNumber"
          class="me-info"
        >
          Terhubung sebagai:
          <strong>{{ formattedNumber }}</strong>
          <span v-if="meName">({{ meName }})</span>
        </div>

        <div class="hint">
          Buka <strong>WhatsApp &gt; Perangkat tertaut</strong>, lalu scan kode ini.
          Kode akan otomatis berganti jika kedaluwarsa, seperti di WhatsApp Web.
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      qrImage: "",
      statusText: "Menunggu QR dari WhatsApp...",
      meNumber: "",
      meName: "",
    };
  },
  computed: {
    formattedNumber() {
      if (!this.meNumber) return "";
      if (this.meNumber.startsWith("+")) return this.meNumber;
      return "+" + this.meNumber;
    },
  },
  mounted() {
    // di dalam mounted() LoginView

    if (window.wassapkita?.onQr) {
      window.wassapkita.onQr((dataUrl) => {
        // kalau main ngirim string kosong, artinya reset QR
        if (!dataUrl) {
          this.qrImage = "";
          this.statusText = "Menunggu QR dari WhatsApp...";
          return;
        }

        this.qrImage = dataUrl;
        this.statusText = "QR siap di-scan.";
      });
    }

    if (window.wassapkita?.onStatus) {
      window.wassapkita.onStatus((status) => {
        this.statusText = `Status: ${status}`;

        // saat logout, reset biar siap scan ulang
        const s = String(status || "");
        if (s.toLowerCase().includes("disconnected: logout")) {
          this.qrImage = "";
          this.meNumber = "";
          this.meName = "";
          // statusText tetap boleh menunjukkan status terakhir
        }
      });
    }

    if (window.wassapkita?.onMe) {
      window.wassapkita.onMe((me) => {
        // kalau main ngirim null -> reset
        if (!me) {
          this.meNumber = "";
          this.meName = "";
          return;
        }

        this.meNumber = me?.number || "";
        this.meName = me?.pushname || "";
        if (this.meNumber) {
          this.statusText = "Terhubung ke WhatsApp.";
        }
      });
    }
  },
};

// App shell, nanti bisa ganti-ganti view: login, dashboard, dst.
const App = {
  name: "App",
  components: { LoginView },
  data() {
    return {
      currentView: "login", // ke depan bisa: 'login', 'dashboard', 'settings', dll.
    };
  },
  computed: {
    currentViewComponent() {
      const map = {
        login: "LoginView",
      };
      return map[this.currentView] || "LoginView";
    },
  },
  template: `
    <component :is="currentViewComponent" />
  `,
};

createApp(App).component("LoginView", LoginView).mount("#app");
