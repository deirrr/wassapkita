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
  data() {
    return {
      step: "upload", // upload | template | setting | send
      steps: [
        { key: "upload", label: "1 Upload Contact" },
        { key: "template", label: "2 Template" },
        { key: "setting", label: "3 Setting" },
        { key: "send", label: "4 Send" },
      ],

      // upload state
      contactFile: null,
      cpntactFileName: "",
      uploadError: "",
    };
  },
  methods: {
    setStep(k) {
      this.step = k;
    },

    openContactPicker() {
      this.uploadError = "";
      if (this.$refs.contactInput) {
        this.$refs.contactInput.click();
      }
    },

    onContactFileChange(e) {
      this.uploadError = "";
      const file = e.target.files?.[0];
      if (!file) return;

      const name = (file.name || "").toLowerCase();
      const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");

      if (!isExcel) {
        this.contactFile = null;
        this.cpntactFileName = "";
        this.uploadError =
          "Unsupported file type. Only .xlsx and .xls are supported";
        e.target.value = "";
        return;
      }
      this.contactFile = file;
      this.cpntactFileName = file.name;
    },
  },
  template: `
    <div class="dash-body">
      <div class="blast-steps">
        <button
          v-for="s in steps"
          :key="s.key"
          class="blast-step"
          :class="{ 'blast-step-active': step === s.key }"
          type="button"
          @click="setStep(s.key)"
        >
          <span class="blast-step-label">{{ s.label }}</span>
        </button>
      </div>

      <div class="blast-step-content">
        <div v-if="step === 'upload'" class="blast-panel">
          <div class="blast-title">Upload Contact</div>
          <div class="blast-subtitle">Unggah file Excel berisi daftar kontak.</div>

          <input
            ref="contactInput"
            type="file"
            accept=".xlsx,.xls"
            style="display:none"
            @change="onContactFileChange"
          />

          <div style="margin-top:12px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <button
              type="button"
              class="btn"
              @click="openContactPicker"
            >
              Upload Contact (Excel)
            </button>

            <div v-if="contactFileName" class="blast-subtitle" style="margin:0;">
              File: {{ contactFileName }}
            </div>
          </div>

          <div v-if="uploadError" class="blast-subtitle" style="margin-top:10px; color:#fca5a5;">
            {{ uploadError }}
          </div>
        </div>

        <div v-else-if="step === 'template'" class="blast-panel">
          <div class="blast-title">Template</div>
          <div class="blast-subtitle">ini adalah halaman template</div>
        </div>

        <div v-else-if="step === 'setting'" class="blast-panel">
          <div class="blast-title">Setting</div>
          <div class="blast-subtitle">ini adalah halaman setting</div>
        </div>

        <div v-else-if="step === 'send'" class="blast-panel">
          <div class="blast-title">Send</div>
          <div class="blast-subtitle">ini adalah halaman send</div>
        </div>
      </div>
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
    iconSvg(name) {
      // inline SVG biar tanpa dependency
      // stroke mengikuti currentColor
      if (name === "wa") {
        return `
          <svg class="icon-12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7.5 20.5l1-3.2a8.5 8.5 0 1 1 3.5 1.2l-4.0 2.0z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9.6 9.7c.2-.4.4-.4.6-.4.1 0 .3 0 .4.1.1.1.3.5.4.8.1.3.2.6.1.7-.1.2-.3.4-.4.6-.1.1-.2.2-.1.4.3.6 1.1 1.5 1.7 1.8.2.1.3 0 .4-.1l.6-.5c.2-.1.4-.1.6 0 .2.1 1.1.5 1.3.6.2.1.3.2.3.4 0 .2-.1.7-.4 1-.3.3-.8.6-1.4.6-1.2 0-2.8-.7-4.4-2.2-1.2-1.2-2-2.6-2-3.6 0-.6.2-1.1.5-1.4z" fill="currentColor" opacity="0.75"/>
          </svg>
        `;
      }

      if (name === "blast") {
        return `
          <svg class="icon-12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M10 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.5 8.5l1.5-1.5M18.5 15.5l1.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        `;
      }

      if (name === "chatbot") {
        return `
          <svg class="icon-12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 7.5h10a3 3 0 0 1 3 3V13a3 3 0 0 1-3 3H11l-3.5 2v-2H7a3 3 0 0 1-3-3v-2.5a3 3 0 0 1 3-3z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 11.5h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        `;
      }

      // fallback icon
      return `
        <svg class="icon-12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9z" stroke="currentColor" stroke-width="1.8"/>
        </svg>
      `;
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
            <span v-html="iconSvg('wa')"></span>
            <span>{{ displayNumber }}</span>
          </a>
        </div>

        <!-- RIGHT: MENU -->
        <div class="dash-right">
          <a
            href="#"
            class="dash-link"
            :class="{ 'dash-link-active': tab === 'blast' }"
            @click.prevent="setTab('blast')"
          >
            <span v-html="iconSvg('blast')"></span>
            <span>BLAST</span>
          </a>
          <span class="dash-sep">|</span>

          <a
            href="#"
            class="dash-link"
            :class="{ 'dash-link-active': tab === 'chatbot' }"
            @click.prevent="setTab('chatbot')"
          >
            <span v-html="iconSvg('chatbot')"></span>
            <span>CHATBOT</span>
          </a>
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
