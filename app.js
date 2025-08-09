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

// Cropping elements
const cropContainer = document.getElementById('cropContainer');
const cropImage = document.getElementById('cropImage');
const cropOverlay = document.getElementById('cropOverlay');
const cropSelection = document.getElementById('cropSelection');
const cropConfirm = document.getElementById('cropConfirm');
const cropCancel = document.getElementById('cropCancel');
const cropReset = document.getElementById('cropReset');
const cropSkip = document.getElementById('cropSkip');
// Mobile crop elements
const mobileCropContainer = document.getElementById('mobileCropContainer');
const mobileCropCanvas = document.getElementById('mobileCropCanvas');
const mobileCropConfirm = document.getElementById('mobileCropConfirm');
const mobileCropSkip = document.getElementById('mobileCropSkip');
const mobileCropCancel = document.getElementById('mobileCropCancel');
const mobileCropReset = document.getElementById('mobileCropReset');

// Mobile crop state
let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let mcCtx = null;
let mcImage = null;
let mcScale = 1;
let mcMinScale = 1;
let mcMaxScale = 5;
let mcStartDistance = 0;
let mcTranslateX = 0;
let mcTranslateY = 0;
let mcLastTranslateX = 0;
let mcLastTranslateY = 0;
let mcDragging = false;
let mcDragStartX = 0;
let mcDragStartY = 0;

function showMobileCrop(imageBlob){
  mobileCropContainer.style.display = 'flex';
  if(!mcCtx){ mcCtx = mobileCropCanvas.getContext('2d'); }
  mcImage = new Image();
  mcImage.onload = () => {
    // Fit canvas to viewport
    mobileCropCanvas.width = window.innerWidth;
    mobileCropCanvas.height = window.innerHeight * 0.7; // leave space for buttons
    // Determine initial scale to cover frame
    const frameW = window.innerWidth * 0.8;
    const frameH = window.innerHeight * 0.6;
    const scaleW = frameW / mcImage.width;
    const scaleH = frameH / mcImage.height;
    mcScale = Math.max(scaleW, scaleH);
    mcMinScale = mcScale;
    mcTranslateX = (mobileCropCanvas.width - mcImage.width * mcScale)/2;
    mcTranslateY = (mobileCropCanvas.height - mcImage.height * mcScale)/2;
    drawMobileCrop();
  };
  mcImage.src = URL.createObjectURL(imageBlob);
}

function drawMobileCrop(){
  if(!mcCtx || !mcImage) return;
  mcCtx.clearRect(0,0,mobileCropCanvas.width,mobileCropCanvas.height);
  mcCtx.save();
  mcCtx.setTransform(mcScale,0,0,mcScale,mcTranslateX,mcTranslateY);
  mcCtx.drawImage(mcImage,0,0);
  mcCtx.restore();
}

function handleMobileCropTouchStart(e){
  if(e.touches.length === 1){
    mcDragging = true;
    mcDragStartX = e.touches[0].clientX;
    mcDragStartY = e.touches[0].clientY;
    mcLastTranslateX = mcTranslateX;
    mcLastTranslateY = mcTranslateY;
  } else if(e.touches.length === 2){
    mcDragging = false;
    mcStartDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}

function handleMobileCropTouchMove(e){
  e.preventDefault();
  if(e.touches.length === 1 && mcDragging){
    const dx = e.touches[0].clientX - mcDragStartX;
    const dy = e.touches[0].clientY - mcDragStartY;
    mcTranslateX = mcLastTranslateX + dx;
    mcTranslateY = mcLastTranslateY + dy;
    drawMobileCrop();
  } else if(e.touches.length === 2){
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    if(mcStartDistance){
      const factor = dist / mcStartDistance;
      const newScale = Math.min(mcMaxScale, Math.max(mcMinScale, mcScale * factor));
      // Zoom towards center of two touches
      const centerX = (e.touches[0].clientX + e.touches[1].clientX)/2 - mobileCropCanvas.getBoundingClientRect().left;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY)/2 - mobileCropCanvas.getBoundingClientRect().top;
      const preZoomX = (centerX - mcTranslateX)/mcScale;
      const preZoomY = (centerY - mcTranslateY)/mcScale;
      mcScale = newScale;
      mcTranslateX = centerX - preZoomX * mcScale;
      mcTranslateY = centerY - preZoomY * mcScale;
      drawMobileCrop();
    }
  }
}

function handleMobileCropTouchEnd(e){
  if(e.touches.length === 0){
    mcDragging = false;
    mcStartDistance = 0;
  }
}

function confirmMobileCrop(){
  // Frame dimensions
  const frameW = window.innerWidth * 0.8;
  const frameH = window.innerHeight * 0.6;
  const frameX = (mobileCropCanvas.width - frameW)/2;
  const frameY = (mobileCropCanvas.height - frameH)/2;
  // Create offscreen canvas to extract area
  const out = document.createElement('canvas');
  out.width = frameW;
  out.height = frameH;
  const octx = out.getContext('2d');
  // Inverse transform logic
  octx.drawImage(
    mcImage,
    (frameX - mcTranslateX)/mcScale,
    (frameY - mcTranslateY)/mcScale,
    frameW / mcScale,
    frameH / mcScale,
    0,0,frameW,frameH
  );
  out.toBlob(async blob => {
    capturedImageBlob = blob;
    preview.src = URL.createObjectURL(blob);
    preview.style.display = 'block';
    mobileCropContainer.style.display = 'none';
    statusDiv.textContent = 'Crop applied! Processing PDF...';
    await processImageToPDF(blob);
  }, 'image/jpeg', 0.95);
}

function resetMobileCrop(){
  if(!mcImage) return;
  const frameW = window.innerWidth * 0.8;
  const frameH = window.innerHeight * 0.6;
  const scaleW = frameW / mcImage.width;
  const scaleH = frameH / mcImage.height;
  mcScale = Math.max(scaleW, scaleH);
  mcMinScale = mcScale;
  mcTranslateX = (mobileCropCanvas.width - mcImage.width * mcScale)/2;
  mcTranslateY = (mobileCropCanvas.height - mcImage.height * mcScale)/2;
  drawMobileCrop();
}

// Mobile crop event bindings
if(isTouchDevice){
  mobileCropCanvas.addEventListener('touchstart', handleMobileCropTouchStart, { passive:false });
  mobileCropCanvas.addEventListener('touchmove', handleMobileCropTouchMove, { passive:false });
  mobileCropCanvas.addEventListener('touchend', handleMobileCropTouchEnd, { passive:false });
  mobileCropConfirm && (mobileCropConfirm.onclick = confirmMobileCrop);
  mobileCropSkip && (mobileCropSkip.onclick = async ()=>{ mobileCropContainer.style.display='none'; preview.src = URL.createObjectURL(originalImageBlob); preview.style.display='block'; await processImageToPDF(originalImageBlob); });
  mobileCropCancel && (mobileCropCancel.onclick = ()=>{ mobileCropContainer.style.display='none'; preview.style.display='none'; });
  mobileCropReset && (mobileCropReset.onclick = resetMobileCrop);
  window.addEventListener('resize', ()=>{ if(mobileCropContainer.style.display==='flex'){ resetMobileCrop(); }});
}

let capturedImageBlob = null;
let originalImageBlob = null;
let pdfBlob = null;
let currentFacingMode = 'environment';
let currentStream = null;

// Cropping state
let isDragging = false;
let isResizing = false;
let currentHandle = null;
let startX = 0;
let startY = 0;
let cropData = {
  x: 0,
  y: 0,
  width: 200,
  height: 200
};

// Initialize the app
function initializeApp() {
  // Always set default to back camera on load
  currentFacingMode = 'environment';
  // Set initial status
  statusDiv.textContent = 'Initializing camera...';
  
  // Hide preview initially
  preview.style.display = 'none';
  
  // Disable download button initially
  downloadBtn.disabled = true;
  
  // Add input validation
  minSizeInput.addEventListener('input', validateSizeInputs);
  maxSizeInput.addEventListener('input', validateSizeInputs);
  
  // Initialize cropping system
  initializeCropping();
  
  // Run debug check in console (for development)
  debugCameraAccess();
  
  // Check available cameras and start camera
  checkAvailableCameras().then(() => {
    startCamera('environment');
  });
}

// Validate size inputs
function validateSizeInputs() {
  const minVal = parseInt(minSizeInput.value);
  const maxVal = parseInt(maxSizeInput.value);
  
  if (minVal && maxVal && minVal >= maxVal) {
    statusDiv.textContent = 'Warning: Minimum size should be less than maximum size.';
    statusDiv.style.color = '#ff6b6b';
  } else if (statusDiv.textContent.includes('Warning:')) {
    statusDiv.textContent = '';
    statusDiv.style.color = '#0078d4';
  }
}

// Check available cameras
async function checkAvailableCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    console.log('Available cameras:', videoDevices);
    
    // Add debug info to help troubleshoot
    videoDevices.forEach((device, index) => {
      console.log(`Camera ${index + 1}:`, {
        label: device.label,
        deviceId: device.deviceId,
        groupId: device.groupId
      });
    });
    
    if (videoDevices.length < 2) {
      // Hide switch button if only one camera
      switchBtn.style.display = videoDevices.length === 0 ? 'none' : 'block';
      switchBtn.textContent = videoDevices.length === 0 ? 'No Camera' : 'Camera';
      if (videoDevices.length === 1) {
        switchBtn.disabled = true;
        switchBtn.textContent = 'Single Camera';
      }
    } else {
      switchBtn.style.display = 'block';
      switchBtn.disabled = false;
      switchBtn.textContent = currentFacingMode === 'environment' ? 'Switch to Front' : 'Switch to Back';
    }
    
    return videoDevices;
  } catch (error) {
    console.error('Error checking cameras:', error);
    return [];
  }
}

// Debug function to test camera access
async function debugCameraAccess() {
  console.log('=== Camera Debug Info ===');
  
  try {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('getUserMedia not supported');
      return;
    }
    
    // Test basic camera access
    console.log('Testing basic camera access...');
    const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log('✓ Basic camera access works');
    basicStream.getTracks().forEach(track => track.stop());
    
    // Test environment camera
    console.log('Testing environment (back) camera...');
    try {
      const envStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      console.log('✓ Environment camera works');
      envStream.getTracks().forEach(track => track.stop());
    } catch (envError) {
      console.log('✗ Environment camera failed:', envError);
    }
    
    // Test user camera
    console.log('Testing user (front) camera...');
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      console.log('✓ User camera works');
      userStream.getTracks().forEach(track => track.stop());
    } catch (userError) {
      console.log('✗ User camera failed:', userError);
    }
    
    // List all devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log('All available devices:', devices);
    
  } catch (error) {
    console.error('Debug camera access failed:', error);
  }
  
  console.log('=== End Camera Debug ===');
}

// Cropping System Functions
function initializeCropping() {
  // Initialize crop selection in center
  function resetCropSelection() {
    const imageRect = cropImage.getBoundingClientRect();
    const overlayRect = cropOverlay.getBoundingClientRect();
    
    const imageWidth = imageRect.width;
    const imageHeight = imageRect.height;
    
    // Center the crop selection (50% of image size)
    const cropWidth = Math.min(imageWidth * 0.8, 300);
    const cropHeight = Math.min(imageHeight * 0.8, 300);
    
    cropData.x = (imageWidth - cropWidth) / 2;
    cropData.y = (imageHeight - cropHeight) / 2;
    cropData.width = cropWidth;
    cropData.height = cropHeight;
    
    updateCropSelection();
  }
  
  // Update crop selection visual
  function updateCropSelection() {
    cropSelection.style.left = cropData.x + 'px';
    cropSelection.style.top = cropData.y + 'px';
    cropSelection.style.width = cropData.width + 'px';
    cropSelection.style.height = cropData.height + 'px';
  }
  
  // Get mouse/touch position relative to overlay
  function getRelativePosition(event) {
    const rect = cropOverlay.getBoundingClientRect();
    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }
  
  // Mouse/Touch event handlers
  function handleStart(event) {
    event.preventDefault();
    const pos = getRelativePosition(event);
    startX = pos.x;
    startY = pos.y;
    
    // Check if clicking on a handle
    const handle = event.target.closest('.crop-handle');
    if (handle) {
      isResizing = true;
      currentHandle = handle.className.split(' ')[1]; // Get handle direction
    } else if (event.target === cropSelection || event.target.closest('.crop-selection')) {
      isDragging = true;
    } else {
      // Start new selection
      cropData.x = pos.x;
      cropData.y = pos.y;
      cropData.width = 0;
      cropData.height = 0;
      isDragging = true;
      updateCropSelection();
    }
  }
  
  function handleMove(event) {
    if (!isDragging && !isResizing) return;
    
    event.preventDefault();
    const pos = getRelativePosition(event);
    const deltaX = pos.x - startX;
    const deltaY = pos.y - startY;
    
    const imageRect = cropImage.getBoundingClientRect();
    const overlayRect = cropOverlay.getBoundingClientRect();
    const maxWidth = imageRect.width;
    const maxHeight = imageRect.height;
    
    if (isDragging && !isResizing) {
      if (cropData.width === 0 && cropData.height === 0) {
        // Creating new selection
        cropData.width = Math.abs(deltaX);
        cropData.height = Math.abs(deltaY);
        if (deltaX < 0) cropData.x = pos.x;
        if (deltaY < 0) cropData.y = pos.y;
      } else {
        // Moving existing selection
        cropData.x = Math.max(0, Math.min(maxWidth - cropData.width, cropData.x + deltaX));
        cropData.y = Math.max(0, Math.min(maxHeight - cropData.height, cropData.y + deltaY));
        startX = pos.x;
        startY = pos.y;
      }
    } else if (isResizing) {
      // Handle resizing based on current handle
      let newX = cropData.x;
      let newY = cropData.y;
      let newWidth = cropData.width;
      let newHeight = cropData.height;
      
      switch (currentHandle) {
        case 'nw':
          newX = Math.max(0, cropData.x + deltaX);
          newY = Math.max(0, cropData.y + deltaY);
          newWidth = cropData.width - deltaX;
          newHeight = cropData.height - deltaY;
          break;
        case 'ne':
          newY = Math.max(0, cropData.y + deltaY);
          newWidth = cropData.width + deltaX;
          newHeight = cropData.height - deltaY;
          break;
        case 'sw':
          newX = Math.max(0, cropData.x + deltaX);
          newWidth = cropData.width - deltaX;
          newHeight = cropData.height + deltaY;
          break;
        case 'se':
          newWidth = cropData.width + deltaX;
          newHeight = cropData.height + deltaY;
          break;
        case 'n':
          newY = Math.max(0, cropData.y + deltaY);
          newHeight = cropData.height - deltaY;
          break;
        case 's':
          newHeight = cropData.height + deltaY;
          break;
        case 'e':
          newWidth = cropData.width + deltaX;
          break;
        case 'w':
          newX = Math.max(0, cropData.x + deltaX);
          newWidth = cropData.width - deltaX;
          break;
      }
      
      // Apply constraints
      if (newWidth >= 50 && newX + newWidth <= maxWidth) {
        cropData.x = newX;
        cropData.width = newWidth;
        if (currentHandle.includes('w') || currentHandle.includes('e')) {
          startX = pos.x;
        }
      }
      
      if (newHeight >= 50 && newY + newHeight <= maxHeight) {
        cropData.y = newY;
        cropData.height = newHeight;
        if (currentHandle.includes('n') || currentHandle.includes('s')) {
          startY = pos.y;
        }
      }
    }
    
    updateCropSelection();
  }
  
  function handleEnd(event) {
    isDragging = false;
    isResizing = false;
    currentHandle = null;
  }
  
  // Event listeners
  cropOverlay.addEventListener('mousedown', handleStart);
  cropOverlay.addEventListener('mousemove', handleMove);
  cropOverlay.addEventListener('mouseup', handleEnd);
  
  // Touch events
  cropOverlay.addEventListener('touchstart', handleStart);
  cropOverlay.addEventListener('touchmove', handleMove);
  cropOverlay.addEventListener('touchend', handleEnd);
  
  // Button handlers
  cropReset.onclick = resetCropSelection;
  
  cropCancel.onclick = () => {
    cropContainer.style.display = 'none';
    // Reset to original image
    capturedImageBlob = originalImageBlob;
    if (originalImageBlob) {
      preview.src = URL.createObjectURL(originalImageBlob);
      preview.style.display = 'block';
    }
  };
  
  cropConfirm.onclick = async () => {
    await applyCrop();
    cropContainer.style.display = 'none';
  };
  
  cropSkip.onclick = async () => {
    statusDiv.textContent = 'Skipping crop, processing original image...';
    cropContainer.style.display = 'none';
    
    // Use original image without cropping
    capturedImageBlob = originalImageBlob;
    preview.src = URL.createObjectURL(originalImageBlob);
    preview.style.display = 'block';
    
    // Process to PDF
    await processImageToPDF(originalImageBlob);
  };
  
  // Initialize on image load
  cropImage.onload = resetCropSelection;
  
  // Keyboard support
  function handleKeyDown(event) {
    if (cropContainer.style.display !== 'flex') return;
    
    switch (event.key) {
      case 'Escape':
        cropCancel.click();
        break;
      case 'Enter':
        cropConfirm.click();
        break;
      case 'r':
      case 'R':
        cropReset.click();
        break;
      case 's':
      case 'S':
        cropSkip.click();
        break;
    }
  }
  
  document.addEventListener('keydown', handleKeyDown);
  
  return { resetCropSelection, updateCropSelection };
}

// Apply crop to image
async function applyCrop() {
  try {
    statusDiv.textContent = 'Applying crop...';
    
    // Get image natural dimensions
    const img = new Image();
    img.src = cropImage.src;
    
    await new Promise(resolve => {
      img.onload = resolve;
    });
    
    // Calculate crop ratios
    const displayRect = cropImage.getBoundingClientRect();
    const scaleX = img.naturalWidth / displayRect.width;
    const scaleY = img.naturalHeight / displayRect.height;
    
    // Calculate actual crop coordinates
    const actualCrop = {
      x: cropData.x * scaleX,
      y: cropData.y * scaleY,
      width: cropData.width * scaleX,
      height: cropData.height * scaleY
    };
    
    // Create canvas for cropping
    const cropCanvas = document.createElement('canvas');
    const ctx = cropCanvas.getContext('2d');
    
    cropCanvas.width = actualCrop.width;
    cropCanvas.height = actualCrop.height;
    
    // Draw cropped image
    ctx.drawImage(
      img,
      actualCrop.x, actualCrop.y, actualCrop.width, actualCrop.height,
      0, 0, actualCrop.width, actualCrop.height
    );
    
    // Convert to blob
    const croppedBlob = await new Promise(resolve => {
      cropCanvas.toBlob(resolve, 'image/jpeg', 0.95);
    });
    
    // Update preview and captured image
    capturedImageBlob = croppedBlob;
    preview.src = URL.createObjectURL(croppedBlob);
    preview.style.display = 'block';
    
    statusDiv.textContent = 'Crop applied! Processing PDF...';
    
    // Process to PDF
    await processImageToPDF(croppedBlob);
    
  } catch (error) {
    console.error('Crop error:', error);
    statusDiv.textContent = 'Error applying crop. Please try again.';
  }
}

// Show cropping interface
function showCropInterface(imageBlob) {
  originalImageBlob = imageBlob;
  if(isTouchDevice){
    showMobileCrop(imageBlob);
  } else {
    cropImage.src = URL.createObjectURL(imageBlob);
    cropContainer.style.display = 'flex';
  }
}

// Open camera with facingMode
async function startCamera(facingMode = 'environment') {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  function inferFacingModeFromStream(stream, requested) {
    try {
      const track = stream.getVideoTracks()[0];
      if (!track) return requested;
      const label = (track.label || '').toLowerCase();
      if (label.includes('front') || label.includes('user') || label.includes('face')) return 'user';
      if (label.includes('back') || label.includes('rear') || label.includes('environment')) return 'environment';
      return requested; // fallback to requested when unsure
    } catch { return requested; }
  }
  
  // Try multiple constraint configurations for better device compatibility
  const constraints = [
    // First try: exact facingMode
    { video: { facingMode: { exact: facingMode } } },
    // Second try: ideal facingMode
    { video: { facingMode: { ideal: facingMode } } },
    // Third try: just facingMode string
    { video: { facingMode: facingMode } },
    // Fourth try: deviceId based approach (we'll enumerate devices)
    null, // Will be set dynamically
    // Last resort: any video
    { video: true }
  ];
  
  try {
    // Try to get specific camera using constraints
    for (let i = 0; i < constraints.length - 1; i++) {
      try {
        if (constraints[i] === null) {
          // Try device enumeration approach
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          if (videoDevices.length > 0) {
            // Find the appropriate camera
            let targetDevice = videoDevices.find(device => 
              facingMode === 'environment' ? 
                device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear') :
                device.label.toLowerCase().includes('front') || device.label.toLowerCase().includes('user')
            );
            
            // If no specific camera found, use first available for environment, last for user
            if (!targetDevice) {
              targetDevice = facingMode === 'environment' ? 
                videoDevices[videoDevices.length - 1] : videoDevices[0];
            }
            
            if (targetDevice && targetDevice.deviceId) {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: targetDevice.deviceId } }
              });
        video.srcObject = stream;
        currentStream = stream;
        const actualMode = inferFacingModeFromStream(stream, facingMode);
        currentFacingMode = actualMode;
        statusDiv.textContent = `Camera ready (${actualMode})`;
        // Update switch button text if multiple cameras
        switchBtn.textContent = actualMode === 'environment' ? 'Switch to Front' : 'Switch to Back';
              return;
            }
          }
          continue;
        }
        
    const stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
    video.srcObject = stream;
    currentStream = stream;
    const actualMode = inferFacingModeFromStream(stream, facingMode);
    currentFacingMode = actualMode;
    statusDiv.textContent = `Camera ready (${actualMode})`;
    switchBtn.textContent = actualMode === 'environment' ? 'Switch to Front' : 'Switch to Back';
        return;
        
      } catch (constraintError) {
        console.log(`Constraint ${i} failed:`, constraintError);
        continue;
      }
    }
    
    // Last resort - any camera
  const stream = await navigator.mediaDevices.getUserMedia(constraints[constraints.length - 1]);
  video.srcObject = stream;
  currentStream = stream;
  const actualMode = inferFacingModeFromStream(stream, facingMode);
  currentFacingMode = actualMode;
  statusDiv.textContent = `Camera ready (${actualMode === facingMode ? 'default' : actualMode})`;
  switchBtn.textContent = actualMode === 'environment' ? 'Switch to Front' : 'Switch to Back';
    
  } catch (err) {
    console.error('Camera error:', err);
    statusDiv.textContent = `Camera access denied or ${facingMode} camera not available.`;
    
    // Try to provide helpful error message
    if (err.name === 'NotFoundError' || err.name === 'DeviceNotFoundError') {
      statusDiv.textContent = `${facingMode === 'environment' ? 'Back' : 'Front'} camera not found. Try switching cameras.`;
    } else if (err.name === 'NotAllowedError') {
      statusDiv.textContent = 'Camera access denied. Please allow camera permissions.';
    } else if (err.name === 'NotReadableError') {
      statusDiv.textContent = 'Camera is being used by another application.';
    }
  }
}

// Initialize the app
initializeApp();

// Switch camera
switchBtn.onclick = async () => {
  if (switchBtn.disabled) return;
  
  statusDiv.textContent = 'Switching camera...';
  const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  
  try {
    await startCamera(newFacingMode);
    currentFacingMode = newFacingMode;
    
    // Update button text
    switchBtn.textContent = currentFacingMode === 'environment' ? 'Switch to Front' : 'Switch to Back';
    
  } catch (error) {
    console.error('Error switching camera:', error);
    statusDiv.textContent = `Failed to switch to ${newFacingMode === 'environment' ? 'back' : 'front'} camera`;
    
    // Try to go back to the original camera
    setTimeout(() => {
      startCamera(currentFacingMode);
    }, 2000);
  }
};

// Capture image
captureBtn.onclick = async () => {
  statusDiv.textContent = '';
  
  if (!video.videoWidth || !video.videoHeight) {
    statusDiv.textContent = 'Error: Camera not ready. Please wait for camera to load.';
    return;
  }
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  canvas.toBlob(async (blob) => {
    if (!blob) {
      statusDiv.textContent = 'Error: Failed to capture image.';
      return;
    }
    
    statusDiv.textContent = 'Image captured! Opening crop tool...';
    
    // Show cropping interface instead of direct processing
    showCropInterface(blob);
    
  }, 'image/jpeg', 0.95);
};

// Compress and generate PDF
async function processImageToPDF(imageBlob) {
  const minKB = parseInt(minSizeInput.value) || 50;
  const maxKB = parseInt(maxSizeInput.value) || 300;
  
  // Check if required libraries are loaded
  if (!window.imageCompression || !PDFLib) {
    statusDiv.textContent = 'Error: Required libraries not loaded. Please refresh the page.';
    return;
  }
  let quality = 0.95;
  let width = video.videoWidth;
  let height = video.videoHeight;
  let attempts = 0;
  let pdfSizeKB = 0;
  let compressedBlob = imageBlob;
  
  statusDiv.textContent = 'Processing...';
  
  // Validate input ranges
  if (minKB >= maxKB) {
    statusDiv.textContent = 'Error: Minimum size must be less than maximum size.';
    return;
  }
  
  try {
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
      
      let img;
      try {
        img = await pdfDoc.embedJpg(imgBytes);
      } catch (jpgError) {
        // Try PNG if JPG fails
        try {
          img = await pdfDoc.embedPng(imgBytes);
        } catch (pngError) {
          statusDiv.textContent = 'Error: Unsupported image format.';
          return;
        }
      }
      
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
        quality -= 0.1;
        width *= 0.9;
        height *= 0.9;
      } else if (pdfSizeKB < minKB) {
        quality = Math.min(quality + 0.05, 1.0);
        width *= 1.05;
        height *= 1.05;
      }
      
      // Ensure quality does not go below 0.1
      if (quality < 0.1) quality = 0.1;
      attempts++;
      
      statusDiv.textContent = `Processing... (${attempts}/15) Current size: ${pdfSizeKB} KB`;
    }
    
    // Only enable download if strictly in range
    statusDiv.textContent = `Could not fit PDF strictly in range (${minKB} KB - ${maxKB} KB). Final size: ${pdfSizeKB} KB.`;
    downloadBtn.disabled = true;
    
  } catch (error) {
    console.error('PDF processing error:', error);
    statusDiv.textContent = 'Error processing image. Please try again.';
    downloadBtn.disabled = true;
  }
}

// Download PDF
downloadBtn.onclick = () => {
  if (!pdfBlob) {
    statusDiv.textContent = 'Error: No PDF available for download.';
    return;
  }
  
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pdfBlob);
    // Use user input for file name, fallback to default
    const name = fileNameInput.value.trim() || 'camera-image';
    // Sanitize filename - remove invalid characters
    const sanitizedName = name.replace(/[<>:"/\\|?*]/g, '');
    a.download = `${sanitizedName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the blob URL
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    
    statusDiv.textContent = 'PDF downloaded successfully!';
  } catch (error) {
    console.error('Download error:', error);
    statusDiv.textContent = 'Error downloading PDF. Please try again.';
  }
}


// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('Service Worker Registered successfully:', registration.scope);
      })
      .catch((err) => {
        console.error('SW registration failed:', err);
      });
  });
}
