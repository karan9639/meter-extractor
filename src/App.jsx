"use client"

import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { useEffect } from "react"
import { ScanProvider } from "./state/scanStore.jsx"
import Capture from "./pages/Capture.jsx"
import Review from "./pages/Review.jsx"
import Result from "./pages/Result.jsx"

function App() {
  // PWA installation and service worker registration
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[v0] SW registered: ", registration)
          })
          .catch((registrationError) => {
            console.log("[v0] SW registration failed: ", registrationError)
          })
      })
    }

    // Add manifest link
    const link = document.createElement("link")
    link.rel = "manifest"
    link.href = "/manifest.json"
    document.head.appendChild(link)

    // PWA install prompt
    let deferredPrompt
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault()
      deferredPrompt = e

      // Show install button after 30 seconds
      setTimeout(() => {
        if (deferredPrompt) {
          const installBanner = document.createElement("div")
          installBanner.className = "fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50"
          installBanner.innerHTML = `
            <div class="flex items-center justify-between">
              <div>
                <div class="font-semibold">Install Meter OCR</div>
                <div class="text-sm opacity-90">Add to home screen for offline access</div>
              </div>
              <div class="flex space-x-2">
                <button id="install-dismiss" class="px-3 py-1 text-sm border border-white/30 rounded">Later</button>
                <button id="install-app" class="px-3 py-1 text-sm bg-white text-blue-600 rounded font-medium">Install</button>
              </div>
            </div>
          `
          document.body.appendChild(installBanner)

          document.getElementById("install-app").addEventListener("click", () => {
            deferredPrompt.prompt()
            deferredPrompt.userChoice.then((choiceResult) => {
              console.log("[v0] Install prompt result:", choiceResult.outcome)
              deferredPrompt = null
              document.body.removeChild(installBanner)
            })
          })

          document.getElementById("install-dismiss").addEventListener("click", () => {
            document.body.removeChild(installBanner)
          })
        }
      }, 30000)
    })
  }, [])

  return (
    <ScanProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Capture />} />
            <Route path="/review" element={<Review />} />
            <Route path="/result" element={<Result />} />
          </Routes>
        </div>
      </Router>
    </ScanProvider>
  )
}

export default App
