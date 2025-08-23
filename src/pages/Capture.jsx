"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScanStore } from "../state/scanStore.jsx";
import { useOcr } from "../hooks/useOcr.js";
import { extractFR1 } from "../lib/extract.js";
import { preprocessImage } from "../lib/image.js";
import CameraView from "../components/CameraView.jsx";
import Toolbar from "../components/Toolbar.jsx";

export default function Capture() {
  const navigate = useNavigate();
  const { state, dispatch } = useScanStore();
  const { recognize, isProcessing, progress } = useOcr();
  const [showTest, setShowTest] = useState(false);

  const processImage = async (imageSource) => {
    try {
      dispatch({ type: "SET_PROCESSING", payload: true });

      let canvas;
      let previewDataUrl;

      if (imageSource instanceof HTMLVideoElement) {
        // Process video frame
        canvas = preprocessImage(imageSource);
        previewDataUrl = canvas.toDataURL("image/jpeg", 0.8);
      } else if (imageSource instanceof File) {
        // Process uploaded file
        const img = new Image();
        img.crossOrigin = "anonymous";

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = URL.createObjectURL(imageSource);
        });

        canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        previewDataUrl = canvas.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(img.src);
      }

      // Run OCR
      const { text, confidence } = await recognize(canvas);

      console.log("[v0] OCR extracted text:", text);
      console.log("[v0] OCR confidence:", confidence);

      // Extract FR1 value
      const extracted = extractFR1(text);

      if (!extracted) {
        throw new Error(
          `Could not find FR1 value in the image. OCR detected: "${text}". Please ensure the meter display is clearly visible and try again.`
        );
      }

      // Add scan to store
      dispatch({
        type: "ADD_SCAN",
        payload: {
          raw: extracted.raw,
          normalized: extracted.normalized,
          ocrText: text,
          previewDataUrl,
        },
      });

      // Navigate to result
      navigate("/result");
    } catch (error) {
      console.error("Processing failed:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
    }
  };

  const handleTestSubmit = async (testText) => {
    try {
      const extracted = extractFR1(testText);

      if (!extracted) {
        throw new Error("Could not find FR1 value in test text.");
      }

      dispatch({
        type: "ADD_SCAN",
        payload: {
          raw: extracted.raw,
          normalized: extracted.normalized,
          ocrText: testText,
          previewDataUrl: null,
        },
      });

      navigate("/result");
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message });
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Meter Extractor
          </h1>
          <p className="text-gray-600">
            Capture or upload a flow meter reading
          </p>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="card mb-6 text-center">
            <div className="text-blue-600 mb-2">
              <svg
                className="w-8 h-8 mx-auto animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <p className="font-semibold">Recognizing text...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{progress}%</p>
          </div>
        )}

        {/* Error Display */}
        {state.error && (
          <div className="card mb-6 border-red-200 bg-red-50">
            <div className="text-red-600 mb-2">
              <svg
                className="w-6 h-6 inline mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-semibold">Error</span>
            </div>
            <p className="text-red-700 text-sm">{state.error}</p>
            <button
              onClick={() => dispatch({ type: "CLEAR_ERROR" })}
              className="mt-2 text-red-600 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Camera View */}
        <div className="mb-6">
          <CameraView onCapture={processImage} disabled={state.isProcessing} />
        </div>

        {/* Toolbar */}
        <Toolbar
          onFileUpload={processImage}
          disabled={state.isProcessing}
          testMode={showTest}
          onTestSubmit={handleTestSubmit}
        />

        {/* Toggle Test Mode */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowTest(!showTest)}
            className="text-blue-600 text-sm underline"
          >
            {showTest ? "Hide" : "Show"} Test Mode
          </button>
        </div>

        {/* Recent Scans */}
        {state.scans.length > 0 && (
          <div className="card mt-6">
            <h3 className="font-semibold mb-3">Recent Scans</h3>
            <div className="space-y-2">
              {state.scans.slice(0, 3).map((scan) => (
                <div
                  key={scan.id}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <div>
                    <span className="font-mono text-sm">
                      {scan.normalized} m³/hr
                    </span>
                    <div className="text-xs text-gray-500">
                      {new Date(scan.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      dispatch({ type: "ADD_SCAN", payload: scan });
                      navigate("/result");
                    }}
                    className="text-blue-600 text-sm"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
