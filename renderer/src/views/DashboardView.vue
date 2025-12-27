<script>
import HomeView from "./HomeView.vue";
import BlastView from "./BlastView.vue";
import ChatbotView from "./ChatbotView.vue";

export default {
  name: "DashboardView",
  components: { HomeView, BlastView, ChatbotView },
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
      return `
        <svg class="icon-12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9z" stroke="currentColor" stroke-width="1.8"/>
        </svg>
      `;
    },
  },
};
</script>

<template>
  <div class="dash-page">
    <div class="dash-topbar">
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
</template>
