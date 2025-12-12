// main.js
// Entry utama aplikasi Electron Wassapkita + integrasi whatsapp-web.js (QR only)

const { app, BrowserWindow } = require("electron");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");

let mainWindow;
let waClient;
let isRestarting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");
}

function buildClient() {
  return new Client({
    authStrategy: new LocalAuth(), // boleh juga LocalAuth({ clientId: "wassapkita" })
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });
}

async function restartWhatsAppClient() {
  if (isRestarting) return;
  isRestarting = true;

  try {
    if (waClient) {
      try {
        // tidak wajib, tapi membantu kalau session benar-benar logout
        await waClient.logout();
      } catch (_) {}

      try {
        await waClient.destroy();
      } catch (_) {}
    }

    waClient = buildClient();
    wireEvents(waClient);

    await waClient.initialize();
  } catch (err) {
    console.error("Gagal restart WhatsApp client:", err);
  } finally {
    isRestarting = false;
  }
}

function wireEvents(client) {
  client.on("qr", async (qr) => {
    console.log("QR diterima dari WhatsApp");
    try {
      const dataUrl = await qrcode.toDataURL(qr);
      if (mainWindow) mainWindow.webContents.send("wa:qr", dataUrl);
    } catch (err) {
      console.error("Gagal generate QR:", err);
    }
  });

  client.on("ready", () => {
    console.log("WhatsApp siap!");

    const info = client.info || {};
    const number = info.wid?.user || "";
    const pushname = info.pushname || "";

    if (mainWindow) {
      mainWindow.webContents.send("wa:status", "ready");
      mainWindow.webContents.send("wa:me", { number, pushname });
    }
  });

  client.on("loading_screen", (percent, message) => {
    console.log("Loading", percent, message);
    if (mainWindow) {
      mainWindow.webContents.send(
        "wa:status",
        `loading ${percent}% - ${message}`
      );
    }
  });

  client.on("authenticated", () => {
    console.log("Authenticated");
    if (mainWindow) mainWindow.webContents.send("wa:status", "authenticated");
  });

  client.on("auth_failure", (msg) => {
    console.log("Auth failure", msg);
    if (mainWindow)
      mainWindow.webContents.send("wa:status", `auth_failure: ${msg}`);
    // biasanya lebih aman restart
    restartWhatsAppClient();
  });

  client.on("disconnected", (reason) => {
    console.log("Disconnected", reason);

    if (mainWindow) {
      mainWindow.webContents.send("wa:status", `disconnected: ${reason}`);

      // reset UI: hilangkan info akun + QR lama (biar balik ke “menunggu QR”)
      mainWindow.webContents.send("wa:me", null);
      mainWindow.webContents.send("wa:qr", "");
    }

    // kalau LOGOUT, paksa init ulang supaya QR baru keluar
    if (String(reason).toUpperCase() === "LOGOUT") {
      restartWhatsAppClient();
    }
  });
}

function initWhatsAppClient() {
  waClient = buildClient();
  wireEvents(waClient);

  waClient.initialize().catch((err) => {
    console.error("Gagal inisialisasi WhatsApp client:", err);
  });
}

app.whenReady().then(() => {
  createWindow();
  initWhatsAppClient();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (waClient) {
    waClient.destroy().catch(() => {});
  }
  if (process.platform !== "darwin") app.quit();
});
