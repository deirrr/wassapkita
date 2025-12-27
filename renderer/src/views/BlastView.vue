<script>
export default {
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
      isPicking: false,
      contactFileName: "",
      uploadError: "",
      contacts: [], // {name, no_wa}

      // template
      templateText: "Halo {name}, ini pesan dari Wassapkita.",
      templateError: "",

      // setting
      delayMinMs: 1200,
      delayMaxMs: 2500,
      addCountry: true,
      countryCode: "62",
      skipIfNoName: true,

      // send/progress
      isSending: false,
      sendError: "",
      progressText: "",
      progressStats: { total: 0, sent: 0, failed: 0, current: 0 },
      logs: [], // {index,name,no_wa,status,error}
    };
  },
  computed: {
    canNext() {
      return Array.isArray(this.contacts) && this.contacts.length > 0;
    },
  },
  mounted() {
    if (window.wassapkita?.onBlastProgress) {
      window.wassapkita.onBlastProgress((p) => {
        if (!p) return;

        if (p.type === "start") {
          this.progressStats = {
            total: p.total || 0,
            sent: p.sent || 0,
            failed: p.failed || 0,
            current: p.current || 0,
          };
          this.progressText = p.message || "Blast dimulai...";
          this.logs = [];
          return;
        }

        this.progressStats = {
          total: p.total || this.progressStats.total,
          sent: p.sent ?? this.progressStats.sent,
          failed: p.failed ?? this.progressStats.failed,
          current: p.current ?? this.progressStats.current,
        };

        if (p.type === "delay") {
          this.progressText = p.message || this.progressText;
          return;
        }

        if (p.type === "item" && p.item) {
          this.progressText = p.message || this.progressText;
          this.logs.unshift(p.item);
        }
      });
    }

    if (window.wassapkita?.onBlastDone) {
      window.wassapkita.onBlastDone((res) => {
        if (!res) return;
        this.isSending = false;

        if (res.cancelled) {
          this.progressText = `Dihentikan. Sent ${res.sent || 0}, Failed ${
            res.failed || 0
          }.`;
        } else {
          this.progressText = `Selesai. Sent ${res.sent || 0}, Failed ${
            res.failed || 0
          }.`;
        }
      });
    }
  },
  methods: {
    setStep(k) {
      this.step = k;
    },

    async pickAndLoadContacts() {
      this.uploadError = "";
      this.contactFileName = "";
      this.contacts = [];

      if (!window.wassapkita?.importContactsXlsx) {
        this.uploadError =
          "Fitur import belum tersedia (preload belum terpasang).";
        return;
      }

      this.isPicking = true;

      try {
        const res = await window.wassapkita.importContactsXlsx();

        if (res?.cancelled) {
          this.uploadError = "Dibatalkan.";
          return;
        }

        if (!res?.ok) {
          this.uploadError = res?.error || "Gagal membaca file Excel.";
          return;
        }

        this.contactFileName = res.fileName || "contacts.xlsx";
        this.contacts = Array.isArray(res.rows) ? res.rows : [];

        if (this.contacts.length === 0) {
          this.uploadError =
            "File terbaca, tapi tidak ada data kontak yang valid.";
        }
      } catch (e) {
        this.uploadError = `Error: ${e?.message || e}`;
      } finally {
        this.isPicking = false;
      }
    },

    goNextFromUpload() {
      if (!this.canNext) return;
      this.setStep("template");
    },

    goToSetting() {
      this.templateError = "";
      const t = String(this.templateText || "").trim();
      if (!t) {
        this.templateError = "Template pesan tidak boleh kosong.";
        return;
      }
      this.setStep("setting");
    },

    goToSend() {
      this.sendError = "";
      const min = Number(this.delayMinMs);
      const max = Number(this.delayMaxMs);

      if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || max < 0) {
        this.sendError = "Delay harus angka >= 0.";
        return;
      }
      if (min > max) {
        this.sendError = "Delay min tidak boleh lebih besar dari delay max.";
        return;
      }

      this.setStep("send");
    },

    async startBlast() {
      this.sendError = "";

      if (!window.wassapkita?.sendBlast) {
        this.sendError =
          "Fitur blast belum tersedia (preload belum terpasang).";
        return;
      }

      const template = String(this.templateText || "").trim();
      if (!template) {
        this.sendError = "Template pesan kosong.";
        return;
      }

      if (!Array.isArray(this.contacts) || this.contacts.length === 0) {
        this.sendError = "Kontak kosong.";
        return;
      }

      this.isSending = true;
      this.progressText = "Menyiapkan blast...";
      this.logs = [];

      try {
        const safeContacts = this.contacts.map((c) => ({
          name: String(c?.name || "").trim(),
          no_wa: String(c?.no_wa || "").trim(),
        }));

        const payload = {
          contacts: safeContacts,
          template: String(template),
          delayMinMs: Number(this.delayMinMs) || 0,
          delayMaxMs: Number(this.delayMaxMs) || 0,
          addCountry: Boolean(this.addCountry),
          countryCode: String(this.countryCode || "").trim(),
          skipIfNoName: Boolean(this.skipIfNoName),
        };

        const res = await window.wassapkita.sendBlast(payload);

        if (!res?.ok) {
          this.isSending = false;
          this.sendError = res?.error || "Gagal memulai blast.";
        }
      } catch (e) {
        this.isSending = false;
        this.sendError = `Error: ${e?.message || e}`;
      }
    },

    stopBlast() {
      if (!window.wassapkita?.cancelBlast) return;
      window.wassapkita.cancelBlast();
      this.progressText = "Meminta stop... (tunggu proses berhenti)";
    },

    resetAll() {
      if (this.isSending) return;

      this.step = "upload";
      this.isPicking = false;
      this.contactFileName = "";
      this.uploadError = "";
      this.contacts = [];

      this.templateText = "Halo {name}, ini pesan dari Wassapkita.";
      this.templateError = "";

      this.delayMinMs = 1200;
      this.delayMaxMs = 2500;
      this.addCountry = true;
      this.countryCode = "62";
      this.skipIfNoName = true;

      this.isSending = false;
      this.sendError = "";
      this.progressText = "";
      this.progressStats = { total: 0, sent: 0, failed: 0, current: 0 };
      this.logs = [];
    },
  },
};
</script>

<template>
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
        <div class="blast-subtitle">
          Unggah file Excel (.xlsx) berisi kolom name/nama dan no_wa/phone.
        </div>

        <div
          style="
            margin-top: 12px;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          "
        >
          <button
            type="button"
            class="btn"
            :disabled="isPicking"
            @click="pickAndLoadContacts"
          >
            {{ isPicking ? "Membaca Excel..." : "Upload Contact (Excel)" }}
          </button>

          <div v-if="contactFileName" class="blast-subtitle" style="margin: 0">
            File: {{ contactFileName }} ({{ contacts.length }} kontak)
          </div>
        </div>

        <div
          v-if="uploadError"
          class="blast-subtitle"
          style="margin-top: 10px; color: #fca5a5"
        >
          {{ uploadError }}
        </div>

        <div v-if="contacts.length" style="margin-top: 14px">
          <div class="blast-subtitle" style="margin-bottom: 8px">
            Preview (maks 20 data pertama)
          </div>

          <div
            style="
              overflow: auto;
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 12px;
            "
          >
            <table
              style="width: 100%; border-collapse: collapse; font-size: 13px"
            >
              <thead>
                <tr>
                  <th
                    style="
                      text-align: left;
                      padding: 10px;
                      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    "
                  >
                    name
                  </th>
                  <th
                    style="
                      text-align: left;
                      padding: 10px;
                      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    "
                  >
                    no_wa
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(c, idx) in contacts.slice(0, 20)" :key="idx">
                  <td
                    style="
                      padding: 10px;
                      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    "
                  >
                    {{ c.name }}
                  </td>
                  <td
                    style="
                      padding: 10px;
                      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    "
                  >
                    {{ c.no_wa }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            style="margin-top: 12px; display: flex; justify-content: flex-end"
          >
            <button
              type="button"
              class="btn-primary"
              :disabled="!canNext"
              @click="goNextFromUpload"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="step === 'template'" class="blast-panel">
        <div class="blast-title">Template</div>
        <div class="blast-subtitle">
          Gunakan placeholder {name} dan {no_wa} jika perlu.
        </div>

        <div style="margin-top: 12px">
          <textarea
            v-model="templateText"
            rows="6"
            style="
              width: 100%;
              resize: vertical;
              border-radius: 12px;
              padding: 12px;
              border: 1px solid rgba(255, 255, 255, 0.1);
              background: rgba(2, 6, 23, 0.6);
              color: #e5e7eb;
            "
            placeholder="Tulis pesan di sini..."
          ></textarea>
        </div>

        <div
          v-if="templateError"
          class="blast-subtitle"
          style="margin-top: 10px; color: #fca5a5"
        >
          {{ templateError }}
        </div>

        <div
          style="
            margin-top: 12px;
            display: flex;
            justify-content: space-between;
            gap: 10px;
          "
        >
          <button type="button" class="btn" @click="setStep('upload')">
            Back
          </button>
          <button type="button" class="btn-primary" @click="goToSetting">
            Next
          </button>
        </div>
      </div>

      <div v-else-if="step === 'setting'" class="blast-panel">
        <div class="blast-title">Setting</div>
        <div class="blast-subtitle">
          Delay random membantu mengurangi pola spam.
        </div>

        <div
          style="
            margin-top: 12px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          "
        >
          <div>
            <div class="blast-subtitle" style="margin: 0 0 6px 0">
              Delay min (ms)
            </div>
            <input
              v-model="delayMinMs"
              type="number"
              min="0"
              style="
                width: 100%;
                border-radius: 12px;
                padding: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(2, 6, 23, 0.6);
                color: #e5e7eb;
              "
            />
          </div>

          <div>
            <div class="blast-subtitle" style="margin: 0 0 6px 0">
              Delay max (ms)
            </div>
            <input
              v-model="delayMaxMs"
              type="number"
              min="0"
              style="
                width: 100%;
                border-radius: 12px;
                padding: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(2, 6, 23, 0.6);
                color: #e5e7eb;
              "
            />
          </div>
        </div>

        <div
          style="
            margin-top: 12px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: center;
          "
        >
          <label
            class="blast-subtitle"
            style="margin: 0; display: flex; gap: 8px; align-items: center"
          >
            <input type="checkbox" v-model="addCountry" />
            Auto tambah kode negara (jika nomor diawali 0)
          </label>

          <div
            v-if="addCountry"
            style="display: flex; gap: 8px; align-items: center"
          >
            <div class="blast-subtitle" style="margin: 0">Kode negara</div>
            <input
              v-model="countryCode"
              type="text"
              style="
                width: 80px;
                border-radius: 12px;
                padding: 8px 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(2, 6, 23, 0.6);
                color: #e5e7eb;
              "
              placeholder="62"
            />
          </div>

          <label
            class="blast-subtitle"
            style="margin: 0; display: flex; gap: 8px; align-items: center"
          >
            <input type="checkbox" v-model="skipIfNoName" />
            Skip jika nama kosong
          </label>
        </div>

        <div
          v-if="sendError"
          class="blast-subtitle"
          style="margin-top: 10px; color: #fca5a5"
        >
          {{ sendError }}
        </div>

        <div
          style="
            margin-top: 12px;
            display: flex;
            justify-content: space-between;
            gap: 10px;
          "
        >
          <button type="button" class="btn" @click="setStep('template')">
            Back
          </button>
          <button type="button" class="btn-primary" @click="goToSend">
            Next
          </button>
        </div>
      </div>

      <div v-else-if="step === 'send'" class="blast-panel">
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          "
        >
          <div>
            <div class="blast-title" style="margin-bottom: 4px">Send</div>
            <div class="blast-subtitle" style="margin: 0">
              Total: {{ contacts.length }} | Sent: {{ progressStats.sent }} |
              Failed:
              {{ progressStats.failed }}
            </div>
          </div>

          <div style="display: flex; gap: 10px; align-items: center">
            <button
              type="button"
              class="btn-primary"
              :disabled="isSending"
              @click="startBlast"
            >
              {{ isSending ? "Mengirim..." : "Start Blast" }}
            </button>

            <button
              type="button"
              class="btn"
              :disabled="!isSending"
              @click="stopBlast"
            >
              Stop
            </button>
          </div>
        </div>

        <div class="small-status" style="margin-top: 10px">
          {{ progressText || "Siap mengirim." }}
        </div>

        <div
          v-if="sendError"
          class="blast-subtitle"
          style="margin-top: 10px; color: #fca5a5"
        >
          {{ sendError }}
        </div>

        <div
          style="
            margin-top: 12px;
            overflow: auto;
            max-height: 280px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
          "
        >
          <table
            style="width: 100%; border-collapse: collapse; font-size: 13px"
          >
            <thead>
              <tr>
                <th
                  style="
                    text-align: left;
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    width: 70px;
                  "
                >
                  #
                </th>
                <th
                  style="
                    text-align: left;
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                  "
                >
                  name
                </th>
                <th
                  style="
                    text-align: left;
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                  "
                >
                  no_wa
                </th>
                <th
                  style="
                    text-align: left;
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    width: 90px;
                  "
                >
                  status
                </th>
                <th
                  style="
                    text-align: left;
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                  "
                >
                  error
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, idx) in logs" :key="idx">
                <td
                  style="
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                  "
                >
                  {{ l.index }}
                </td>
                <td
                  style="
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                  "
                >
                  {{ l.name }}
                </td>
                <td
                  style="
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                  "
                >
                  {{ l.no_wa }}
                </td>
                <td
                  style="
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                  "
                >
                  {{ l.status }}
                </td>
                <td
                  style="
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                  "
                >
                  {{ l.error }}
                </td>
              </tr>
              <tr v-if="!logs.length">
                <td colspan="5" style="padding: 12px; opacity: 0.75">
                  Belum ada progress.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style="
            margin-top: 12px;
            display: flex;
            justify-content: space-between;
            gap: 10px;
          "
        >
          <button
            type="button"
            class="btn"
            :disabled="isSending"
            @click="setStep('setting')"
          >
            Back
          </button>
          <button
            type="button"
            class="btn"
            :disabled="isSending"
            @click="resetAll"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
