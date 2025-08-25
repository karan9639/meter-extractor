"use client";

import { useState } from "react";

export function useOcr() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Advanced text filtering with multiple criteria
  const filterText = (text, filters = {}) => {
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
      lineFilters = {
        containsEmail: false,
        containsPhone: false,
        containsUrl: false,
        containsDate: false,
        containsPrice: false,
      },
    } = filters;

    let lines = text
      .split(/[\n\r]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const originalCount = lines.length;
    const results = {
      allText: text,
      filteredText: "",
      matchedLines: [],
      rejectedLines: [],
      totalLines: originalCount,
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

    // Apply length filters
    lines = lines.filter((line) => {
      const passes = line.length >= minLength && line.length <= maxLength;
      if (!passes)
        results.rejectedLines.push({ line, reason: "Length filter" });
      return passes;
    });

    // Apply character type filters
    if (!includeNumbers) {
      lines = lines.filter((line) => {
        const passes = !/\d/.test(line);
        if (!passes)
          results.rejectedLines.push({ line, reason: "Contains numbers" });
        return passes;
      });
    }
    if (!includeLetters) {
      lines = lines.filter((line) => {
        const passes = !/[a-zA-Z]/.test(line);
        if (!passes)
          results.rejectedLines.push({ line, reason: "Contains letters" });
        return passes;
      });
    }
    if (!includeSymbols) {
      lines = lines.filter((line) => {
        const passes = !/[^a-zA-Z0-9\s]/.test(line);
        if (!passes)
          results.rejectedLines.push({ line, reason: "Contains symbols" });
        return passes;
      });
    }

    // Apply exclude keyword filters
    if (excludeKeywords.length > 0) {
      lines = lines.filter((line) => {
        const searchText = caseSensitive ? line : line.toLowerCase();
        const searchExcludeKeywords = caseSensitive
          ? excludeKeywords
          : excludeKeywords.map((k) => k.toLowerCase());
        const passes = !searchExcludeKeywords.some((keyword) =>
          exactMatch ? searchText === keyword : searchText.includes(keyword)
        );
        if (!passes)
          results.rejectedLines.push({ line, reason: "Excluded keyword" });
        return passes;
      });
    }

    // Apply keyword filters
    if (keywords.length > 0) {
      lines = lines.filter((line) => {
        const searchText = caseSensitive ? line : line.toLowerCase();
        const searchKeywords = caseSensitive
          ? keywords
          : keywords.map((k) => k.toLowerCase());
        const passes = searchKeywords.some((keyword) =>
          exactMatch ? searchText === keyword : searchText.includes(keyword)
        );
        if (!passes)
          results.rejectedLines.push({ line, reason: "Keyword filter" });
        return passes;
      });
    }

    // Apply pattern filters (regex)
    if (patterns.length > 0) {
      lines = lines.filter((line) => {
        const passes = patterns.some((pattern) => {
          try {
            const regex = new RegExp(pattern, caseSensitive ? "g" : "gi");
            return regex.test(line);
          } catch (e) {
            console.warn("[v0] Invalid regex pattern:", pattern);
            return false;
          }
        });
        if (!passes)
          results.rejectedLines.push({ line, reason: "Pattern filter" });
        return passes;
      });
    }

    // Pre-compile regexes used in lineFilters/categorization
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

    // Supports Indian 10-digit (optionally +91) and common US formats
    const phoneRegex =
      /(?:\+?91[-.\s]?)?[6-9](?:\d[-.\s]?){9}|(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]*)\d{3}[-.\s]?\d{4}/g;

    const urlRegex =
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[A-Za-z0-9()]{1,6}\b([-A-Za-z0-9()@:%_+.~#?&//=]*)/g;

    const dateRegex =
      /\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2})\b/g;

    // INR ₹ plus common currencies
    const priceRegex =
      /(?:₹\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\$\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:INR|USD|EUR|GBP|rupees?|dollars?|euros?|pounds?))/gi;

    const numberRegex = /\b\d+(?:\.\d+)?\b/g;

    // Apply specialized line filters and categorize (without early returns)
    lines.forEach((line) => {
      const emails = line.match(emailRegex);
      if (emails) results.categories.emails.push(...emails);

      const phones = line.match(phoneRegex);
      if (phones) results.categories.phones.push(...phones);

      const urls = line.match(urlRegex);
      if (urls) results.categories.urls.push(...urls);

      const dates = line.match(dateRegex);
      if (dates) results.categories.dates.push(...dates);

      const prices = line.match(priceRegex);
      if (prices) results.categories.prices.push(...prices);

      const numbers = line.match(numberRegex);
      if (numbers) results.categories.numbers.push(...numbers);

      // Decide inclusion based on selected flags
      const wantsSomeFilter =
        lineFilters &&
        (lineFilters.containsEmail ||
          lineFilters.containsPhone ||
          lineFilters.containsUrl ||
          lineFilters.containsDate ||
          lineFilters.containsPrice);

      let include = !wantsSomeFilter; // if no filter selected, include by default
      if (wantsSomeFilter) {
        include =
          (lineFilters.containsEmail && !!emails) ||
          (lineFilters.containsPhone && !!phones) ||
          (lineFilters.containsUrl && !!urls) ||
          (lineFilters.containsDate && !!dates) ||
          (lineFilters.containsPrice && !!prices);
      }

      if (include) {
        results.matchedLines.push(line);
      } else {
        results.rejectedLines.push({ line, reason: "Line filter mismatch" });
      }
    });

    results.filteredText = results.matchedLines.join("\n");
    results.matchCount = results.matchedLines.length;

    return results;
  };

  // Enhanced image preprocessing for better text recognition
  const preprocessImage = async (imageInput) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        try {
          // Scale up for better recognition
          const scale = 3;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Get image data for processing
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          // Multi-strategy preprocessing
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = (r + g + b) / 3;

            // Enhanced contrast and brightness
            let newR, newG, newB;

            // Detect LCD/LED displays (green/blue dominant)
            if ((g > r && g > b && g > 100) || (b > r && b > g && b > 100)) {
              // High contrast for display text
              newR = newG = newB = gray > 128 ? 255 : 0;
            } else {
              // Standard text enhancement
              const contrast = 1.5;
              const brightness = 20;
              newR = Math.min(
                255,
                Math.max(0, (r - 128) * contrast + 128 + brightness)
              );
              newG = Math.min(
                255,
                Math.max(0, (g - 128) * contrast + 128 + brightness)
              );
              newB = Math.min(
                255,
                Math.max(0, (b - 128) * contrast + 128 + brightness)
              );
            }

            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (error) {
          console.error("[v0] Preprocessing error:", error);
          reject(error);
        }
      };

      img.onerror = () => reject(new Error("Failed to load image"));

      if (typeof imageInput === "string") {
        img.src = imageInput;
      } else if (imageInput instanceof File || imageInput instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(imageInput);
      } else if (imageInput instanceof HTMLCanvasElement) {
        img.src = imageInput.toDataURL("image/png");
      } else if (imageInput instanceof HTMLImageElement) {
        img.src = imageInput.src;
      } else if (imageInput && imageInput.src) {
        // Handle objects with src property
        img.src = imageInput.src;
      } else {
        console.error(
          "[v0] Unsupported image data type:",
          typeof imageInput,
          imageInput
        );
        reject(new Error(`Unsupported image data type: ${typeof imageInput}`));
      }
    });
  };

  // Mock OCR function that simulates text extraction
  const mockOCR = async () => {
    const sampleTexts = [
      "FR1:041.09 m3/Hr\nT1: 9598701.0 m3",
      "Sample text from image\nLine 2 with numbers: 123.45\nEmail: test@example.com\nPhone: (555) 123-4567",
      "Invoice #12345\nDate: 01/15/2024\nAmount: $299.99\nCustomer: John Doe",
      "Address: 123 Main St\nCity, State 12345\nWebsite: https://example.com",
    ];
    return {
      text: sampleTexts[0],
      confidence: 85,
    };
  };

  const recognize = async (imageData, filterOptions = {}) => {
    try {
      setIsProcessing(true);
      setProgress(20);

      console.log("[v0] Starting comprehensive text extraction");

      // Preprocess image
      const processedImage = await preprocessImage(imageData);
      setProgress(40);

      // For now, use mock OCR - in production, call a real OCR service here
      const ocrResult = await mockOCR();
      setProgress(70);

      console.log("[v0] OCR result:", {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
      });

      // Apply comprehensive text filtering
      const filteredResult = filterText(ocrResult.text, filterOptions);
      setProgress(100);

      return {
        ...ocrResult,
        ...filteredResult,
        processedImage,
      };
    } catch (error) {
      console.error("[v0] Text extraction failed:", error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return {
    recognize,
    filterText,
    isProcessing,
    progress,
  };
}
