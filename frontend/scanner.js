
// DOM Elements
const scanStatus = document.getElementById('scan-status');
const resultPanel = document.getElementById('result-panel');
const scanResultText = document.getElementById('scan-result-text');
const scanResultContainer = document.getElementById('scan-result-container');
const resetBtn = document.getElementById('reset-scanner-btn');
const copyBtn = document.getElementById('copy-btn');
const tabCamera = document.getElementById('tab-camera');
const tabImage = document.getElementById('tab-image');
const cameraView = document.getElementById('camera-view');
const fileView = document.getElementById('file-view');
const qrInputFile = document.getElementById('qr-input-file');
const fileError = document.getElementById('file-error');

// State
let html5QrCode = null;
let isScanning = false;
let currentMode = 'camera'; // 'camera' or 'image'

// Initialize Scanner Instance
function initScanner() {
  // We use the 'reader' div ID for the Html5Qrcode instance
  // Note: Html5Qrcode clears the element innerHTML when starting
  html5QrCode = new Html5Qrcode("reader");
}

async function startCamera() {
  if (isScanning) return;

  scanStatus.textContent = "INITIALIZING_CAMERA...";
  scanStatus.className = "text-xs text-cyan animate-pulse";
  resultPanel.classList.add('hidden');
  fileError.textContent = "";

  try {
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    // Prefer back camera
    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      (errorMessage) => {
        // Ignore frame parse errors to avoid console spam
        // console.log(errorMessage);
      }
    ).catch(err => {
      console.log("Start failed, trying default", err);
      // Fallback to any camera if environment fails
      return html5QrCode.start(
        { deviceId: { exact: undefined } },
        config,
        onScanSuccess,
        () => { }
      );
    });

    isScanning = true;
    scanStatus.textContent = "SCANNING_ACTIVE";
    scanStatus.className = "text-xs text-green-500 font-bold";

  } catch (err) {
    console.error("Camera functionality failed", err);
    scanStatus.textContent = "CAMERA_ACCESS_DENIED";
    scanStatus.className = "text-xs text-red-500 font-bold";
  }
}

async function stopCamera() {
  if (isScanning && html5QrCode) {
    try {
      await html5QrCode.stop();
      isScanning = false;
      scanStatus.textContent = "CAMERA_STOPPED";
      scanStatus.className = "text-xs text-gray-500";
      // Clean up the reader div slightly so it doesn't look broken
      document.getElementById('reader').innerHTML = '';
    } catch (err) {
      console.error("Failed to stop camera", err);
    }
  }
}

// Handle File Scan
qrInputFile.addEventListener('change', async (e) => {
  if (e.target.files.length === 0) return;

  const file = e.target.files[0];
  fileError.textContent = "Analyzing...";

  try {
    const decodedText = await html5QrCode.scanFile(file, true);
    onScanSuccess(decodedText, { result: { format: { formatName: 'FILE' } } });
    fileError.textContent = "";
  } catch (err) {
    console.error("File scan error", err);
    fileError.textContent = "No QR code found in image.";
    // Reset input so same file can be selected again
    qrInputFile.value = '';
  }
});

function onScanSuccess(decodedText, decodedResult) {
  console.log(`Scan result: ${decodedText}`, decodedResult);

  // Stop camera if running
  if (currentMode === 'camera') {
    stopCamera();
  }

  showResult(decodedText);
}

function showResult(text) {
  if (currentMode === 'camera') {
    scanStatus.textContent = "DATA_ACQUIRED";
    scanStatus.className = "text-xs text-green-500 font-bold";
  }

  // URL Detection
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (urlRegex.test(text)) {
    scanResultContainer.innerHTML = text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" class="text-cyan underline hover:text-white">${url}</a>`;
    });
  } else {
    scanResultText.textContent = text;
    scanResultContainer.innerHTML = '';
    scanResultContainer.appendChild(scanResultText);
  }

  resultPanel.classList.remove('hidden');
}

// Tab Switching logic
function switchTab(mode) {
  currentMode = mode;
  resultPanel.classList.add('hidden');
  fileError.textContent = "";

  if (mode === 'camera') {
    tabCamera.classList.add('active');
    tabImage.classList.remove('active');
    fileView.classList.add('hidden');
    cameraView.classList.remove('hidden');
    startCamera();
  } else {
    tabCamera.classList.remove('active');
    tabImage.classList.add('active');
    cameraView.classList.add('hidden');
    fileView.classList.remove('hidden');
    stopCamera();
  }
}

// Event Listeners
tabCamera.addEventListener('click', () => switchTab('camera'));
tabImage.addEventListener('click', () => switchTab('image'));

resetBtn.addEventListener('click', () => {
  resultPanel.classList.add('hidden');
  qrInputFile.value = '';

  if (currentMode === 'camera') {
    startCamera();
  } else {
    fileError.textContent = "";
  }
});

copyBtn.addEventListener('click', () => {
  // Copy the text content (not the HTML with links)
  const textToCopy = scanResultContainer.innerText || scanResultContainer.textContent;
  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "COPIED!";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  });
});

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  initScanner();
  // Start in camera mode
  startCamera();
});
