"use client"

import { useEffect } from "react"
import { useCamera } from "../hooks/useCamera.js"

export default function CameraView({ onCapture, disabled }) {
  const { videoRef, isActive, error, start, stop } = useCamera()

  useEffect(() => {
    start()
    return () => stop()
  }, [])

  const handleCapture = () => {
    if (videoRef.current && onCapture) {
      onCapture(videoRef.current)
    }
  }

  if (error) {
    return (
      <div className="card text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className="font-semibold">Camera Access Failed</p>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <p className="text-sm text-gray-500">Please check camera permissions or use the upload option below.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video ref={videoRef} className="w-full h-64 object-cover" playsInline muted />

        {/* Overlay guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-green-400 border-dashed rounded-lg w-4/5 h-16 flex items-center justify-center">
            <span className="text-green-400 text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
              Align meter display here
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <button onClick={handleCapture} disabled={!isActive || disabled} className="btn-primary w-full">
          {disabled ? "Processing..." : "Capture Reading"}
        </button>
      </div>
    </div>
  )
}
