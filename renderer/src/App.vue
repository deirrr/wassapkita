<script>
import LoginView from "./views/LoginView.vue";
import DashboardView from "./views/DashboardView.vue";

export default {
  name: "App",
  components: { LoginView, DashboardView },
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
};
</script>

<template>
  <component
    :is="currentViewComponent"
    :me="me"
    :tab="dashboardTab"
    @tab-change="dashboardTab = $event"
  />
</template>
