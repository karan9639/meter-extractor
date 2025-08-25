"use client"
import { useNavigate } from "react-router-dom"
import { useScanStore } from "../state/scanStore.jsx"

export default function Result() {
  const navigate = useNavigate()
  const { state } = useScanStore()
  const { currentScan, scans } = state

  if (!currentScan) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No scan data available</p>
          <button onClick={() => navigate("/")} className="btn-primary">
            Take a Reading
          </button>
        </div>
      </div>
    )
  }

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Could add a toast notification here
        console.log("Copied to clipboard:", text)
      })
      .catch((err) => {
        console.error("Failed to copy:", err)
      })
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reading Result</h1>
          <p className="text-gray-600">Extracted meter value</p>
        </div>

        {/* Main Results */}
        <div className="space-y-4 mb-6">
          {/* Raw Value */}
          <div className="card text-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Raw Value</h2>
            <div className="text-3xl font-mono font-bold text-blue-600 mb-2">{currentScan.raw}</div>
            <button
              onClick={() => copyToClipboard(currentScan.raw)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              📋 Copy
            </button>
          </div>

          {/* Normalized Value */}
          <div className="card text-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Normalized Value</h2>
            <div className="text-3xl font-mono font-bold text-green-600 mb-2">{currentScan.normalized}</div>
            <button
              onClick={() => copyToClipboard(currentScan.normalized)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              📋 Copy
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="card mb-6">
          <h3 className="font-semibold mb-3">Scan Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Timestamp:</span>
              <span className="font-mono">{formatTimestamp(currentScan.timestamp)}</span>
            </div>
            {currentScan.previewDataUrl && (
              <div className="mt-3">
                <span className="text-gray-600 block mb-2">Captured Image:</span>
                <img
                  src={currentScan.previewDataUrl || "/placeholder.svg"}
                  alt="Captured meter"
                  className="w-full rounded border"
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-6">
          <button onClick={() => navigate("/")} className="btn-primary w-full">
            Take Another Reading
          </button>
        </div>

        {/* History */}
        {scans.length > 1 && (
          <div className="card">
            <h3 className="font-semibold mb-3">Recent History</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {scans.slice(1).map((scan) => (
                <div key={scan.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-mono text-sm font-semibold">{scan.normalized}</div>
                    <div className="text-xs text-gray-500">Raw: {scan.raw}</div>
                    <div className="text-xs text-gray-500">{formatTimestamp(scan.timestamp)}</div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => copyToClipboard(scan.normalized)} className="text-blue-600 text-xs">
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
