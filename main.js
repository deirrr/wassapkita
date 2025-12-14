// main.js
// Electron main + whatsapp-web.js with LocalAuth + stable Puppeteer launch (Windows-friendly)

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const puppeteer = require("puppeteer"); // IMPORTANT: install `puppeteer` (not puppeteer-core)
const ExcelJS = require("exceljs");

let mainWindow;
let waClient;
let isRestarting = false;

// last known state for renderer sync (avoid missed events on reload)
let lastStatus = "";
let lastMe = null;
let lastQr = "";

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

  mainWindow.webContents.on("did-finish-load", () => {
    setTimeout(() => {
      if (!mainWindow) return;

      // send last known state for renderer sync (on reload, etc)
      mainWindow.webContents.send("wa:status", lastStatus || "booting");
      mainWindow.webContents.send("wa:me", lastMe);
      mainWindow.webContents.send("wa:qr", lastQr);
    }, 200); // delay to ensure renderer listeners are ready
  });
}

function buildClient() {
  // Tips debug:
  // - set HEADLESS=false to see the browser window
  // - set WA_DEBUG=true to see more logs
  const headless = process.env.HEADLESS !== "false";
  const waDebug = process.env.WA_DEBUG === "true";

  return new Client({
    authStrategy: new LocalAuth(), // or LocalAuth({ clientId: "wassapkita" })
    puppeteer: {
      headless,
      executablePath: puppeteer.executablePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    },
    // optional: reduce noisy logs
    // You can remove this if you want default behavior.
    ...(waDebug ? {} : { takeoverOnConflict: true, takeoverTimeoutMs: 0 }),
  });
}

async function restartWhatsAppClient() {
  if (isRestarting) return;
  isRestarting = true;

  try {
    if (waClient) {
      try {
        // optional; may fail if already disconnected
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

    // optional: keep status informative
    lastStatus = "qr";

    try {
      const dataUrl = await qrcode.toDataURL(qr);
      lastQr = dataUrl;

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

    lastMe = { number, pushname };
    lastStatus = "ready";
    lastQr = "";

    if (mainWindow) {
      mainWindow.webContents.send("wa:status", "ready");
      mainWindow.webContents.send("wa:me", { number, pushname });
      mainWindow.webContents.send("wa:qr", ""); // clear QR in UI
    }
  });

  client.on("loading_screen", (percent, message) => {
    lastStatus = `loading ${percent}% - ${message}`;
    console.log("Loading", percent, message);

    if (mainWindow) {
      mainWindow.webContents.send("wa:status", lastStatus);
    }
  });

  client.on("authenticated", () => {
    lastStatus = "authenticated";
    console.log("Authenticated");

    if (mainWindow) mainWindow.webContents.send("wa:status", "authenticated");
  });

  client.on("auth_failure", (msg) => {
    lastStatus = `auth_failure: ${msg}`;
    console.log("Auth failure", msg);

    if (mainWindow) mainWindow.webContents.send("wa:status", lastStatus);

    // usually safer to restart
    restartWhatsAppClient();
  });

  client.on("disconnected", (reason) => {
    console.log("Disconnected", reason);

    lastStatus = `disconnected: ${reason}`;
    lastMe = null;
    lastQr = "";

    if (mainWindow) {
      mainWindow.webContents.send("wa:status", lastStatus);
      mainWindow.webContents.send("wa:me", null);
      mainWindow.webContents.send("wa:qr", "");
    }

    // if LOGOUT, force re-init to get fresh QR
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

// =====================
// XLSX Export (Contacts Backup)
// =====================
async function exportContactsToXlsxInteractive() {
  if (!waClient) throw new Error("WhatsApp client belum siap.");
  if (!lastMe?.number)
    throw new Error("WhatsApp belum terhubung. Silakan login dulu.");

  const contacts = await waClient.getContacts();

  // hanya kontak individual (@c.us), skip group (@g.us) dan lainnya
  const userContacts = (contacts || []).filter((c) => {
    const idStr = c?.id?._serialized || "";
    if (!idStr.endsWith("@c.us")) return false;

    // hanya kontak yang tersimpan (bukan participant hasil grup)
    // whatsapp-web.js biasanya expose sebagai boolean
    return c?.isMyContact === true;
  });

  // dedup by number
  const map = new Map(); // key: no_wa, value: name
  for (const c of userContacts) {
    const no = (c?.id?.user || "").replace(/\D/g, "");
    if (!no) continue;

    // skip nomor sendiri
    if (lastMe?.number && String(no) === String(lastMe.number)) continue;

    const name =
      c?.name ||
      c?.pushname ||
      c?.verifiedName ||
      c?.notifyName ||
      c?.shortName ||
      c?.formattedName ||
      (no ? `+${no}` : "");

    if (!map.has(no)) map.set(no, name);
  }

  const rows = Array.from(map.entries())
    .map(([no_wa, name]) => ({ name, no_wa }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const defaultFileName = `wassapkita-contacts-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Simpan Backup Kontak",
    defaultPath: defaultFileName,
    filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
  });

  if (result.canceled || !result.filePath) {
    return { ok: true, cancelled: true };
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Wassapkita";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("contacts");

  sheet.columns = [
    { header: "name", key: "name", width: 32 },
    { header: "no_wa", key: "no_wa", width: 18 },
  ];

  // header bold
  sheet.getRow(1).font = { bold: true };

  for (const r of rows) sheet.addRow(r);
  sheet.getColumn("no_wa").numFmt = "@";

  await workbook.xlsx.writeFile(result.filePath);

  return {
    ok: true,
    cancelled: false,
    filePath: result.filePath,
    count: rows.length,
  };
}

function registerIpcHandlers() {
  ipcMain.handle("contacts:exportXlsx", async () => {
    return exportContactsToXlsxInteractive();
  });
}

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();
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
