// renderer/app.js
// Vue entry for Wassapkita (simple SPA-like structure)

import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js";

// Blank Dashboard view
const DashboardView = {
  name: "DashboardView",
  template: `
  <h1>Dashboard</h1>
  <p>This is a placeholder for the dashboard view.</p>
  `,
};

// Login / WhatsApp QR view
const LoginView = {
  name: "LoginView",
  template: `
    <div class="app-shell">
      <div class="card">
        <div class="title">Wassapkita</div>
        <div class="subtitle">
          Scan this QR code with your WhatsApp app.
        </div>

        <div class="qr-box">
          <img
            v-if="qrImage"
            :src="qrImage"
            alt="QR Code"
          />
          <div v-else class="status">
            Waiting for QR from WhatsApp...
          </div>
        </div>

        <div class="status">
          {{ statusText }}
        </div>

        <div
          v-if="meNumber"
          class="me-info"
        >
          Connected as:
          <strong>{{ formattedNumber }}</strong>
          <span v-if="meName">({{ meName }})</span>
        </div>

        <div class="hint">
          Open <strong>WhatsApp &gt; Linked devices</strong>, then scan this code.
          The code will refresh automatically if it expires, like WhatsApp Web.
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      qrImage: "",
      statusText: "Waiting for QR from WhatsApp...",
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
        // if main sends an empty string, it means "reset QR"
        if (!dataUrl) {
          this.qrImage = "";
          this.statusText = "Waiting for QR from WhatsApp...";
          return;
        }

        this.qrImage = dataUrl;
        this.statusText = "QR is ready to scan.";
      });
    }

    if (window.wassapkita?.onStatus) {
      window.wassapkita.onStatus((status) => {
        this.statusText = `Status: ${status}`;

        // when logout, reset UI to be ready for a new QR
        const s = String(status || "");
        if (s.toLowerCase().includes("disconnected: logout")) {
          this.qrImage = "";
          this.meNumber = "";
          this.meName = "";
          // keep statusText showing the last status
        }
      });
    }

    if (window.wassapkita?.onMe) {
      window.wassapkita.onMe((me) => {
        // if main sends null -> reset
        if (!me) {
          this.meNumber = "";
          this.meName = "";
          return;
        }

        this.meNumber = me?.number || "";
        this.meName = me?.pushname || "";
        if (this.meNumber) {
          this.statusText = "Connected to WhatsApp.";
        }
      });
    }
  },
};

// App shell (later you can switch views: login, dashboard, etc.)
const App = {
  name: "App",
  components: { LoginView },
  data() {
    return {
      currentView: "login", // future: 'login', 'dashboard', 'settings', etc.
    };
  },
  computed: {
    currentViewComponent() {
      const map = {
        login: "LoginView",
        dashboard: "DashboardView",
      };
      return map[this.currentView] || "LoginView";
    },
  },
  mounted() {
    // switch view based on whatsapp session state (from main process)
    if (window.wassapkita?.onMe) {
      window.wassapkita.onMe((me) => {
        // me == null -> not logged in -> show login view
        if (!me) {
          this.currentView = "login";
          return;
        }
        // when we have a number, show dashboard
        const number = me?.number || "";
        if (number) this.currentView = "dashboard";
      });
    }

    // optional extra guard for LOGOUT status
    if (window.wassapkita?.onStatus) {
      window.wassapkita.onStatus((status) => {
        const s = String(status || "").toLowerCase();
        if (s.includes("disconnected: logout")) {
          this.currentView = "login";
        }
      });
    }
  },
  template: `
    <component :is="currentViewComponent" />
  `,
};

createApp(App)
  .component("LoginView", LoginView)
  .component("DashboardView", DashboardView)
  .mount("#app");
