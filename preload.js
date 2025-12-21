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

  // export contacts to Excel (.xlsx)
  exportContactsXlsx: () => {
    return ipcRenderer.invoke("contacts:exportXlsx");
  },

  // import contacts from Excel (.xlsx) for Blast feature
  importContactsXlsx: () => {
    return ipcRenderer.invoke("contacts:importXlsx");
  },

  // blast send
  sendBlast: (payload) => {
    return ipcRenderer.invoke("blast:send", payload);
  },

  // blast cancel
  cancelBlast: () => {
    ipcRenderer.send("blast:cancel");
  },

  // blast progress events
  onBlastProgress: (callback) => {
    ipcRenderer.on("blast:progress", (_event, data) => {
      if (typeof callback === "function") callback(data);
    });
  },

  onBlastDone: (callback) => {
    ipcRenderer.on("blast:done", (_event, data) => {
      if (typeof callback === "function") callback(data);
    });
  },
});
