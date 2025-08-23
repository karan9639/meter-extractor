"use client"

import { useRef, useEffect, useState } from "react"

export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)

  const start = async () => {
    try {
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsActive(true)
      }
    } catch (err) {
      console.error("Camera access failed:", err)
      setError(err.message)
    }
  }

  const stop = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsActive(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [])

  return {
    videoRef,
    isActive,
    error,
    start,
    stop,
  }
}
