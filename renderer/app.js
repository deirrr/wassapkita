// renderer/app.js
// Vue entry for Wassapkita (simple SPA-like structure)

import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js";

// =====================
// Dashboard sub-pages
// =====================
const HomeView = {
  name: "HomeView",
  template: `
    <div class="dash-body">
      <div style="max-width:720px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <div style="font-size:18px; font-weight:700;">HOME</div>

          <button
            class="btn-primary"
            :disabled="isExporting"
            @click="doExport"
          >
            {{ isExporting ? "Memproses..." : "Export Contact Wa to Excel" }}
          </button>
        </div>

        <div class="small-status" style="margin-top:10px;">
          {{ statusText }}
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      isExporting: false,
      statusText:
        "Klik tombol Export untuk menyimpan kontak menjadi file .xlsx.",
    };
  },
  methods: {
    async doExport() {
      if (!window.wassapkita?.exportContactsXlsx) {
        this.statusText =
          "Fitur export belum tersedia (preload belum terpasang).";
        return;
      }

      this.isExporting = true;
      this.statusText = "Mengambil kontak dari WhatsApp...";

      try {
        const res = await window.wassapkita.exportContactsXlsx();

        if (res?.cancelled) {
          this.statusText = "Dibatalkan.";
        } else if (res?.ok) {
          this.statusText = `Sukses: ${res.count || 0} kontak tersimpan di ${
            res.filePath
          }`;
        } else {
          this.statusText = "Gagal export kontak.";
        }
      } catch (e) {
        this.statusText = `Error: ${e?.message || e}`;
      } finally {
        this.isExporting = false;
      }
    },
  },
};

const BlastView = {
  name: "BlastView",
  template: `
    <div class="dash-body">
      BLAST
    </div>
  `,
};

const ChatbotView = {
  name: "ChatbotView",
  template: `
    <div class="dash-body">
      CHATBOT
    </div>
  `,
};

// =====================
// Dashboard view
// =====================
const DashboardView = {
  name: "DashboardView",
  props: ["me", "tab"],
  emits: ["tab-change"],
  computed: {
    displayNumber() {
      const n = this.me?.number || "";
      if (!n) return "-";
      return n.startsWith("+") ? n : `+${n}`;
    },
    tabComponent() {
      const map = {
        home: "HomeView",
        blast: "BlastView",
        chatbot: "ChatbotView",
      };
      return map[this.tab] || "HomeView";
    },
  },
  methods: {
    setTab(next) {
      this.$emit("tab-change", next);
    },
  },
  template: `
    <div class="dash-page">
      <div class="dash-topbar">
        <!-- LEFT: WA NUMBER = HOME -->
        <div class="dash-left">
          <a
            href="#"
            class="dash-link dash-link-wa"
            @click.prevent="setTab('home')"
          >
            {{ displayNumber }}
          </a>
        </div>

        <!-- RIGHT: MENU -->
        <div class="dash-right">
          <a
            href="#"
            class="dash-link"
            :class="{ 'dash-link-active': tab === 'blast' }"
            @click.prevent="setTab('blast')"
          >BLAST</a>
          <span class="dash-sep">|</span>

          <a
            href="#"
            class="dash-link"
            :class="{ 'dash-link-active': tab === 'chatbot' }"
            @click.prevent="setTab('chatbot')"
          >CHATBOT</a>
        </div>
      </div>

      <component :is="tabComponent" />
    </div>
  `,
};

// =====================
// Login / WhatsApp QR view
// =====================
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
          <img v-if="qrImage" :src="qrImage" alt="QR Code" />
          <div v-else class="status">
            Waiting for QR from WhatsApp...
          </div>
        </div>

        <div class="status">
          {{ statusText }}
        </div>

        <div v-if="meNumber" class="me-info">
          Connected as:
          <strong>{{ formattedNumber }}</strong>
          <span v-if="meName">({{ meName }})</span>
        </div>

        <div class="hint">
          Open <strong>WhatsApp &gt; Linked devices</strong>, then scan this code.
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
        if (String(status).toLowerCase().includes("disconnected: logout")) {
          this.qrImage = "";
          this.meNumber = "";
          this.meName = "";
        }
      });
    }

    if (window.wassapkita?.onMe) {
      window.wassapkita.onMe((me) => {
        if (!me) {
          this.meNumber = "";
          this.meName = "";
          return;
        }
        this.meNumber = me?.number || "";
        this.meName = me?.pushname || "";
        if (this.meNumber) this.statusText = "Connected to WhatsApp.";
      });
    }
  },
};

// =====================
// App shell
// =====================
const App = {
  name: "App",
  data() {
    return {
      currentView: "login",
      me: null,
      dashboardTab: "home",
    };
  },
  computed: {
    currentViewComponent() {
      return this.currentView === "dashboard" ? "DashboardView" : "LoginView";
    },
  },
  mounted() {
    if (window.wassapkita?.onMe) {
      window.wassapkita.onMe((me) => {
        if (!me) {
          this.me = null;
          this.currentView = "login";
          this.dashboardTab = "home";
          return;
        }
        this.me = me;
        if (me?.number) this.currentView = "dashboard";
      });
    }

    if (window.wassapkita?.onStatus) {
      window.wassapkita.onStatus((status) => {
        if (String(status).toLowerCase().includes("disconnected: logout")) {
          this.me = null;
          this.currentView = "login";
          this.dashboardTab = "home";
        }
      });
    }
  },
  template: `
    <component
      :is="currentViewComponent"
      :me="me"
      :tab="dashboardTab"
      @tab-change="dashboardTab = $event"
    />
  `,
};

createApp(App)
  .component("LoginView", LoginView)
  .component("DashboardView", DashboardView)
  .component("HomeView", HomeView)
  .component("BlastView", BlastView)
  .component("ChatbotView", ChatbotView)
  .mount("#app");
