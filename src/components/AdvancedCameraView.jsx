"use client"

/**
 * Advanced camera component with Google Lens-like interface
 */
import { useEffect, useState } from "react"
import { useAdvancedCamera } from "../hooks/useAdvancedCamera.js"

export default function AdvancedCameraView({ onCapture, disabled, showGrid = true }) {
  const {
    videoRef,
    isActive,
    error,
    capabilities,
    settings,
    qualityScore,
    roiDetected,
    autoCapture,
    start,
    stop,
    focusAt,
    setZoom,
    toggleTorch,
    captureFrame,
    setAutoCapture,
  } = useAdvancedCamera()

  const [showControls, setShowControls] = useState(true)
  const [lastTap, setLastTap] = useState(0)

  useEffect(() => {
    start()
    return () => stop()
  }, [start, stop])

  // Handle tap to focus
  const handleVideoTap = (event) => {
    const rect = videoRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Convert to video coordinates
    const videoX = (x / rect.width) * videoRef.current.videoWidth
    const videoY = (y / rect.height) * videoRef.current.videoHeight

    focusAt(videoX, videoY)

    // Show focus indicator
    showFocusIndicator(x, y)
  }

  // Handle pinch to zoom
  const handleTouchStart = (event) => {
    if (event.touches.length === 2) {
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)
      setLastTap(distance)
    }
  }

  const handleTouchMove = (event) => {
    if (event.touches.length === 2 && lastTap > 0) {
      event.preventDefault()
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)

      const scale = distance / lastTap
      const newZoom = Math.max(1, Math.min(5, settings.zoom * scale))
      setZoom(newZoom)
      setLastTap(distance)
    }
  }

  // Show focus indicator animation
  const showFocusIndicator = (x, y) => {
    const indicator = document.createElement("div")
    indicator.className = "absolute w-16 h-16 border-2 border-white rounded-full animate-ping pointer-events-none"
    indicator.style.left = `${x - 32}px`
    indicator.style.top = `${y - 32}px`

    const container = videoRef.current?.parentElement
    if (container) {
      container.appendChild(indicator)
      setTimeout(() => container.removeChild(indicator), 1000)
    }
  }

  // Handle capture
  const handleCapture = () => {
    if (disabled || !isActive) return

    const result = captureFrame()
    if (result && onCapture) {
      onCapture(result)
    }
  }

  // Quality indicator color
  const getQualityColor = (score) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  if (error) {
    return (
      <div className="relative bg-black rounded-lg overflow-hidden h-64 flex items-center justify-center">
        <div className="text-center text-white p-6">
          <div className="w-16 h-16 mx-auto mb-4 text-red-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Camera Access Failed</h3>
          <p className="text-sm text-gray-300 mb-4">{error}</p>
          <button onClick={start} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      {/* Video Stream */}
      <video
        ref={videoRef}
        className="w-full h-64 object-cover"
        playsInline
        muted
        onClick={handleVideoTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      />

      {/* Grid Overlay */}
      {showGrid && (
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="33.333%" height="33.333%" patternUnits="userSpaceOnUse">
                <path d="M 33.333 0 L 0 0 0 33.333" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      )}

      {/* ROI Detection Overlay */}
      {roiDetected && (
        <div
          className="absolute border-2 border-green-400 border-dashed rounded-lg pointer-events-none"
          style={{
            left: `${(roiDetected.x / videoRef.current?.videoWidth || 1) * 100}%`,
            top: `${(roiDetected.y / videoRef.current?.videoHeight || 1) * 100}%`,
            width: `${(roiDetected.width / videoRef.current?.videoWidth || 1) * 100}%`,
            height: `${(roiDetected.height / videoRef.current?.videoHeight || 1) * 100}%`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-green-400 text-black text-xs px-2 py-1 rounded">
            Align meter display here
          </div>
        </div>
      )}

      {/* Quality Indicator */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-lg px-3 py-2">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${qualityScore >= 80 ? "bg-green-500" : qualityScore >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
          />
          <span className={`text-sm font-medium ${getQualityColor(qualityScore)}`}>Quality: {qualityScore}%</span>
        </div>
      </div>

      {/* Camera Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          {/* Torch Toggle */}
          {capabilities.torch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full ${settings.torch ? "bg-yellow-500" : "bg-black bg-opacity-50"} text-white`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </button>
          )}

          {/* Auto-capture Toggle */}
          <button
            onClick={() => setAutoCapture(!autoCapture)}
            className={`p-2 rounded-full ${autoCapture ? "bg-blue-500" : "bg-black bg-opacity-50"} text-white`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Zoom Control */}
      {capabilities.zoom && (
        <div className="absolute bottom-20 left-4 right-4">
          <div className="bg-black bg-opacity-50 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <span className="text-white text-sm">1x</span>
              <input
                type="range"
                min={capabilities.zoom?.min || 1}
                max={capabilities.zoom?.max || 5}
                step="0.1"
                value={settings.zoom}
                onChange={(e) => setZoom(Number.parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-white text-sm">{Math.round(settings.zoom * 10) / 10}x</span>
            </div>
          </div>
        </div>
      )}

      {/* Capture Button */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <button
          onClick={handleCapture}
          disabled={disabled || !isActive}
          className={`w-16 h-16 rounded-full border-4 border-white ${
            disabled ? "bg-gray-400" : qualityScore >= 80 ? "bg-green-500" : "bg-blue-500"
          } transition-all duration-200 ${!disabled && "hover:scale-110"}`}
        >
          {disabled ? (
            <div className="w-6 h-6 mx-auto border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="w-8 h-8 bg-white rounded-full mx-auto" />
          )}
        </button>
      </div>

      {/* Auto-capture Indicator */}
      {autoCapture && qualityScore >= 80 && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
          Auto-capturing...
        </div>
      )}
    </div>
  )
}
