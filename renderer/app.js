// renderer/app.js
// Entry Vue untuk Wassapkita (bisa dikembangkan jadi multi-halaman)

import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js";

const LoginView = {
  name: "LoginView",
  template: `
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
    if (window.wassapkita?.onQr) {
      window.wassapkita.onQr((dataUrl) => {
        this.qrImage = dataUrl;
        this.statusText = "QR siap di-scan.";
      });
    }

    if (window.wassapkita?.onStatus) {
      window.wassapkita.onStatus((status) => {
        this.statusText = `Status: ${status}`;
      });
    }

    if (window.wassapkita?.onMe) {
      window.wassapkita.onMe((me) => {
        this.meNumber = me?.number || "";
        this.meName = me?.pushname || "";
        if (this.meNumber) {
          this.statusText = "Terhubung ke WhatsApp.";
        }
      });
    }
  },
};

const App = {
  name: "App",
  components: { LoginView },
  template: `<login-view />`,
};

createApp(App).mount("#app");
