
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const loaderSection = document.getElementById('loader-section');
const resultsSection = document.getElementById('results-section');
const resetBtn = document.getElementById('reset-btn');
const docPreview = document.getElementById('doc-preview');

// Result Elements
const docStatus = document.getElementById('doc-status');
const resName = document.getElementById('res-name');
const resId = document.getElementById('res-id');
const resExpiry = document.getElementById('res-expiry');
const forensicList = document.querySelector('#results-section ul'); // Select the list

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) {
    handleFile(e.target.files[0]);
  }
});

function handleFile(file) {
  if (!file) return;

  // UI Transition
  uploadSection.classList.add('hidden');
  loaderSection.classList.remove('hidden');

  // Simulate Processing
  setTimeout(() => {
    showResults(file);
  }, 2000);
}

// Simple hash function to generate consistent results for the same file
function generateHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function showResults(file) {
  loaderSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');

  // Display Preview
  const reader = new FileReader();
  reader.onload = function (e) {
    if (file.type.startsWith('image/')) {
      docPreview.innerHTML = `<img src="${e.target.result}" class="max-w-full max-h-full object-contain">`;
    } else {
      // PDF or other
      docPreview.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-6xl mb-2">📄</p>
                    <p class="text-xs text-gray-400 font-mono">${file.name}</p>
                    <p class="text-xs text-gray-600 mt-1">${(file.size / 1024).toFixed(2)} KB</p>
                </div>`;
    }
  };
  reader.readAsDataURL(file);

  // --- Dynamic Analysis Logic ---
  const fileHash = generateHash(file.name + file.size);
  const fileNameLower = file.name.toLowerCase();

  // 1. Determine Document Type based on filename (Simulation)
  let docType = "UNKNOWN_DOC";
  if (fileNameLower.includes('passport')) docType = "PASSPORT";
  else if (fileNameLower.includes('id') || fileNameLower.includes('card')) docType = "ID_CARD";
  else if (fileNameLower.includes('license') || fileNameLower.includes('dl')) docType = "DRIVER_LICENSE";
  else if (file.type === 'application/pdf') docType = "OFFICIAL_DOCUMENT";

  // 2. Determine Authenticity (Deterministic based on hash)
  // 80% chance of 'Authentic', 10% 'Suspicious', 10% 'Forged'
  const integrityScore = fileHash % 100;

  // 3. Populate Extracted Data
  // We use the hash to pick "random" names to make it seem like OCR is working
  const names = ["Aarav Patel", "Sarah Johnson", "Michael Chen", "Priya Sharma", "David Kim", "John Doe"];
  const extractedName = names[fileHash % names.length];

  const randomId = "X" + (fileHash % 10000000).toString().padStart(8, '0');

  // Future Date
  const futureYear = 2025 + (fileHash % 10);
  const extractedExpiry = `${futureYear}-0${(fileHash % 9) + 1}-15`;

  resName.textContent = extractedName;
  resId.textContent = randomId;
  resExpiry.textContent = extractedExpiry;

  // 4. Set Status Tag & Generate Summary
  let summaryText = "";

  if (integrityScore > 20) {
    docStatus.textContent = "VERIFIED_AUTHENTIC";
    docStatus.className = "px-2 py-1 bg-green-900/30 text-green-400 border border-green-500/50 rounded text-xs animate-pulse";

    // Positive Forensics
    forensicList.innerHTML = `
            <li class="flex justify-between"><span class="text-gray-400">Document Structure</span><span class="text-green-500">VALID</span></li>
            <li class="flex justify-between"><span class="text-gray-400">Font Analysis</span><span class="text-green-500">MATCH</span></li>
            <li class="flex justify-between"><span class="text-gray-400">Hologram Check</span><span class="text-green-500">DETECTED</span></li>
        `;

    summaryText = `CONCLUSION: The artifact "${file.name}" has successfully passed all primary forensic verification layers. Structure analysis confirms alignment with standard issuance protocols for ${docType}. Font rendering matches official typography databases with no signs of digital alteration. Holographic security features are present and intact. \n\nFINAL ASSESSMENT: The document appears AUTHENTIC and unaltered. Recommended for acceptance.`;

  } else if (integrityScore > 10) {
    docStatus.textContent = "SUSPICIOUS_ELEMENTS";
    docStatus.className = "px-2 py-1 bg-yellow-900/30 text-yellow-400 border border-yellow-500/50 rounded text-xs";

    // Mixed Forensics
    forensicList.innerHTML = `
            <li class="flex justify-between"><span class="text-gray-400">Document Structure</span><span class="text-green-500">VALID</span></li>
            <li class="flex justify-between"><span class="text-gray-400">Font Analysis</span><span class="text-yellow-500">INCONSISTENT</span></li>
            <li class="flex justify-between"><span class="text-gray-400">Hologram Check</span><span class="text-green-500">DETECTED</span></li>
        `;

    summaryText = `CONCLUSION: Analysis of "${file.name}" reveals minor irregularities. While the document structure and holographic layers appear valid, the font analysis detected slight kerning inconsistencies in the biographical data section. This could indicate a high-quality reproduction or a non-standard issuance. \n\nFINAL ASSESSMENT: The document is classified as SUSPICIOUS. Manual review is widely recommended before processing.`;

  } else {
    docStatus.textContent = "LIKELY_FORGED";
    docStatus.className = "px-2 py-1 bg-red-900/30 text-red-400 border border-red-500/50 rounded text-xs animate-pulse";

    // Negative Forensics
    forensicList.innerHTML = `
            <li class="flex justify-between"><span class="text-gray-400">Document Structure</span><span class="text-red-500">INVALID</span></li>
            <li class="flex justify-between"><span class="text-gray-400">Font Analysis</span><span class="text-red-500">MISMATCH</span></li>
            <li class="flex justify-between"><span class="text-gray-400">Pixel Tampering</span><span class="text-red-500">DETECTED</span></li>
        `;

    summaryText = `CONCLUSION: CRITICAL ALERTS triggered for "${file.name}". Digital forensic scan indicates widespread manipulation. The pixel density map suggests copy-paste tampering in the ID number region. Font types do not match the expected standard for this document class. \n\nFINAL ASSESSMENT: The document is confirmed as LIKELY FORGED. Immediate rejection and security flagging is advised.`;
  }

  // Typewriter effect for summary
  const summaryEl = document.getElementById('doc-summary-text');
  summaryEl.textContent = "";
  let i = 0;
  const typeWriter = () => {
    if (i < summaryText.length) {
      summaryEl.textContent += summaryText.charAt(i);
      i++;
      setTimeout(typeWriter, 10); // Speed of typing
    }
  };
  typeWriter();

}

resetBtn.addEventListener('click', () => {
  resultsSection.classList.add('hidden');
  fileInput.value = '';
  loaderSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
});
