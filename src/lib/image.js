// Image preprocessing utilities for better OCR results

export function drawVideoToCanvas(video, options = {}) {
  const { cropBandPct = 0.35 } = options;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Handle orientation - rotate if video is portrait
  const isPortrait = video.videoWidth < video.videoHeight;

  if (isPortrait) {
    canvas.width = video.videoHeight;
    canvas.height = video.videoWidth;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-video.videoWidth / 2, -video.videoHeight / 2);
  } else {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  // Draw the video frame
  ctx.drawImage(video, 0, 0);

  // Crop to horizontal band around LCD area
  const cropHeight = canvas.height * cropBandPct;
  const cropY = (canvas.height - cropHeight) / 2;

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");
  croppedCanvas.width = canvas.width;
  croppedCanvas.height = cropHeight;

  const imageData = ctx.getImageData(0, cropY, canvas.width, cropHeight);
  croppedCtx.putImageData(imageData, 0, 0);

  return croppedCanvas;
}

export function toGrayscale(ctx) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray; // red
    data[i + 1] = gray; // green
    data[i + 2] = gray; // blue
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyThreshold(ctx, level = 0.5) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;
  const threshold = level * 255;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]; // Already grayscale
    const binary = gray > threshold ? 255 : 0;
    data[i] = binary; // red
    data[i + 1] = binary; // green
    data[i + 2] = binary; // blue
  }

  ctx.putImageData(imageData, 0, 0);
}

export function resizeCanvas(canvas, targetWidth) {
  if (canvas.width <= targetWidth) return canvas;

  const ratio = targetWidth / canvas.width;
  const targetHeight = canvas.height * ratio;

  const resizedCanvas = document.createElement("canvas");
  const ctx = resizedCanvas.getContext("2d");

  resizedCanvas.width = targetWidth;
  resizedCanvas.height = targetHeight;

  ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  return resizedCanvas;
}

export function enhanceLCDDisplay(ctx) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // More aggressive green LCD detection
    const isGreenText =
      (g > 120 && g > r * 1.5 && g > b * 1.5) || (g > 80 && r < 100 && b < 100);

    if (isGreenText) {
      // Make LCD text white
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    } else {
      // Make background black
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function enhanceContrast(ctx, factor = 2.0) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));
    data[i + 1] = Math.min(
      255,
      Math.max(0, (data[i + 1] - 128) * factor + 128)
    );
    data[i + 2] = Math.min(
      255,
      Math.max(0, (data[i + 2] - 128) * factor + 128)
    );
  }

  ctx.putImageData(imageData, 0, 0);
}

export function dilateText(ctx) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const newData = new Uint8ClampedArray(data);

  // Dilate white pixels (text)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      if (data[idx] > 128) {
        // If current pixel is white
        // Make surrounding pixels white too
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            newData[nIdx] = 255;
            newData[nIdx + 1] = 255;
            newData[nIdx + 2] = 255;
          }
        }
      }
    }
  }

  const newImageData = new ImageData(newData, width, height);
  ctx.putImageData(newImageData, 0, 0);
}

export function reduceNoise(ctx) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  // Simple median filter for noise reduction
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Get surrounding pixels
      const neighbors = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push(data[nIdx]);
        }
      }

      // Use median value
      neighbors.sort((a, b) => a - b);
      const median = neighbors[Math.floor(neighbors.length / 2)];

      data[idx] = median; // red
      data[idx + 1] = median; // green
      data[idx + 2] = median; // blue
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function preprocessImage(video) {
  // Step 1: Draw video to canvas and crop to LCD area
  let canvas = drawVideoToCanvas(video, { cropBandPct: 0.5 });

  // Step 2: Resize for optimal OCR performance
  canvas = resizeCanvas(canvas, 3000);

  const ctx = canvas.getContext("2d");

  // Step 3: Enhance LCD display specifically
  enhanceLCDDisplay(ctx);

  // Step 4: Enhance contrast after LCD processing
  enhanceContrast(ctx, 2.5);

  // Step 5: Dilate text to make it thicker
  dilateText(ctx);
  dilateText(ctx);

  // Step 6: Reduce noise
  reduceNoise(ctx);

  // Step 7: Lower threshold to preserve more text detail
  applyThreshold(ctx, 0.3);

  console.log("[v0] Processed image size:", canvas.width, "x", canvas.height);

  // Step 8: Add debug canvas to see processed image
  if (typeof window !== "undefined") {
    const debugCanvas = document.createElement("canvas");
    debugCanvas.width = canvas.width;
    debugCanvas.height = canvas.height;
    const debugCtx = debugCanvas.getContext("2d");
    debugCtx.drawImage(canvas, 0, 0);
    console.log("[v0] Processed image data URL:", debugCanvas.toDataURL());
  }

  return canvas;
}
