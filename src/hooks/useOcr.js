"use client";

import { useState } from "react";

// Simple utility to filter text lines according to user-defined options
function filterTextInternal(text, filters = {}) {
  const {
    keywords = [],
    patterns = [],
    includeNumbers = true,
    includeLetters = true,
    includeSymbols = true,
    minLength = 0,
    maxLength = Number.POSITIVE_INFINITY,
    caseSensitive = false,
    exactMatch = false,
    excludeKeywords = [],
    lineFilters = {},
  } = filters;

  let lines = text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const results = {
    allText: text,
    filteredText: "",
    matchedLines: [],
    rejectedLines: [],
    totalLines: lines.length,
    matchCount: 0,
    categories: {
      emails: [],
      phones: [],
      urls: [],
      dates: [],
      prices: [],
      numbers: [],
      addresses: [],
    },
  };

  const kw = keywords.map((k) => (caseSensitive ? k : k.toLowerCase()));
  const exKw = excludeKeywords.map((k) => (caseSensitive ? k : k.toLowerCase()));

  for (const line of lines) {
    const cmp = caseSensitive ? line : line.toLowerCase();
    if (line.length < minLength || line.length > maxLength) {
      results.rejectedLines.push({ line, reason: "Length filter" });
      continue;
    }
    if (!includeNumbers && /\d/.test(line)) {
      results.rejectedLines.push({ line, reason: "Contains numbers" });
      continue;
    }
    if (!includeLetters && /[a-zA-Z]/.test(line)) {
      results.rejectedLines.push({ line, reason: "Contains letters" });
      continue;
    }
    if (!includeSymbols && /[^a-zA-Z0-9\s]/.test(line)) {
      results.rejectedLines.push({ line, reason: "Contains symbols" });
      continue;
    }
    if (exKw.some((k) => (exactMatch ? cmp === k : cmp.includes(k)))) {
      results.rejectedLines.push({ line, reason: "Excluded keyword" });
      continue;
    }
    if (kw.length && !kw.some((k) => (exactMatch ? cmp === k : cmp.includes(k)))) {
      results.rejectedLines.push({ line, reason: "Keyword filter" });
      continue;
    }
    if (patterns.length && !patterns.some((p) => new RegExp(p, caseSensitive ? "" : "i").test(line))) {
      results.rejectedLines.push({ line, reason: "Pattern filter" });
      continue;
    }
    // Simple line-level filters
    const lf = lineFilters || {};
    if (lf.containsEmail && !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(line)) {
      results.rejectedLines.push({ line, reason: "Line filter mismatch" });
      continue;
    }
    if (lf.containsPhone && !/\d{3,}/.test(line)) {
      results.rejectedLines.push({ line, reason: "Line filter mismatch" });
      continue;
    }
    if (lf.containsUrl && !/https?:\/\//i.test(line)) {
      results.rejectedLines.push({ line, reason: "Line filter mismatch" });
      continue;
    }
    if (lf.containsDate && !/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) {
      results.rejectedLines.push({ line, reason: "Line filter mismatch" });
      continue;
    }
    if (lf.containsPrice && !/\$\s*\d+/.test(line)) {
      results.rejectedLines.push({ line, reason: "Line filter mismatch" });
      continue;
    }

    results.matchedLines.push(line);
  }

  results.filteredText = results.matchedLines.join("\n");
  results.matchCount = results.matchedLines.length;

  // Populate simple categories
  for (const line of results.matchedLines) {
    const emails = line.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi);
    if (emails) results.categories.emails.push(...emails);
    const phones = line.match(/\+?\d[\d\s\-()]{5,}\d/g);
    if (phones) results.categories.phones.push(...phones);
    const urls = line.match(/https?:\/\/[^\s]+/gi);
    if (urls) results.categories.urls.push(...urls);
    const prices = line.match(/\$\s*\d+(?:\.\d+)?/g);
    if (prices) results.categories.prices.push(...prices);
    const numbers = line.match(/\b\d+(?:\.\d+)?\b/g);
    if (numbers) results.categories.numbers.push(...numbers);
  }

  return results;
}

export function useOcr() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const filterText = (text, filters = {}) => filterTextInternal(text, filters);

  const assessQuality = (canvas) => {
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const { data } = ctx.getImageData(0, 0, width, height);
    let brightness = 0;
    let glarePixels = 0;
    let sharpness = 0;
    const totalPixels = width * height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        brightness += gray;
        if (gray > 240) glarePixels++;
        if (x < width - 1) {
          const idx2 = (y * width + (x + 1)) * 4;
          const r2 = data[idx2];
          const g2 = data[idx2 + 1];
          const b2 = data[idx2 + 2];
          const gray2 = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
          sharpness += Math.abs(gray - gray2);
        }
      }
    }

    brightness = brightness / (totalPixels * 255);
    const glare = glarePixels / totalPixels;
    sharpness = sharpness / (totalPixels * 255);
    return { brightness, glare, sharpness, motion: 0 };
  };

  const recognize = async (canvas, filterOptions = {}) => {
    try {
      setIsProcessing(true);
      setProgress(10);

      const quality = assessQuality(canvas);
      if (quality.sharpness < 0.1) {
        throw new Error("Image is too blurry. Hold your phone steady and refocus.");
      }
      if (quality.brightness < 0.2) {
        throw new Error("Image is too dark. Increase lighting or move closer.");
      }
      if (quality.glare > 0.4) {
        throw new Error("Excessive glare detected. Change the angle to avoid reflections.");
      }

      const imageData = canvas.toDataURL("image/png");

      const worker = new Worker(new URL("../workers/ocrWorker.js", import.meta.url), {
        type: "module",
      });

      const id = Date.now();
      const ocrPromise = new Promise((resolve, reject) => {
        const handleMessage = (e) => {
          const msg = e.data;
          if (msg.type === "progress") {
            setProgress(msg.progress);
          } else if (msg.type === "result" && msg.id === id) {
            worker.removeEventListener("message", handleMessage);
            resolve(msg.result);
          } else if (msg.type === "error") {
            worker.removeEventListener("message", handleMessage);
            reject(new Error(msg.error));
          }
        };
        worker.addEventListener("message", handleMessage);
        worker.postMessage({ type: "recognize", imageData, options: {}, id });
      });

      const result = await ocrPromise;
      worker.postMessage({ type: "terminate" });

      const perDigit = result.perDigit || [];
      let reading = perDigit.map((d) => d.char).join("");
      // Collapse multiple decimals to one
      const firstDecimal = reading.indexOf(".");
      if (firstDecimal !== -1) {
        reading =
          reading.slice(0, firstDecimal + 1) +
          reading.slice(firstDecimal + 1).replace(/\./g, "");
      }
      reading = reading.replace(/[^0-9.]/g, "");
      if (!/^\d+(?:\.\d+)?$/.test(reading)) {
        reading = "";
      }
      const decimalPlaces = reading.includes(".")
        ? reading.split(".")[1].length
        : 0;
      const overallConf =
        perDigit.length > 0
          ? perDigit.reduce((s, d) => s + d.confidence, 0) / perDigit.length
          : 0;

      const roiBox = perDigit.reduce(
        (acc, d) => ({
          x0: Math.min(acc.x0, d.bbox.x0),
          y0: Math.min(acc.y0, d.bbox.y0),
          x1: Math.max(acc.x1, d.bbox.x1),
          y1: Math.max(acc.y1, d.bbox.y1),
        }),
        { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
      );
      const finalRoi = perDigit.length ? roiBox : null;

      const filteredResult = filterTextInternal(result.rawText || "", filterOptions);

      return {
        rawText: result.rawText || "",
        reading,
        decimalPlaces,
        confidence: overallConf,
        perDigit,
        roiBox: finalRoi,
        quality,
        ...filteredResult,
        framesUsed: 1,
        timestamp: new Date().toISOString(),
        deviceId: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      };
    } catch (error) {
      console.error("[v0] Text extraction failed:", error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return { recognize, filterText, isProcessing, progress };
}

export { filterTextInternal as filterText };
