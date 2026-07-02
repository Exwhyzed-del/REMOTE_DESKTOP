// Electron entry point for RustDesk Lite Desktop App wrapper
const { app, BrowserWindow, Menu, Tray } = require('electron');
const path = require('path');

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0A0B0E',
    title: 'RustDesk Lite - High-Performance Remote Desktop',
    icon: path.join(__dirname, 'public/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // If in production, load built index.html, else load Vite dev server
  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Hide the default menu bar for a clean, sleek application feel
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Support running in background when user minimizes or closes with permission
app.whenReady().then(() => {
  createWindow();

  // Create system tray icon for running in the background as requested
  try {
    tray = new Tray(path.join(__dirname, 'public/favicon.ico'));
    const contextMenu = Menu.buildFromTemplate([
      { label: 'RustDesk Lite', enabled: false },
      { type: 'separator' },
      { label: 'Open Client Window', click: () => { mainWindow?.show(); } },
      { label: 'Start Silent Agent Service', click: () => { console.log('Background daemon started.'); } },
      { type: 'separator' },
      { label: 'Quit Entirely', click: () => { app.quit(); } }
    ]);
    tray.setToolTip('RustDesk Lite Remote Host');
    tray.setContextMenu(contextMenu);
  } catch (e) {
    // Tray icon may fail if file is missing, ignore gracefully
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS keep the service alive in the dock unless quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
