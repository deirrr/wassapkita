<script>
export default {
  name: "LoginView",
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
</script>

<template>
  <div class="app-shell">
    <div class="card">
      <div class="title">Wassapkita</div>
      <div class="subtitle">Scan this QR code with your WhatsApp app.</div>

      <div class="qr-box">
        <img v-if="qrImage" :src="qrImage" alt="QR Code" />
        <div v-else class="status">Waiting for QR from WhatsApp...</div>
      </div>

      <div class="status">{{ statusText }}</div>

      <div v-if="meNumber" class="me-info">
        Connected as: <strong>{{ formattedNumber }}</strong>
        <span v-if="meName">({{ meName }})</span>
      </div>

      <div class="hint">
        Open <strong>WhatsApp &gt; Linked devices</strong>, then scan this code.
      </div>
    </div>
  </div>
</template>
