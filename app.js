const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const preview = document.getElementById('preview');
const captureBtn = document.getElementById('captureBtn');
const switchBtn = document.getElementById('switchBtn');
const downloadBtn = document.getElementById('downloadBtn');
const minSizeInput = document.getElementById('minSize');
const maxSizeInput = document.getElementById('maxSize');
const statusDiv = document.getElementById('status');
const fileNameInput = document.getElementById('fileName');

let capturedImageBlob = null;
let pdfBlob = null;
let currentFacingMode = 'environment';
let currentStream = null;

// Open camera with facingMode
async function startCamera(facingMode = 'environment') {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
    video.srcObject = stream;
    currentStream = stream;
  } catch (err) {
    statusDiv.textContent = 'Camera access denied.';
  }
}
startCamera(currentFacingMode);

// Switch camera
switchBtn.onclick = () => {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  startCamera(currentFacingMode);
};

// Capture image
captureBtn.onclick = async () => {
  statusDiv.textContent = '';
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(async (blob) => {
    preview.src = URL.createObjectURL(blob);
    preview.style.display = 'block';
    capturedImageBlob = blob;
    await processImageToPDF(blob);
  }, 'image/jpeg', 0.95);
};

// Compress and generate PDF
async function processImageToPDF(imageBlob) {
  const minKB = parseInt(minSizeInput.value) || 50;
  const maxKB = parseInt(maxSizeInput.value) || 300;
  let quality = 0.95;
  let width = video.videoWidth;
  let height = video.videoHeight;
  let attempts = 0;
  let pdfSizeKB = 0;
  let compressedBlob = imageBlob;
  statusDiv.textContent = 'Processing...';
  while (attempts < 15) {
    // Compress image
    compressedBlob = await window.imageCompression(imageBlob, {
      maxWidthOrHeight: Math.round(width),
      initialQuality: quality,
      useWebWorker: true
    });
    // Convert to PDF
    const pdfDoc = await PDFLib.PDFDocument.create();
    const imgBytes = await compressedBlob.arrayBuffer();
    const img = await pdfDoc.embedJpg(imgBytes);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    const pdfBytes = await pdfDoc.save();
    pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    pdfSizeKB = Math.round(pdfBlob.size / 1024);

    // Strictly enforce range
    if (pdfSizeKB >= minKB && pdfSizeKB <= maxKB) {
      statusDiv.textContent = `PDF ready (${pdfSizeKB} KB)`;
      downloadBtn.disabled = false;
      return;
    }

    // If out of range, keep compressing
    if (pdfSizeKB > maxKB) {
      quality -= 0.15;
      width *= 0.85;
      height *= 0.85;
    } else if (pdfSizeKB < minKB) {
      quality += 0.05;
      width *= 1.05;
      height *= 1.05;
    }
    // Ensure quality does not go below 0.1
    if (quality < 0.1) quality = 0.1;
    attempts++;
  }
  // Only enable download if strictly in range
  statusDiv.textContent = `Could not fit PDF strictly in range (${minKB} KB - ${maxKB} KB). Final size: ${pdfSizeKB} KB.`;
  downloadBtn.disabled = true;
}

// Download PDF
downloadBtn.onclick = () => {
  if (pdfBlob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pdfBlob);
    // Use user input for file name, fallback to default
    const name = fileNameInput.value.trim() || 'camera-image';
    a.download = `${name}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
