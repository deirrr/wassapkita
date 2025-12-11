// main.js
// Entry utama aplikasi Electron Wassapkita + integrasi whatsapp-web.js (QR only)

const { app, BrowserWindow } = require("electron");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");

let mainWindow;
let waClient;

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

  // optional: buka devtools saat dev
  // mainWindow.webContents.openDevTools();
}

function initWhatsAppClient() {
  waClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true, // biar tidak buka browser sendiri
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  waClient.on("qr", async (qr) => {
    console.log("QR diterima dari WhatsApp");
    try {
      const dataUrl = await qrcode.toDataURL(qr);
      if (mainWindow) {
        mainWindow.webContents.send("wa:qr", dataUrl);
      }
    } catch (err) {
      console.error("Gagal generate QR:", err);
    }
  });

  // waClient.on("ready", () => {
  //   console.log("WhatsApp siap!");
  //   if (mainWindow) {
  //     mainWindow.webContents.send("wa:status", "ready");
  //   }
  // });

  waClient.on("ready", () => {
    console.log("WhatsApp siap!");

    // ambil info akun yang login
    const info = waClient.info || {};
    const number = info.wid?.user || ""; // biasanya nomor tanpa tanda +
    const pushname = info.pushname || ""; // nama profil WA kalau ada

    if (mainWindow) {
      // kirim status
      mainWindow.webContents.send("wa:status", "ready");

      // kirim info akun
      mainWindow.webContents.send("wa:me", {
        number,
        pushname,
      });
    }
  });

  waClient.on("loading_screen", (percent, message) => {
    console.log("Loading", percent, message);
    if (mainWindow) {
      mainWindow.webContents.send(
        "wa:status",
        `loading ${percent}% - ${message}`
      );
    }
  });

  // waClient.on("authenticated", () => {
  //   console.log("Authenticated");
  //   if (mainWindow) {
  //     mainWindow.webContents.send("wa:status", "authenticated");
  //   }
  // });

  waClient.on("authenticated", () => {
    console.log("Authenticated");
    if (mainWindow) {
      mainWindow.webContents.send("wa:status", "authenticated");
    }
  });

  waClient.on("disconnected", (reason) => {
    console.log("Disconnected", reason);
    if (mainWindow) {
      mainWindow.webContents.send("wa:status", `disconnected: ${reason}`);
    }
    // bisa di-init ulang kalau mau
  });

  waClient.initialize().catch((err) => {
    console.error("Gagal inisialisasi WhatsApp client:", err);
  });
}

app.whenReady().then(() => {
  createWindow();
  initWhatsAppClient();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (waClient) {
    waClient.destroy().catch(() => {});
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});
