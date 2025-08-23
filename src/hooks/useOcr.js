"use client";

import { useState, useRef } from "react";
import { createWorker } from "tesseract.js";

export function useOcr() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const workerRef = useRef(null);

  const initWorker = async () => {
    if (workerRef.current) return workerRef.current;

    const worker = await createWorker();
    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng", 1); // Use LSTM engine mode during initialization

    await worker.setParameters({
      tessedit_char_whitelist: "0123456789.:FRm3Hr/ ",
      tessedit_pageseg_mode: "8", // Single word mode for better LCD recognition
      tessedit_ocr_engine_mode: "1", // LSTM only
      classify_bln_numeric_mode: "1", // Better number recognition
      textord_really_old_xheight: "1", // Better for uniform text height
      textord_min_xheight: "10", // Minimum character height
      preserve_interword_spaces: "1", // Keep spaces
    });

    workerRef.current = worker;
    return worker;
  };

  const tryMultipleStrategies = async (imageData) => {
    const strategies = [
      { name: "LCD Optimized", preprocess: "lcdOptimized" },
      { name: "High Contrast", preprocess: "highContrast" },
      { name: "Original", preprocess: "original" },
      { name: "Inverted", preprocess: "inverted" },
    ];

    let bestResult = { text: "", confidence: 0 };

    for (const strategy of strategies) {
      try {
        console.log(`[v0] Trying OCR strategy: ${strategy.name}`);

        let processedImage = imageData;
        if (strategy.preprocess !== "original") {
          processedImage = await preprocessImage(
            imageData,
            strategy.preprocess
          );
        }

        const worker = await initWorker();
        const { data } = await worker.recognize(processedImage);

        console.log(`[v0] ${strategy.name} result:`, {
          text: data.text.trim(),
          confidence: data.confidence,
        });

        if (data.confidence > bestResult.confidence) {
          bestResult = {
            text: data.text,
            confidence: data.confidence,
            strategy: strategy.name,
          };
        }

        // If we get good confidence, use it
        if (data.confidence > 70) {
          console.log(
            `[v0] Using ${strategy.name} strategy (confidence: ${data.confidence})`
          );
          break;
        }
      } catch (error) {
        console.warn(`[v0] Strategy ${strategy.name} failed:`, error);
      }
    }

    return bestResult;
  };

  const preprocessImage = async (imageData, strategy) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width * 2; // Scale up for better OCR
        canvas.height = img.height * 2;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        switch (strategy) {
          case "lcdOptimized":
            // Enhanced green LCD text extraction
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              // Detect green LCD text (high green, low red/blue)
              if (g > 100 && g > r * 1.5 && g > b * 1.5) {
                // Convert to white
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
              } else {
                // Convert to black
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
              }
            }
            break;

          case "highContrast":
            // High contrast black and white
            for (let i = 0; i < data.length; i += 4) {
              const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
              const value = gray > 128 ? 255 : 0;
              data[i] = value;
              data[i + 1] = value;
              data[i + 2] = value;
            }
            break;

          case "inverted":
            // Invert colors
            for (let i = 0; i < data.length; i += 4) {
              data[i] = 255 - data[i];
              data[i + 1] = 255 - data[i + 1];
              data[i + 2] = 255 - data[i + 2];
            }
            break;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };

      img.src =
        typeof imageData === "string"
          ? imageData
          : URL.createObjectURL(imageData);
    });
  };

  const recognize = async (imageData) => {
    try {
      setIsProcessing(true);
      setProgress(0);

      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90));
      }, 300);

      const result = await tryMultipleStrategies(imageData);

      clearInterval(progressInterval);
      setProgress(100);

      console.log("[v0] Best OCR result:", result);

      return {
        text: result.text,
        confidence: result.confidence,
        strategy: result.strategy,
      };
    } catch (error) {
      console.error("OCR failed:", error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const cleanup = async () => {
    if (workerRef.current) {
      await workerRef.current.terminate();
      workerRef.current = null;
    }
  };

  return {
    recognize,
    isProcessing,
    progress,
    cleanup,
  };
}
