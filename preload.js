// preload.js
// bridge between Electron main and frontend (index.html)

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wassapkita", {
  onQr: (callback) => {
    ipcRenderer.on("wa:qr", (_event, dataUrl) => {
      if (typeof callback === "function") {
        callback(dataUrl);
      }
    });
  },

  onStatus: (callback) => {
    ipcRenderer.on("wa:status", (_event, status) => {
      if (typeof callback === "function") {
        callback(status);
      }
    });
  },

  onMe: (callback) => {
    ipcRenderer.on("wa:me", (_event, me) => {
      if (typeof callback === "function") {
        callback(me);
      }
    });
  },

  // ADDED: export contacts to Excel (.xlsx)
  exportContactsXlsx: () => {
    return ipcRenderer.invoke("contacts:exportXlsx");
  },
});
