// main.js
// Entry utama aplikasi Electron Wassapkita (versi Hello World)

const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      // nanti kalau pakai frontend framework, preload bisa dipakai
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // load file HTML sederhana
  win.loadFile('index.html');

  // opsional: buka devtools saat development
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // di macOS, buka window lagi kalau di-click icon dock dan tidak ada window
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // di Windows/Linux, keluar kalau semua window ditutup
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
