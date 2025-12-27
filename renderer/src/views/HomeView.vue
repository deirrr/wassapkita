<script>
export default {
  name: "HomeView",
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

        if (res?.cancelled) this.statusText = "Dibatalkan.";
        else if (res?.ok)
          this.statusText = `Sukses: ${res.count || 0} kontak tersimpan di ${
            res.filePath
          }`;
        else this.statusText = res?.error || "Gagal export kontak.";
      } catch (e) {
        this.statusText = `Error: ${e?.message || e}`;
      } finally {
        this.isExporting = false;
      }
    },
  },
};
</script>

<template>
  <div class="dash-body">
    <div style="max-width: 720px">
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        "
      >
        <div style="font-size: 18px; font-weight: 700">HOME</div>

        <button class="btn-primary" :disabled="isExporting" @click="doExport">
          {{ isExporting ? "Memproses..." : "Export Contact Wa to Excel" }}
        </button>
      </div>

      <div class="small-status" style="margin-top: 10px">
        {{ statusText }}
      </div>
    </div>
  </div>
</template>
