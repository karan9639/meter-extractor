"use client"

import { createContext, useContext, useReducer, useEffect } from "react"

const ScanContext = createContext()

const STORAGE_KEY = "meter-scans"
const MAX_SCANS = 10

const initialState = {
  scans: [],
  currentScan: null,
  isProcessing: false,
  error: null,
}

function scanReducer(state, action) {
  switch (action.type) {
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.payload, error: null }

    case "SET_ERROR":
      return { ...state, error: action.payload, isProcessing: false }

    case "ADD_SCAN":
      const newScan = {
        id: Date.now(),
        raw: action.payload.raw,
        normalized: action.payload.normalized,
        timestamp: new Date().toISOString(),
        ocrText: action.payload.ocrText,
        previewDataUrl: action.payload.previewDataUrl,
      }

      const updatedScans = [newScan, ...state.scans].slice(0, MAX_SCANS)

      return {
        ...state,
        scans: updatedScans,
        currentScan: newScan,
        isProcessing: false,
        error: null,
      }

    case "LOAD_SCANS":
      return { ...state, scans: action.payload }

    case "CLEAR_ERROR":
      return { ...state, error: null }

    default:
      return state
  }
}

export function ScanProvider({ children }) {
  const [state, dispatch] = useReducer(scanReducer, initialState)

  // Load scans from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const scans = JSON.parse(stored)
        dispatch({ type: "LOAD_SCANS", payload: scans })
      }
    } catch (error) {
      console.error("Failed to load scans from localStorage:", error)
    }
  }, [])

  // Save scans to localStorage whenever scans change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.scans))
    } catch (error) {
      console.error("Failed to save scans to localStorage:", error)
    }
  }, [state.scans])

  return <ScanContext.Provider value={{ state, dispatch }}>{children}</ScanContext.Provider>
}

export function useScanStore() {
  const context = useContext(ScanContext)
  if (!context) {
    throw new Error("useScanStore must be used within a ScanProvider")
  }
  return context
}
