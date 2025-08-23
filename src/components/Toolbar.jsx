"use client"

export default function Toolbar({ onFileUpload, disabled, testMode, onTestSubmit }) {
  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file && onFileUpload) {
      onFileUpload(file)
    }
  }

  const handleTestSubmit = (event) => {
    event.preventDefault()
    const formData = new FormData(event.target)
    const testText = formData.get("testText")
    if (testText && onTestSubmit) {
      onTestSubmit(testText)
    }
  }

  return (
    <div className="space-y-4">
      {/* File Upload */}
      <div className="card">
        <h3 className="font-semibold mb-3">Upload Image</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {/* Test Input */}
      {testMode && (
        <div className="card">
          <h3 className="font-semibold mb-3">Test Extraction</h3>
          <form onSubmit={handleTestSubmit} className="space-y-3">
            <textarea
              name="testText"
              placeholder="Paste test text like: FR1:041.09 m3/Hr"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none"
              rows={3}
            />
            <button type="submit" disabled={disabled} className="btn-secondary w-full">
              Test Extract
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
