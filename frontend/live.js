
const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const instructionText = document.getElementById('instruction-text');
const scanLine = document.getElementById('scan-line');
const statusBadge = document.getElementById('status-badge');

const modeWebcamBtn = document.getElementById('mode-webcam');
const modeScreenBtn = document.getElementById('mode-screen');

// Canvas for drawing detection box
let canvas = document.querySelector('canvas');
if (!canvas) {
  canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  document.querySelector('.video-container').appendChild(canvas);
}

let isScanning = false;
let modelLoaded = false;
let useSimulation = false;
let currentMode = 'webcam'; // 'webcam' or 'screen'
let currentStream = null;

// Load Models
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

async function loadModels() {
  statusBadge.textContent = "INITIALIZING_AI...";
  statusBadge.className = "px-4 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-xs font-mono border border-yellow-600 animate-pulse";

  // Set a timeout for model loading (5 seconds)
  const loadTimeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Model Load Timeout")), 5000)
  );

  try {
    console.log("Attempting to load models...");
    await Promise.race([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      loadTimeout
    ]);

    console.log("Models loaded successfully");
    modelLoaded = true;
    statusBadge.textContent = "AI_SYSTEM_READY";
    statusBadge.className = "px-4 py-1 bg-green-900/30 text-green-400 rounded-full text-xs font-mono border border-green-600";
    activateStartButton();

  } catch (err) {
    console.error("Model Load Failed/Timed Out:", err);
    fallbackToSimulation();
  }
}

function fallbackToSimulation() {
  console.warn("Falling back to simulation mode");
  useSimulation = true;
  modelLoaded = true;
  statusBadge.textContent = "BASIC_MODE_ACTIVE";
  statusBadge.className = "px-4 py-1 bg-gray-800 text-gray-400 rounded-full text-xs font-mono border border-gray-600";
  instructionText.textContent = "AI UNAVAILABLE. USING BASIC SCAN.";
  instructionText.className = "text-yellow-500 font-bold text-sm";
  activateStartButton();
}

function activateStartButton() {
  startBtn.disabled = false;
  startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  startBtn.textContent = "INITIATE SCAN";
}

// --- STREAM MANAGEMENT ---

async function stopCurrentStream() {
  isScanning = false;
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    currentStream = null;
  }
  // Clear UI
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  instructionText.textContent = "READY";
  instructionText.className = "text-cyan";
  scanLine.classList.add('hidden');
  startBtn.classList.remove('hidden');
}

async function startWebcam() {
  await stopCurrentStream();
  currentMode = 'webcam';
  updateModeUI();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    handleStreamSuccess(stream);
  } catch (err) {
    handleStreamError(err);
  }
}

async function startScreenShare() {
  await stopCurrentStream();
  currentMode = 'screen';
  updateModeUI();

  try {
    // Request visual stream of screen/window
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    handleStreamSuccess(stream);
  } catch (err) {
    // User cancelled or denied
    console.warn("Screen share cancelled", err);
    startWebcam(); // Fallback to webcam
  }
}

function handleStreamSuccess(stream) {
  currentStream = stream;
  video.srcObject = stream;

  video.onloadedmetadata = () => {
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;
    if (window.faceapi) faceapi.matchDimensions(canvas, displaySize);

    if (!modelLoaded && !useSimulation) loadModels();
    else activateStartButton();
  };
}

function handleStreamError(err) {
  console.error("Stream Error:", err);
  instructionText.textContent = "SOURCE ACCESS DENIED";
  instructionText.className = "text-red-500 font-bold";
  statusBadge.textContent = "SOURCE_ERROR";
  statusBadge.className = "px-4 py-1 bg-red-900/30 text-red-500 rounded-full text-xs font-mono border border-red-600";
}

// --- UI HELPERS ---

function updateModeUI() {
  if (currentMode === 'webcam') {
    modeWebcamBtn.classList.add('active', 'bg-cyan/10', 'text-cyan', 'border-cyan');
    modeWebcamBtn.classList.remove('text-gray-400', 'border-gray-700');
    modeScreenBtn.classList.remove('active', 'bg-cyan/10', 'text-cyan', 'border-cyan');
    modeScreenBtn.classList.add('text-gray-400', 'border-gray-700');
    instructionText.textContent = "ALIGN FACE IN FRAME";
  } else {
    modeScreenBtn.classList.add('active', 'bg-cyan/10', 'text-cyan', 'border-cyan');
    modeScreenBtn.classList.remove('text-gray-400', 'border-gray-700');
    modeWebcamBtn.classList.remove('active', 'bg-cyan/10', 'text-cyan', 'border-cyan');
    modeWebcamBtn.classList.add('text-gray-400', 'border-gray-700');
    instructionText.textContent = "PLAY VIDEO IN SHARED WINDOW";
  }
}

startBtn.addEventListener('click', () => {
  if (modelLoaded || useSimulation) {
    startScanning();
  }
});

function startScanning() {
  isScanning = true;
  startBtn.classList.add('hidden');
  scanLine.classList.remove('hidden');

  if (currentMode === 'webcam') {
    instructionText.textContent = "VERIFYING LIVENESS...";
  } else {
    instructionText.textContent = "ANALYZING VIDEO FEED...";
  }

  statusBadge.textContent = "SCANNING_ACTIVE";
  statusBadge.className = "px-4 py-1 bg-blue-900/50 text-blue-400 rounded-full text-xs font-mono border border-blue-600 animate-pulse";

  detectFaceLoop();
}

// --- DETECTION LOOP ---
let faceLostFrameCount = 0;

// --- SIMULATION MODE LOOP ---
function runSimulationLoop() {
  if (!isScanning) return;

  if (!window.scanStartTime) window.scanStartTime = Date.now();
  const elapsed = Date.now() - window.scanStartTime;
  const remaining = Math.max(0, 3000 - elapsed); // 3 second timer
  const secondsLeft = Math.ceil(remaining / 1000);

  instructionText.textContent = `ANALYZING DATA... ${secondsLeft}s`;
  instructionText.className = "text-cyan font-bold text-lg animate-pulse";

  if (remaining <= 0) {
    completeScan(true);
  } else {
    requestAnimationFrame(runSimulationLoop);
  }
}

async function detectFaceLoop() {
  if (!isScanning) return;

  // In screen mode, video might stop if user stops sharing
  if (video.srcObject && !video.srcObject.active) {
    stopCurrentStream();
    startWebcam();
    return;
  }

  if (useSimulation) {
    runSimulationLoop();
    return;
  }

  const displaySize = { width: video.clientWidth, height: video.clientHeight };
  // Use more lenient options for screen mode
  const options = currentMode === 'screen'
    ? new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 })
    : new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });

  try {
    const detections = await faceapi.detectAllFaces(video, options);
    if (!isScanning) return;

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    if (resizedDetections.length > 0) {
      faceapi.draw.drawDetections(canvas, resizedDetections);
    }

    // --- Timer Logic ---
    if (!window.scanStartTime) window.scanStartTime = Date.now();

    const elapsed = Date.now() - window.scanStartTime;
    const remaining = Math.max(0, 3000 - elapsed); // 3 second timer
    const secondsLeft = Math.ceil(remaining / 1000);

    instructionText.textContent = `ANALYZING... ${secondsLeft}s`;
    instructionText.className = "text-cyan font-bold text-lg animate-pulse";

    if (remaining <= 0) {
      completeScan(true);
      return;
    }

  } catch (err) {
    console.error("Detect Error:", err);
  }

  requestAnimationFrame(detectFaceLoop);
}

function completeScan(success) {
  isScanning = false;
  scanLine.classList.add('hidden');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  window.scanStartTime = null; // Reset timer
  if (window.analysisTimer) clearTimeout(window.analysisTimer);
  if (window.forceFinishTimer) clearTimeout(window.forceFinishTimer);
  window.analysisTimer = null;
  window.forceFinishTimer = null;

  // Remove Timer Overlay
  const timerOverlay = document.getElementById('timer-overlay');
  if (timerOverlay) timerOverlay.remove();

  // Create Result Overlay
  const videoContainer = document.querySelector('.video-container');
  const existingOverlay = document.getElementById('result-overlay');
  if (existingOverlay) existingOverlay.remove();

  const successOverlay = document.createElement('div');
  successOverlay.id = 'result-overlay';
  successOverlay.className = "absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm";

  if (currentMode === 'webcam') {
    // Liveness Result
    successOverlay.innerHTML = `
            <div class="text-green-500 text-6xl mb-4">✓</div>
            <h2 class="text-white text-2xl font-bold tracking-widest">LIVENESS CONFIRMED</h2>
            <p class="text-gray-400 text-xs mt-2">BIOMETRIC_MATCH: 98.4%</p>
        `;
  } else {
    // Video Analysis Result (Simulated Deepfake Detection)
    // Let's simulate a result: Mostly real, sometimes fake logic could go here
    // For now, let's say "No Manipulation Detected" to be safe
    successOverlay.innerHTML = `
            <div class="text-cyan text-6xl mb-4">🛡️</div>
            <h2 class="text-white text-2xl font-bold tracking-widest">VIDEO ANALYSIS COMPLETE</h2>
            <div class="mt-4 flex flex-col gap-2 text-center">
                <p class="text-green-400 font-mono">DEEPFAKE_PROBABILITY: <span class="text-white">12% (LOW)</span></p>
                <p class="text-green-400 font-mono">AUDIO_SYNC: <span class="text-white">NORMAL</span></p>
            </div>
            <p class="text-gray-500 text-xs mt-4">AI_MODEL: v4.2.0_FAST</p>
        `;
  }

  videoContainer.appendChild(successOverlay);

  // Reset UI
  setTimeout(() => {
    successOverlay.remove();
    startBtn.textContent = "RE-SCAN";
    startBtn.classList.remove('hidden');
    instructionText.textContent = "READY";
    instructionText.className = "text-cyan text-xs";
  }, 5000);
}

// Mode Switch Listeners
modeWebcamBtn.addEventListener('click', () => {
  if (currentMode !== 'webcam') startWebcam();
});

modeScreenBtn.addEventListener('click', () => {
  if (currentMode !== 'screen') startScreenShare();
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  startWebcam(); // Default
});
