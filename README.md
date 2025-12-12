<p align="center">
  <img src="assets/wassapkita.png" alt="Wassapkita Logo" width="180">
</p>

# Wassapkita

An open-source desktop application for WhatsApp automation powered by WhatsApp Web.
Built with Electron, Node.js, and Vue.

Wassapkita is designed so non-technical users can send WhatsApp messages efficiently through a desktop app without installing Node.js or performing any technical configuration.
Developers can contribute directly through this repository.

---

## Technologies Used

- **Electron** — Desktop application packaging  
- **Node.js** — Internal backend & WhatsApp connection  
- **Vue 3 (SPA style)** — User interface (renderer)  
- **whatsapp-web.js** — WhatsApp Web integration + QR login  
- **LocalAuth** — WhatsApp login session persistence  

---

## Roadmap

Upcoming development stages:

### 1. Basic UI & Simple Routing
- Add simple router for login → dashboard flow  
- Display real-time connection status  

### 2. WhatsApp Features
- Send message to a single number  
- Excel-based broadcast sending  
- Message templates  
- Safe delay (anti-ban)  

### 3. Tools & Utilities
- Activity logs  
- Report export  
- App settings & storage directory configuration  

### 4. Packaging & Distribution
- Build `.exe` installer using `electron-builder`  
- Optional auto-update  
- CI/CD for automatic GitHub releases  

---

## Running Locally (Development)

1. Clone the repository:

```bash
git clone https://github.com/deirrr/wassapkita.git
cd wassapkita
````

2. Install dependencies:

```bash
npm install
```

3. Start the application:

```bash
npm start
```

The application will launch an Electron window displaying the WhatsApp QR login page.

---

## License

This project is planned to use the **MIT License**.  
The `LICENSE` file will be added in an upcoming release.

---
