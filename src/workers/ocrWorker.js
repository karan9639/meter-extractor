/**
 * OCR Web Worker for Tesseract processing
 * Runs OCR in background thread to keep UI responsive
 */
import { createWorker } from "tesseract.js"

let worker = null
let isInitialized = false

// Initialize Tesseract worker
async function initializeWorker() {
  if (isInitialized) return worker

  try {
    worker = await createWorker("eng", 1, {
      logger: (m) => {
        self.postMessage({
          type: "progress",
          progress: Math.round(m.progress * 100),
          status: m.status,
        })
      },
    })

    // Restrict recognition to numeric characters
    await worker.setParameters({
      // Only allow digits and a single decimal point
      tessedit_char_whitelist: "0123456789.",
      // Treat image as a single line of text which matches meter displays
      tessedit_pageseg_mode: "7",
      tessedit_ocr_engine_mode: "1", // LSTM only
      preserve_interword_spaces: "0",
    })

    isInitialized = true
    return worker
  } catch (error) {
    self.postMessage({
      type: "error",
      error: `Worker initialization failed: ${error.message}`,
    })
    throw error
  }
}

// Process image with OCR
async function processImage(imageData, options = {}) {
  try {
    const ocrWorker = await initializeWorker()

    self.postMessage({
      type: "progress",
      progress: 10,
      status: "Starting OCR...",
    })

    const { data } = await ocrWorker.recognize(imageData, {
      rectangle: options.roi || undefined,
    })

    self.postMessage({
      type: "progress",
      progress: 90,
      status: "Processing results...",
    })

    // Extract per-digit bounding boxes and confidence
    const symbols = data.symbols || []
    const perDigit = symbols
      .filter((sym) => /[0-9.]/.test(sym.text))
      .map((sym) => ({
        char: sym.text,
        confidence: sym.confidence / 100,
        bbox: sym.bbox,
      }))

    return {
      rawText: data.text,
      confidence: data.confidence / 100,
      perDigit,
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      error: `OCR processing failed: ${error.message}`,
    })
    throw error
  }
}

// Handle messages from main thread
self.addEventListener("message", async (event) => {
  const { type, imageData, options, id } = event.data

  try {
    switch (type) {
      case "recognize":
        const result = await processImage(imageData, options)
        self.postMessage({
          type: "result",
          id,
          result,
        })
        break

      case "terminate":
        if (worker) {
          await worker.terminate()
          worker = null
          isInitialized = false
        }
        self.postMessage({ type: "terminated" })
        break

      default:
        self.postMessage({
          type: "error",
          error: `Unknown message type: ${type}`,
        })
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      error: error.message,
    })
  }
})
