// renderer/app.js
// Vue entry for Wassapkita (simple SPA-like structure)

import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js";

// =====================
// Dashboard sub-pages
// =====================
const ContactView = {
  name: "ContactView",
  template: `
    <div class="dash-body">
      CONTACT
    </div>
  `,
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
        contact: "ContactView",
        blast: "BlastView",
        chatbot: "ChatbotView",
      };
      return map[this.tab] || "ContactView";
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
        <div class="dash-left">
          {{ displayNumber }}
        </div>

        <div class="dash-right">
          <a
            href="#"
            class="dash-link"
            :class="{ 'dash-link-active': tab === 'contact' }"
            @click.prevent="setTab('contact')"
          >CONTACT</a>
          <span class="dash-sep">|</span>

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

// =====================
// App shell
// =====================
const App = {
  name: "App",
  components: { LoginView },
  data() {
    return {
      currentView: "login", // future: 'login', 'dashboard', 'settings', etc.
      me: null,
      dashboardTab: "contact",
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
          this.me = null;
          this.currentView = "login";
          this.dashboardTab = "contact";
          return;
        }
        this.me = me;
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
          this.me = null;
          this.currentView = "login";
          this.dashboardTab = "contact";
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
  .component("ContactView", ContactView)
  .component("BlastView", BlastView)
  .component("ChatbotView", ChatbotView)
  .mount("#app");
