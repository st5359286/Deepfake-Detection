
import config from './config.js';

// DOM Elements
const verdictText = document.getElementById('verdictText');
const confidenceScore = document.getElementById('confidenceScore');
const mediaPreview = document.getElementById('media-preview');
const forensicList = document.getElementById('forensicList');
const chiefJudgment = document.getElementById('chiefJudgment');
const visualList = document.getElementById('visualList');
const metadataList = document.getElementById('metadataList');
const summaryPanel = document.getElementById('summary-panel');
const summaryText = document.getElementById('summaryText');
const generateSummaryBtn = document.getElementById('generate-summary-btn');
const downloadReportBtn = document.getElementById('download-report-btn');
const xaiControls = document.getElementById('xai-controls');
const heatmapToggle = document.getElementById('heatmap-toggle');
const heatmapOpacity = document.getElementById('heatmap-opacity');
const opacityControlContainer = document.getElementById('opacity-control-container');
const reportFeedbackBtn = document.getElementById('report-feedback-btn');
const feedbackSuccess = document.getElementById('feedback-success');
const xaiTitle = document.getElementById('xai-title');

// State
let analysisResult = null;
let filePreviewData = null; // Base64 string
let fileMetadata = null; // { name, type }

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadResults();
});

function loadResults() {
  try {
    const storedResult = localStorage.getItem('analysisResult');
    const storedPreview = localStorage.getItem('filePreview');
    const storedMeta = localStorage.getItem('fileMetadata');

    if (!storedResult) {
      window.location.href = '/vastav.html'; // Redirect back if no result
      return;
    }

    analysisResult = JSON.parse(storedResult);
    filePreviewData = storedPreview;
    fileMetadata = storedMeta ? JSON.parse(storedMeta) : { type: 'unknown', name: 'unknown' };

    displayResults(analysisResult);

  } catch (e) {
    console.error("Failed to load results:", e);
    alert("Error loading results. Returning to upload page.");
    window.location.href = '/vastav.html';
  }
}

function displayResults(data) {
  // Verdict
  verdictText.textContent = data.is_deepfake ? 'MANIPULATED' : 'AUTHENTIC';
  verdictText.className = `text-3xl font-bold mb-1 ${data.is_deepfake ? 'text-red-500' : 'text-green-500'}`;

  confidenceScore.textContent = `${data.confidence}%`;
  confidenceScore.style.color = data.is_deepfake ? '#f87171' : '#4ade80';

  const confidenceBar = document.getElementById('confidenceBar');
  if (confidenceBar) {
    confidenceBar.style.width = `${data.confidence}%`;
    confidenceBar.className = `h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)] ${data.is_deepfake ? 'bg-red-500 shadow-red-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`;
  }

  // Preview Logic
  const placeholder = document.getElementById('preview-placeholder');
  if (placeholder) placeholder.remove();

  const isAudio = data.type === 'audio' || (fileMetadata && fileMetadata.type && fileMetadata.type.startsWith('audio/'));
  const isVideo = data.type === 'video' || (fileMetadata && fileMetadata.type && fileMetadata.type.startsWith('video/'));
  const isImage = data.type === 'image' || (fileMetadata && fileMetadata.type && fileMetadata.type.startsWith('image/'));

  // If we have preview data, render standard HTML5 players
  if (filePreviewData) {
    if (isImage) {
      const img = document.createElement('img');
      img.src = filePreviewData;
      img.className = 'max-w-full max-h-[400px] rounded-md relative z-10';
      mediaPreview.appendChild(img);
      if (xaiTitle) xaiTitle.textContent = '>> XAI_EXPLANATION (Grad-CAM)';
    } else if (isVideo) {
      const video = document.createElement('video');
      video.src = filePreviewData;
      video.controls = true;
      video.className = 'max-w-full max-h-[400px] rounded-md relative z-10';
      mediaPreview.appendChild(video);
      if (xaiTitle) xaiTitle.textContent = '>> TEMPORAL_ANALYSIS (Frame Fusion)';
    } else if (isAudio) {
      const audio = document.createElement('audio');
      audio.src = filePreviewData;
      audio.controls = true;
      audio.className = 'w-full relative z-10';
      mediaPreview.appendChild(audio);
      if (xaiTitle) xaiTitle.textContent = '>> VOICE_SPECTROGRAM (MFCC)';
    }
  } else {
    // We DON'T have preview data (file was too large)
    if (isAudio) {
      const noPreview = document.createElement('div');
      noPreview.className = 'w-full h-[150px] flex items-center justify-center text-gray-400 bg-gray-900 border border-gray-700 rounded-md relative z-10 p-4 font-mono text-xs text-center';
      noPreview.innerHTML = `<div>[ AUDIO_STREAM_ACCEPTED ]<br/>File too large for local playback<br/>Spectrogram Analysis Available Below</div>`;
      mediaPreview.appendChild(noPreview);
      if (xaiTitle) xaiTitle.textContent = '>> VOICE_SPECTROGRAM (MFCC)';
    } else if (isVideo) {
      const noPreview = document.createElement('div');
      noPreview.className = 'w-full h-[200px] flex items-center justify-center text-gray-400 bg-gray-900 border border-gray-700 rounded-md relative z-10 p-4 font-mono text-xs text-center';
      noPreview.innerHTML = `<div>[ VIDEO_STREAM_ACCEPTED ]<br/>File too large for local playback</div>`;
      mediaPreview.appendChild(noPreview);
      if (xaiTitle) xaiTitle.textContent = '>> TEMPORAL_ANALYSIS (Frame Fusion)';
    } else {
      mediaPreview.innerHTML = '<div class="text-gray-500">Preview not available (File too large or missing)</div>';
    }
  }

  // Abstracted Heatmap Overlay Logic (applies to ALL media types if heatmap_url exists)
  if (data.heatmap_url) {
    xaiControls.classList.remove('hidden');
    const heatmapImg = document.createElement('img');
    heatmapImg.src = `${config.API_URL}${data.heatmap_url}`;
    heatmapImg.id = 'heatmap-overlay';
    heatmapImg.className = 'absolute max-w-full max-h-[400px] rounded-md z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 pointer-events-none opacity-0';
    mediaPreview.appendChild(heatmapImg);

    heatmapToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        heatmapImg.style.opacity = heatmapOpacity.value;
        heatmapOpacity.disabled = false;
        heatmapOpacity.classList.remove('cursor-not-allowed');
        opacityControlContainer.classList.remove('opacity-50');
      } else {
        heatmapImg.style.opacity = 0;
        heatmapOpacity.disabled = true;
        heatmapOpacity.classList.add('cursor-not-allowed');
        opacityControlContainer.classList.add('opacity-50');
      }
    });

    heatmapOpacity.addEventListener('input', (e) => {
      if (heatmapToggle.checked) {
        heatmapImg.style.opacity = e.target.value;
      }
    });
  }

  // Forensics
  renderList(forensicList, data.forensics);
  renderList(visualList, data.visual_analysis);
  renderList(metadataList, data.metadata_analysis);

  // Chief Judgment
  if (data.chief_judgment) {
    chiefJudgment.innerHTML = `
            <div>
                <h4 class="font-bold text-cyan mb-1">${data.chief_judgment.title}</h4>
                <p class="text-sm">${data.chief_judgment.description}</p>
            </div>
        `;
  }

  // Auto-expand if fake
  if (data.is_deepfake) {
    const firstDetail = document.querySelector('details.group');
    if (firstDetail) firstDetail.open = true;
  }

  downloadReportBtn.classList.remove('hidden');

  // Render Feature Graphs
  if (data.feature_scores) {
    renderFeatureGraph(document.getElementById('feature-graph'), data.feature_scores);
  }

  // Render Timeline (if available)
  const timelineSection = document.getElementById('timeline-section');
  if (data.timeline && data.timeline.length > 0) {
    timelineSection.classList.remove('hidden');
    renderTimeline(document.getElementById('timeline-container'), data.timeline);
  } else {
    timelineSection.classList.add('hidden');
  }

  // Auto-generate summary
  handleGenerateSummary();
}

function renderFeatureGraph(container, scores) {
  container.innerHTML = '';
  Object.entries(scores).forEach(([key, value]) => {
    const colorClass = value > 70 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
      value > 40 ? 'bg-yellow-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';

    const html = `
            <div class="group">
                <div class="flex justify-between text-xs mb-1">
                    <span class="text-gray-400 font-mono">${key.toUpperCase()}</span>
                    <span class="font-bold text-white">${value}%</span>
                </div>
                <div class="h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
                    <div class="h-full ${colorClass} transition-all duration-1000 ease-out" style="width: 0%" onload="this.style.width='${value}%'"></div>
                </div>
            </div>
        `;
    container.insertAdjacentHTML('beforeend', html);

    // Trigger animation
    setTimeout(() => {
      const bar = container.lastElementChild.querySelector('.h-full');
      if (bar) bar.style.width = `${value}%`;
    }, 100);
  });
}

function renderTimeline(container, segments) {
  container.innerHTML = '';
  const totalDuration = segments[segments.length - 1].end;

  segments.forEach(segment => {
    const duration = segment.end - segment.start;
    const widthPercent = (duration / totalDuration) * 100;
    const colorClass = segment.status === 'authentic' ? 'bg-emerald-500/80 hover:bg-emerald-400' : 'bg-red-500/80 hover:bg-red-400';

    const div = document.createElement('div');
    div.className = `h-full ${colorClass} relative group border-r border-black/20 last:border-0 transition-opacity`;
    div.style.width = `${widthPercent}%`;

    // Tooltip
    div.innerHTML = `
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black border border-gray-700 p-2 rounded text-[10px] whitespace-nowrap z-20 shadow-xl">
                <div class="font-bold mb-1 uppercase ${segment.status === 'authentic' ? 'text-emerald-400' : 'text-red-400'}">${segment.status}</div>
                <div>Confidence: ${segment.score}%</div>
                <div>${segment.start}s - ${segment.end}s</div>
            </div>
        `;

    container.appendChild(div);
  });
}

function renderList(container, items) {
  container.innerHTML = '';
  if (items) {
    items.forEach(detail => {
      const item = document.createElement('div');
      item.className = 'p-2 border-l-2 mb-2 bg-white/5';
      item.style.borderColor = detail.level === 'High' ? '#ef4444' : detail.level === 'Medium' ? '#f59e0b' : '#22c55e';
      item.innerHTML = `
                <div class="text-xs">
                    <h4 class="font-bold text-gray-300 inline mr-2">${detail.title}:</h4>
                    <span class="text-gray-400">${detail.description}</span>
                </div>
            `;
      container.appendChild(item);
    });
  }
}

async function handleGenerateSummary() {
  generateSummaryBtn.disabled = true;
  generateSummaryBtn.innerHTML = `<span>Generating...</span>`;
  summaryPanel.classList.add('hidden');

  try {
    const response = await fetch(`${config.API_URL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysisResult })
    });

    if (!response.ok) throw new Error('Summary generation failed');

    const data = await response.json();
    summaryText.textContent = data.summary;
    summaryPanel.classList.remove('hidden');

  } catch (error) {
    console.error('Summary error:', error);
    summaryText.textContent = 'Could not generate summary.';
    summaryPanel.classList.remove('hidden');
  } finally {
    generateSummaryBtn.disabled = false;
    generateSummaryBtn.innerHTML = '>> RECOMPILE_MISSION_REPORT';
  }
}

async function handleDownloadReport() {
  if (!analysisResult) return;

  const btn = downloadReportBtn;
  const originalText = btn.innerHTML;
  btn.textContent = 'Generating PDF...';
  btn.disabled = true;

  try {
    const response = await fetch(`${config.API_URL}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisResult,
        fileName: fileMetadata ? fileMetadata.name : 'Analyzed File'
      })
    });

    if (!response.ok) throw new Error('Failed to generate PDF');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Analysis_Report_${new Date().getTime()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (e) {
    console.error("PDF Download failed", e);
    alert("Failed to download PDF report.");
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function handleFeedbackReport() {
  if (!analysisResult) return;

  // Disable button to prevent double submit
  reportFeedbackBtn.disabled = true;
  reportFeedbackBtn.classList.add('opacity-50', 'cursor-not-allowed');
  reportFeedbackBtn.innerHTML = 'Submitting Feedback...';

  const predictedLabel = analysisResult.is_deepfake ? 'Fake' : 'Real';
  const userFeedbackLabel = analysisResult.is_deepfake ? 'Real' : 'Fake'; // User indicating opposite
  const user = JSON.parse(localStorage.getItem('user')) || {};

  try {
    const response = await fetch(`${config.API_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id || null,
        fileHash: analysisResult.file_hash,
        predictedLabel: predictedLabel,
        userFeedbackLabel: userFeedbackLabel
      })
    });

    if (!response.ok) throw new Error('Failed to submit feedback');

    reportFeedbackBtn.classList.add('hidden');
    feedbackSuccess.classList.remove('hidden');

  } catch (e) {
    console.error("Feedback submission failed:", e);
    alert("Failed to submit feedback. Our systems might be overloaded.");
    reportFeedbackBtn.disabled = false;
    reportFeedbackBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    reportFeedbackBtn.innerHTML = 'Report Incorrect Result';
  }
}

generateSummaryBtn.addEventListener('click', handleGenerateSummary);
downloadReportBtn.addEventListener('click', handleDownloadReport);
if (reportFeedbackBtn) {
  reportFeedbackBtn.addEventListener('click', handleFeedbackReport);
}
