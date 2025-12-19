// main.js
// Electron main + whatsapp-web.js with LocalAuth + stable Puppeteer launch (Windows-friendly)

const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
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

if (process.platform === "win32") {
  app.setAppUserModelId("com.wassapkita.app");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    autoHideMenuBar: true, // hide File/Edit/View menu bar (Windows/Linux)
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // extra safety: ensure it's not visible even when pressing Alt
  mainWindow.setMenuBarVisibility(false);

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
function guessMyCountryPrefix(msisdn) {
  const s = String(msisdn || "").replace(/\D/g, "");
  if (!s) return "";

  // heuristik aman (cukup untuk filter "asing" yang kamu temui)
  if (s.startsWith("62")) return "62"; // Indonesia
  if (s.startsWith("1")) return "1"; // US/CA

  // fallback: ambil 2 digit awal
  return s.slice(0, 2);
}

async function exportContactsToXlsxInteractive() {
  if (!waClient) throw new Error("WhatsApp client belum siap.");
  if (!lastMe?.number)
    throw new Error("WhatsApp belum terhubung. Silakan login dulu.");

  const myCountryPrefix = guessMyCountryPrefix(lastMe?.number);

  const contacts = await waClient.getContacts();

  // hanya kontak individual (@c.us), dan yang dianggap "my contact"
  const userContacts = (contacts || []).filter((c) => {
    const idStr = c?.id?._serialized || "";
    if (!idStr.endsWith("@c.us")) return false;
    if (c?.isMyContact !== true) return false;
    if (!String(c?.name || "").trim()) return false; // butuh nama phonebook
    return true;
  });

  // dedup by number
  const map = new Map(); // key: no_wa, value: name
  for (const c of userContacts) {
    const no = (c?.id?.user || "").replace(/\D/g, "");
    if (!no) continue;

    // skip kontak diri sendiri
    if (lastMe?.number && String(no) === String(lastMe.number)) continue;

    // FILTER: hanya 1 negara dengan akun WA yang login (buang nomor asing yang "nyasar")
    if (myCountryPrefix && !String(no).startsWith(myCountryPrefix)) continue;

    // STRICT: hanya kontak yang benar-benar tersimpan (nama phonebook)
    const savedName = (c?.name || "").trim();
    if (!savedName) continue;

    const name = savedName || (c?.verifiedName || "").trim();

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

  // pastikan no_wa jadi text (tidak jadi scientific notation)
  sheet.getColumn("no_wa").numFmt = "@";

  await workbook.xlsx.writeFile(result.filePath);

  return {
    ok: true,
    cancelled: false,
    filePath: result.filePath,
    count: rows.length,
  };
}

// =====================
// XLSX Import (Blast Contacts)
// =====================
async function importContactsFromXlsxInteractive() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Pilih File Kontak (Excel)",
    properties: ["openFile"],
    filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
  });

  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: true, cancelled: true };
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets?.[0];
  if (!sheet) {
    return { ok: false, error: "Sheet tidak ditemukan di file Excel." };
  }

  // header row = row 1
  const headerRow = sheet.getRow(1);
  const header = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    header[colNumber - 1] = String(cell?.value || "")
      .trim()
      .toLowerCase();
  });

  const colNameIdx = header.findIndex((h) => ["name", "nama"].includes(h)) + 1;

  const colNoIdx =
    header.findIndex((h) =>
      ["no_wa", "no wa", "wa", "phone", "telp", "nomor", "number"].includes(h)
    ) + 1;

  // fallback kalau header tidak sesuai
  const nameCol = colNameIdx > 0 ? colNameIdx : 1;
  const noCol = colNoIdx > 0 ? colNoIdx : 2;

  const map = new Map(); // dedup by no_wa
  const rows = [];

  for (let i = 2; i <= sheet.rowCount; i++) {
    const r = sheet.getRow(i);
    const nameRaw = r.getCell(nameCol).value;
    const noRaw = r.getCell(noCol).value;

    const name = String(nameRaw || "").trim();
    const noDigits = String(noRaw || "").replace(/\D/g, "");

    if (!name && !noDigits) continue;
    if (!noDigits) continue;

    if (!map.has(noDigits)) {
      map.set(noDigits, true);
      rows.push({ name, no_wa: noDigits });
    }
  }

  return {
    ok: true,
    cancelled: false,
    filePath,
    fileName,
    count: rows.length,
    rows,
  };
}

function registerIpcHandlers() {
  ipcMain.handle("contacts:exportXlsx", async () => {
    return exportContactsToXlsxInteractive();
  });

  ipcMain.handle("contacts:importXlsx", async () => {
    return importContactsFromXlsxInteractive();
  });
}

app.whenReady().then(() => {
  // remove default application menu (File/Edit/View/Help, etc.)
  Menu.setApplicationMenu(null);

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
