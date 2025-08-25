"use client"

/**
 * Advanced camera hook with Google Lens-like features
 * - Tap to focus
 * - Pinch to zoom
 * - Torch toggle
 * - Grid overlay
 * - Auto-capture with quality thresholds
 * - Live ROI detection
 */
import { useRef, useEffect, useState, useCallback } from "react"

export function useAdvancedCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)
  const [capabilities, setCapabilities] = useState({})
  const [settings, setSettings] = useState({
    zoom: 1,
    torch: false,
    focusMode: "continuous",
  })
  const [qualityScore, setQualityScore] = useState(0)
  const [roiDetected, setRoiDetected] = useState(null)
  const [autoCapture, setAutoCapture] = useState(false)

  // Initialize camera with advanced constraints
  const start = useCallback(async () => {
    try {
      setError(null)

      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30 },
          focusMode: { ideal: "continuous" },
          exposureMode: { ideal: "continuous" },
          whiteBalanceMode: { ideal: "continuous" },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        // Get camera capabilities
        const track = stream.getVideoTracks()[0]
        const caps = track.getCapabilities()
        setCapabilities(caps)

        setIsActive(true)
        startQualityMonitoring()
        startROIDetection()
      }
    } catch (err) {
      console.error("[v0] Camera access failed:", err)
      setError(getErrorMessage(err))
    }
  }, [])

  // Stop camera
  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsActive(false)
    setQualityScore(0)
    setRoiDetected(null)
  }, [])

  // Tap to focus
  const focusAt = useCallback(async (x, y) => {
    if (!streamRef.current) return

    try {
      const track = streamRef.current.getVideoTracks()[0]
      const capabilities = track.getCapabilities()

      if (capabilities.focusMode && capabilities.focusMode.includes("manual")) {
        await track.applyConstraints({
          advanced: [
            {
              focusMode: "manual",
              pointsOfInterest: [{ x: x / videoRef.current.videoWidth, y: y / videoRef.current.videoHeight }],
            },
          ],
        })

        // Return to continuous after 2 seconds
        setTimeout(() => {
          track
            .applyConstraints({
              advanced: [{ focusMode: "continuous" }],
            })
            .catch(console.warn)
        }, 2000)
      }
    } catch (error) {
      console.warn("[v0] Focus failed:", error)
    }
  }, [])

  // Zoom control
  const setZoom = useCallback(async (zoomLevel) => {
    if (!streamRef.current) return

    try {
      const track = streamRef.current.getVideoTracks()[0]
      const capabilities = track.getCapabilities()

      if (capabilities.zoom) {
        const clampedZoom = Math.max(capabilities.zoom.min, Math.min(capabilities.zoom.max, zoomLevel))

        await track.applyConstraints({
          advanced: [{ zoom: clampedZoom }],
        })

        setSettings((prev) => ({ ...prev, zoom: clampedZoom }))
      }
    } catch (error) {
      console.warn("[v0] Zoom failed:", error)
    }
  }, [])

  // Torch toggle
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return

    try {
      const track = streamRef.current.getVideoTracks()[0]
      const capabilities = track.getCapabilities()

      if (capabilities.torch) {
        const newTorchState = !settings.torch
        await track.applyConstraints({
          advanced: [{ torch: newTorchState }],
        })

        setSettings((prev) => ({ ...prev, torch: newTorchState }))
      }
    } catch (error) {
      console.warn("[v0] Torch toggle failed:", error)
    }
  }, [settings.torch])

  // Quality assessment
  const assessImageQuality = useCallback((canvas) => {
    const ctx = canvas.getContext("2d")
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    let sharpness = 0
    let brightness = 0
    const contrast = 0
    let glarePixels = 0

    // Calculate metrics
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const gray = (r + g + b) / 3

      brightness += gray

      // Detect glare (very bright pixels)
      if (gray > 240) glarePixels++

      // Simple sharpness detection using gradient
      if (i > canvas.width * 4) {
        const prevGray =
          (data[i - canvas.width * 4] + data[i - canvas.width * 4 + 1] + data[i - canvas.width * 4 + 2]) / 3
        sharpness += Math.abs(gray - prevGray)
      }
    }

    brightness /= data.length / 4
    sharpness /= data.length / 4
    const glareRatio = glarePixels / (data.length / 4)

    // Calculate quality score (0-100)
    const brightnessScore = Math.max(0, 100 - Math.abs(brightness - 128) * 2) // Prefer mid-range brightness
    const sharpnessScore = Math.min(100, sharpness * 2) // Higher gradient = sharper
    const glareScore = Math.max(0, 100 - glareRatio * 500) // Penalize glare

    const totalScore = (brightnessScore + sharpnessScore + glareScore) / 3

    return {
      score: Math.round(totalScore),
      metrics: {
        brightness: Math.round(brightness),
        sharpness: Math.round(sharpness),
        glare: Math.round(glareRatio * 100),
      },
    }
  }, [])

  // Start quality monitoring
  const startQualityMonitoring = useCallback(() => {
    const monitor = () => {
      if (!videoRef.current || !isActive) return

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight

      ctx.drawImage(videoRef.current, 0, 0)

      const quality = assessImageQuality(canvas)
      setQualityScore(quality.score)

      // Auto-capture if quality is high enough
      if (autoCapture && quality.score > 85 && roiDetected) {
        captureFrame()
      }

      setTimeout(monitor, 500) // Check every 500ms
    }

    setTimeout(monitor, 1000) // Start after 1 second
  }, [isActive, autoCapture, roiDetected, assessImageQuality])

  // ROI detection (simplified - would use computer vision in production)
  const startROIDetection = useCallback(() => {
    const detectROI = () => {
      if (!videoRef.current || !isActive) return

      // Simplified ROI detection - in production would use edge detection
      // For now, suggest center region for meter alignment
      const video = videoRef.current
      const roi = {
        x: video.videoWidth * 0.1,
        y: video.videoHeight * 0.3,
        width: video.videoWidth * 0.8,
        height: video.videoHeight * 0.4,
      }

      setRoiDetected(roi)
      setTimeout(detectROI, 1000)
    }

    setTimeout(detectROI, 2000)
  }, [isActive])

  // Capture current frame
  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight

    ctx.drawImage(videoRef.current, 0, 0)

    return {
      canvas,
      dataUrl: canvas.toDataURL("image/jpeg", 0.9),
      quality: assessImageQuality(canvas),
      roi: roiDetected,
    }
  }, [assessImageQuality, roiDetected])

  // Error message helper
  const getErrorMessage = (error) => {
    if (error.name === "NotAllowedError") {
      return "Camera access denied. Please allow camera permissions and refresh."
    } else if (error.name === "NotFoundError") {
      return "No camera found. Please connect a camera and try again."
    } else if (error.name === "NotReadableError") {
      return "Camera is busy or unavailable. Please close other apps using the camera."
    }
    return `Camera error: ${error.message}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stop()
  }, [stop])

  return {
    videoRef,
    canvasRef,
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
  }
}
