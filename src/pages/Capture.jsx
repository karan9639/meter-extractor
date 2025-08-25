"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useScanStore } from "../state/scanStore.jsx"
import { useOcr } from "../hooks/useOcr.js"
import { extractFR1 } from "../lib/extract.js"
import { preprocessImage } from "../lib/image.js"
import CameraView from "../components/CameraView.jsx"
import Toolbar from "../components/Toolbar.jsx"
import TextExtractionPanel from "../components/TextExtractionPanel.jsx"

export default function Capture() {
  const navigate = useNavigate()
  const { state, dispatch } = useScanStore()
  const { recognize, filterText, isProcessing, progress } = useOcr()
  const [showTest, setShowTest] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [extractionMode, setExtractionMode] = useState("meter") // "meter" or "comprehensive"
  const [extractedData, setExtractedData] = useState(null)
  const [filterOptions, setFilterOptions] = useState({
    keywords: ["FR1", "m3/Hr", "M3/Hr"],
    patterns: ["FR1.*?m3/Hr", "\\d+\\.\\d+"],
    includeNumbers: true,
    includeLetters: true,
    minLength: 3,
    maxLength: 50,
    caseSensitive: false,
  })

  const processImage = async (imageSource) => {
    try {
      dispatch({ type: "SET_PROCESSING", payload: true })

      let canvas
      let previewDataUrl

      if (imageSource instanceof HTMLVideoElement) {
        // Process video frame
        canvas = preprocessImage(imageSource)
        previewDataUrl = canvas.toDataURL("image/jpeg", 0.8)
      } else if (imageSource instanceof File) {
        // Process uploaded file
        const img = new Image()
        img.crossOrigin = "anonymous"

        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = URL.createObjectURL(imageSource)
        })

        canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        previewDataUrl = canvas.toDataURL("image/jpeg", 0.8)
        URL.revokeObjectURL(img.src)
      }

      const ocrResult = await recognize(canvas, extractionMode === "comprehensive" ? filterOptions : {})

      console.log("[v0] OCR extracted text:", ocrResult.text)
      console.log("[v0] OCR confidence:", ocrResult.confidence)

      if (extractionMode === "comprehensive") {
        // Store comprehensive extraction results
        setExtractedData(ocrResult)
        return
      }

      // Original meter-specific processing
      const { text, filteredText, matchedLines, totalLines, confidence } = ocrResult

      // Extract FR1 value from filtered text first, fallback to original
      const extracted = extractFR1(filteredText) || extractFR1(text)

      if (!extracted) {
        throw new Error(
          `Could not find FR1 value in the image. OCR detected: "${text}". Filtered: "${filteredText}". Please ensure the meter display is clearly visible and try again.`,
        )
      }

      // Add scan to store with filtering info
      dispatch({
        type: "ADD_SCAN",
        payload: {
          raw: extracted.raw,
          normalized: extracted.normalized,
          ocrText: text,
          filteredText,
          matchedLines: matchedLines?.length || 0,
          totalLines,
          previewDataUrl,
        },
      })

      // Navigate to result
      navigate("/result")
    } catch (error) {
      console.error("Processing failed:", error)
      dispatch({ type: "SET_ERROR", payload: error.message })
    }
  }

  const updateFilterOption = (key, value) => {
    setFilterOptions((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleFilterChange = (newFilters) => {
    setFilterOptions(newFilters)
    if (extractedData) {
      // Re-apply filters to existing data
      const filteredResult = filterText(extractedData.allText, newFilters)
      setExtractedData({
        ...extractedData,
        ...filteredResult,
      })
    }
  }

  const handleTestSubmit = async (testText) => {
    try {
      const extracted = extractFR1(testText)

      if (!extracted) {
        throw new Error("Could not find FR1 value in test text.")
      }

      dispatch({
        type: "ADD_SCAN",
        payload: {
          raw: extracted.raw,
          normalized: extracted.normalized,
          ocrText: testText,
          previewDataUrl: null,
        },
      })

      navigate("/result")
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message })
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {extractionMode === "comprehensive" ? "Text Extractor" : "Meter Extractor"}
          </h1>
          <p className="text-gray-600">
            {extractionMode === "comprehensive"
              ? "Extract and filter all text from images"
              : "Capture or upload a flow meter reading"}
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => {
                setExtractionMode("meter")
                setExtractedData(null)
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                extractionMode === "meter" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Meter Reading
            </button>
            <button
              onClick={() => {
                setExtractionMode("comprehensive")
                setExtractedData(null)
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                extractionMode === "comprehensive"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All Text
            </button>
          </div>
        </div>

        <div className={`grid gap-6 ${extractionMode === "comprehensive" ? "lg:grid-cols-2" : ""}`}>
          <div>
            {/* Processing Status */}
            {isProcessing && (
              <div className="card mb-6 text-center">
                <div className="text-blue-600 mb-2">
                  <svg className="w-8 h-8 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <p className="font-semibold">
                  {extractionMode === "comprehensive" ? "Extracting all text..." : "Recognizing text..."}
                </p>
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
                  <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {showFilters && extractionMode === "meter" && (
              <div className="card mb-6">
                <h3 className="font-semibold mb-3">OCR Filter Settings</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Keywords (comma-separated)</label>
                    <input
                      type="text"
                      value={filterOptions.keywords.join(", ")}
                      onChange={(e) =>
                        updateFilterOption(
                          "keywords",
                          e.target.value
                            .split(",")
                            .map((k) => k.trim())
                            .filter((k) => k),
                        )
                      }
                      className="w-full p-2 border rounded text-sm"
                      placeholder="FR1, m3/Hr, M3/Hr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Regex Patterns (comma-separated)</label>
                    <input
                      type="text"
                      value={filterOptions.patterns.join(", ")}
                      onChange={(e) =>
                        updateFilterOption(
                          "patterns",
                          e.target.value
                            .split(",")
                            .map((p) => p.trim())
                            .filter((p) => p),
                        )
                      }
                      className="w-full p-2 border rounded text-sm"
                      placeholder="FR1.*?m3/Hr, \d+\.\d+"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Min Length</label>
                      <input
                        type="number"
                        value={filterOptions.minLength}
                        onChange={(e) => updateFilterOption("minLength", Number.parseInt(e.target.value) || 0)}
                        className="w-full p-2 border rounded text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Length</label>
                      <input
                        type="number"
                        value={filterOptions.maxLength === Number.POSITIVE_INFINITY ? "" : filterOptions.maxLength}
                        onChange={(e) =>
                          updateFilterOption(
                            "maxLength",
                            e.target.value ? Number.parseInt(e.target.value) : Number.POSITIVE_INFINITY,
                          )
                        }
                        className="w-full p-2 border rounded text-sm"
                        min="1"
                        placeholder="No limit"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterOptions.includeNumbers}
                        onChange={(e) => updateFilterOption("includeNumbers", e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">Include Numbers</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterOptions.includeLetters}
                        onChange={(e) => updateFilterOption("includeLetters", e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">Include Letters</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterOptions.caseSensitive}
                        onChange={(e) => updateFilterOption("caseSensitive", e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">Case Sensitive</span>
                    </label>
                  </div>
                </div>
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
              testMode={showTest && extractionMode === "meter"}
              onTestSubmit={handleTestSubmit}
            />

            {/* Toggle Controls */}
            <div className="mt-4 text-center space-x-4">
              {extractionMode === "meter" && (
                <>
                  <button onClick={() => setShowTest(!showTest)} className="text-blue-600 text-sm underline">
                    {showTest ? "Hide" : "Show"} Test Mode
                  </button>
                  <button onClick={() => setShowFilters(!showFilters)} className="text-blue-600 text-sm underline">
                    {showFilters ? "Hide" : "Show"} OCR Filters
                  </button>
                </>
              )}
              {extractedData && (
                <button onClick={() => setExtractedData(null)} className="text-red-600 text-sm underline">
                  Clear Results
                </button>
              )}
            </div>

            {/* Recent Scans - only show in meter mode */}
            {extractionMode === "meter" && state.scans.length > 0 && (
              <div className="card mt-6">
                <h3 className="font-semibold mb-3">Recent Scans</h3>
                <div className="space-y-2">
                  {state.scans.slice(0, 3).map((scan) => (
                    <div key={scan.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-mono text-sm">{scan.normalized}</span>
                        <div className="text-xs text-gray-500">{new Date(scan.timestamp).toLocaleString()}</div>
                      </div>
                      <button
                        onClick={() => {
                          dispatch({ type: "ADD_SCAN", payload: scan })
                          navigate("/result")
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

          {extractionMode === "comprehensive" && (
            <div>
              <TextExtractionPanel extractedData={extractedData} onFilterChange={handleFilterChange} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
