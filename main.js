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

// blast state
let isBlasting = false;
let blastCancelRequested = false;

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
    ...(waDebug ? {} : { takeoverOnConflict: true, takeoverTimeoutMs: 0 }),
  });
}

async function restartWhatsAppClient() {
  if (isRestarting) return;
  isRestarting = true;

  try {
    if (waClient) {
      try {
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
      mainWindow.webContents.send("wa:qr", "");
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

  if (s.startsWith("62")) return "62";
  if (s.startsWith("1")) return "1";

  return s.slice(0, 2);
}

async function exportContactsToXlsxInteractive() {
  if (!waClient) throw new Error("WhatsApp client belum siap.");
  if (!lastMe?.number)
    throw new Error("WhatsApp belum terhubung. Silakan login dulu.");

  const myCountryPrefix = guessMyCountryPrefix(lastMe?.number);

  const contacts = await waClient.getContacts();

  const userContacts = (contacts || []).filter((c) => {
    const idStr = c?.id?._serialized || "";
    if (!idStr.endsWith("@c.us")) return false;
    if (c?.isMyContact !== true) return false;
    if (!String(c?.name || "").trim()) return false;
    return true;
  });

  const map = new Map();
  for (const c of userContacts) {
    const no = (c?.id?.user || "").replace(/\D/g, "");
    if (!no) continue;

    if (lastMe?.number && String(no) === String(lastMe.number)) continue;

    if (myCountryPrefix && !String(no).startsWith(myCountryPrefix)) continue;

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

  const nameCol = colNameIdx > 0 ? colNameIdx : 1;
  const noCol = colNoIdx > 0 ? colNoIdx : 2;

  const map = new Map();
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

// =====================
// BLAST SEND
// =====================
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min, max) {
  const a = Number(min) || 0;
  const b = Number(max) || 0;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

function normalizeToWid(noRaw, opts = {}) {
  const digits = String(noRaw || "").replace(/\D/g, "");
  if (!digits) return "";

  const addCountry = !!opts.addCountry;
  const countryCode = String(opts.countryCode || "").replace(/\D/g, "");

  if (addCountry && countryCode) {
    if (digits.startsWith("0")) {
      return `${countryCode}${digits.slice(1)}@c.us`;
    }
    if (digits.startsWith(countryCode)) {
      return `${digits}@c.us`;
    }
    return `${digits}@c.us`;
  }

  return `${digits}@c.us`;
}

function applyTemplate(template, vars) {
  const t = String(template || "");
  return t
    .replaceAll("{name}", String(vars?.name || ""))
    .replaceAll("{no_wa}", String(vars?.no_wa || ""));
}

async function sendBlastInteractive(payload) {
  if (!waClient) throw new Error("WhatsApp client belum siap.");
  if (!lastMe?.number)
    throw new Error("WhatsApp belum terhubung. Silakan login dulu.");

  if (isBlasting) {
    return { ok: false, error: "Blast sedang berjalan. Silakan stop dulu." };
  }

  const contacts = Array.isArray(payload?.contacts) ? payload.contacts : [];
  const template = String(payload?.template || "").trim();

  const delayMinMs = Number(payload?.delayMinMs ?? 1200);
  const delayMaxMs = Number(payload?.delayMaxMs ?? 2500);

  const addCountry = !!payload?.addCountry;
  const countryCode = String(payload?.countryCode || "").trim();

  const skipIfNoName = !!payload?.skipIfNoName;

  if (!contacts.length) return { ok: false, error: "Kontak kosong." };
  if (!template) return { ok: false, error: "Template pesan masih kosong." };

  isBlasting = true;
  blastCancelRequested = false;

  const total = contacts.length;

  if (mainWindow) {
    mainWindow.webContents.send("blast:progress", {
      type: "start",
      total,
      sent: 0,
      failed: 0,
      current: 0,
      message: "Blast dimulai...",
      item: null,
    });
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < contacts.length; i++) {
    if (blastCancelRequested) break;

    const c = contacts[i] || {};
    const name = String(c.name || "").trim();
    const no_wa = String(c.no_wa || "").trim();

    if (skipIfNoName && !name) {
      failed++;
      if (mainWindow) {
        mainWindow.webContents.send("blast:progress", {
          type: "item",
          total,
          sent,
          failed,
          current: i + 1,
          message: "Skip: nama kosong",
          item: {
            index: i + 1,
            name,
            no_wa,
            status: "skipped",
            error: "nama kosong",
          },
        });
      }
      continue;
    }

    const wid = normalizeToWid(no_wa, { addCountry, countryCode });
    if (!wid) {
      failed++;
      if (mainWindow) {
        mainWindow.webContents.send("blast:progress", {
          type: "item",
          total,
          sent,
          failed,
          current: i + 1,
          message: "Gagal: nomor tidak valid",
          item: {
            index: i + 1,
            name,
            no_wa,
            status: "failed",
            error: "nomor tidak valid",
          },
        });
      }
      continue;
    }

    const text = applyTemplate(template, { name, no_wa });

    try {
      await waClient.sendMessage(wid, text);

      sent++;
      if (mainWindow) {
        mainWindow.webContents.send("blast:progress", {
          type: "item",
          total,
          sent,
          failed,
          current: i + 1,
          message: "Terkirim",
          item: { index: i + 1, name, no_wa, status: "sent", error: "" },
        });
      }
    } catch (err) {
      failed++;
      if (mainWindow) {
        mainWindow.webContents.send("blast:progress", {
          type: "item",
          total,
          sent,
          failed,
          current: i + 1,
          message: "Gagal kirim",
          item: {
            index: i + 1,
            name,
            no_wa,
            status: "failed",
            error: String(err?.message || err),
          },
        });
      }
    }

    const waitMs = randomBetween(delayMinMs, delayMaxMs);
    if (i < contacts.length - 1 && !blastCancelRequested) {
      if (mainWindow) {
        mainWindow.webContents.send("blast:progress", {
          type: "delay",
          total,
          sent,
          failed,
          current: i + 1,
          message: `Delay ${waitMs} ms`,
          item: null,
        });
      }
      await sleep(waitMs);
    }
  }

  const cancelled = blastCancelRequested;

  isBlasting = false;
  blastCancelRequested = false;

  if (mainWindow) {
    mainWindow.webContents.send("blast:done", {
      ok: true,
      cancelled,
      total,
      sent,
      failed,
    });
  }

  return { ok: true, cancelled, total, sent, failed };
}

// =====================
// IPC
// =====================
function registerIpcHandlers() {
  ipcMain.handle("contacts:exportXlsx", async () => {
    return exportContactsToXlsxInteractive();
  });

  ipcMain.handle("contacts:importXlsx", async () => {
    return importContactsFromXlsxInteractive();
  });

  ipcMain.handle("blast:send", async (_e, payload) => {
    return sendBlastInteractive(payload);
  });

  ipcMain.on("blast:cancel", () => {
    if (isBlasting) blastCancelRequested = true;
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
