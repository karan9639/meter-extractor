"use client"

/**
 * Review page showing OCR results with bounding boxes and confidence scores
 */
import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"

export default function Review() {
  const navigate = useNavigate()
  const location = useLocation()
  const { captureResult, ocrResults } = location.state || {}

  const [selectedCandidate, setSelectedCandidate] = useState(0)
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true)
  const [manualValue, setManualValue] = useState("")
  const [showManualInput, setShowManualInput] = useState(false)

  if (!captureResult || !ocrResults) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No capture data available</p>
          <button onClick={() => navigate("/")} className="btn-primary">
            Back to Capture
          </button>
        </div>
      </div>
    )
  }

  const candidates = ocrResults.candidates || [ocrResults]
  const selectedResult = candidates[selectedCandidate]

  const handleConfirm = () => {
    const finalValue = showManualInput ? manualValue : selectedResult.extractedValue

    navigate("/result", {
      state: {
        result: {
          ...selectedResult,
          extractedValue: finalValue,
          isManuallyEdited: showManualInput,
          captureData: captureResult,
        },
      },
    })
  }

  const handleRetake = () => {
    navigate("/")
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Results</h1>
          <p className="text-gray-600">Verify the extracted reading before saving</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Image with Bounding Boxes */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Captured Image</h3>
              <button
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showBoundingBoxes ? "Hide" : "Show"} Boxes
              </button>
            </div>

            <div className="relative">
              <img
                src={captureResult.dataUrl || "/placeholder.svg"}
                alt="Captured meter"
                className="w-full rounded-lg"
              />

              {/* Bounding Boxes Overlay */}
              {showBoundingBoxes && selectedResult.boundingBoxes && (
                <svg className="absolute inset-0 w-full h-full">
                  {selectedResult.boundingBoxes.map((box, index) => (
                    <g key={index}>
                      <rect
                        x={`${(box.bbox.x0 / captureResult.canvas.width) * 100}%`}
                        y={`${(box.bbox.y0 / captureResult.canvas.height) * 100}%`}
                        width={`${((box.bbox.x1 - box.bbox.x0) / captureResult.canvas.width) * 100}%`}
                        height={`${((box.bbox.y1 - box.bbox.y0) / captureResult.canvas.height) * 100}%`}
                        fill="none"
                        stroke={box.confidence > 80 ? "#10b981" : box.confidence > 60 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="2"
                        className="opacity-80"
                      />
                      <text
                        x={`${(box.bbox.x0 / captureResult.canvas.width) * 100}%`}
                        y={`${(box.bbox.y0 / captureResult.canvas.height) * 100 - 1}%`}
                        className="text-xs fill-white"
                        style={{ fontSize: "12px" }}
                      >
                        {box.text} ({box.confidence}%)
                      </text>
                    </g>
                  ))}
                </svg>
              )}

              {/* ROI Indicator */}
              {captureResult.roi && (
                <div
                  className="absolute border-2 border-blue-400 border-dashed rounded"
                  style={{
                    left: `${(captureResult.roi.x / captureResult.canvas.width) * 100}%`,
                    top: `${(captureResult.roi.y / captureResult.canvas.height) * 100}%`,
                    width: `${(captureResult.roi.width / captureResult.canvas.width) * 100}%`,
                    height: `${(captureResult.roi.height / captureResult.canvas.height) * 100}%`,
                  }}
                />
              )}
            </div>

            {/* Quality Metrics */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-700">Quality</div>
                <div
                  className={`text-lg ${captureResult.quality.score >= 80 ? "text-green-600" : captureResult.quality.score >= 60 ? "text-yellow-600" : "text-red-600"}`}
                >
                  {captureResult.quality.score}%
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-700">Sharpness</div>
                <div className="text-lg text-gray-600">{captureResult.quality.metrics.sharpness}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-700">Brightness</div>
                <div className="text-lg text-gray-600">{captureResult.quality.metrics.brightness}</div>
              </div>
            </div>
          </div>

          {/* OCR Results */}
          <div className="space-y-6">
            {/* Candidate Selection */}
            {candidates.length > 1 && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">OCR Candidates</h3>
                <div className="space-y-2">
                  {candidates.map((candidate, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedCandidate(index)}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                        selectedCandidate === index
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-mono text-lg">{candidate.extractedValue || "No value"}</div>
                          <div className="text-sm text-gray-600">
                            Confidence: {candidate.confidence}% | Method: {candidate.method}
                          </div>
                        </div>
                        <div
                          className={`w-3 h-3 rounded-full ${
                            candidate.confidence >= 90
                              ? "bg-green-500"
                              : candidate.confidence >= 70
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Result Details */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Extracted Value</h3>

              {!showManualInput ? (
                <div className="text-center mb-6">
                  <div className="text-4xl font-mono font-bold text-blue-600 mb-2">
                    {selectedResult.extractedValue || "No value detected"}
                  </div>
                  <div className="text-sm text-gray-600">Confidence: {selectedResult.confidence}%</div>
                  {selectedResult.unit && <div className="text-sm text-gray-600">Unit: {selectedResult.unit}</div>}
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Manual Correction</label>
                  <input
                    type="text"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    className="w-full p-3 border rounded-lg text-center text-2xl font-mono"
                    placeholder="Enter correct value"
                  />
                </div>
              )}

              {/* Raw OCR Text */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Raw OCR Text</h4>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                  {selectedResult.text || "No text detected"}
                </div>
              </div>

              {/* Validation Status */}
              {selectedResult.validation && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Validation</h4>
                  <div className="space-y-1">
                    {selectedResult.validation.checks.map((check, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <div className={`w-2 h-2 rounded-full mr-2 ${check.passed ? "bg-green-500" : "bg-red-500"}`} />
                        <span className={check.passed ? "text-green-700" : "text-red-700"}>
                          {check.name}: {check.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Input Toggle */}
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => {
                    setShowManualInput(!showManualInput)
                    if (!showManualInput) {
                      setManualValue(selectedResult.extractedValue || "")
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showManualInput ? "Use OCR Result" : "Manual Correction"}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <button onClick={handleRetake} className="flex-1 btn-secondary">
                Retake
              </button>
              <button
                onClick={handleConfirm}
                disabled={showManualInput && !manualValue.trim()}
                className="flex-1 btn-primary"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
