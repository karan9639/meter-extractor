"use client"

import { useState } from "react"

export default function TextExtractionPanel({ extractedData, onFilterChange }) {
  const [activeTab, setActiveTab] = useState("all")
  const [filters, setFilters] = useState({
    keywords: [],
    patterns: [],
    includeNumbers: true,
    includeLetters: true,
    includeSymbols: true,
    minLength: 0,
    maxLength: 1000,
    caseSensitive: false,
    exactMatch: false,
    excludeKeywords: [],
    lineFilters: {
      containsEmail: false,
      containsPhone: false,
      containsUrl: false,
      containsDate: false,
      containsPrice: false,
    },
  })

  const [keywordInput, setKeywordInput] = useState("")
  const [patternInput, setPatternInput] = useState("")
  const [excludeInput, setExcludeInput] = useState("")

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const addKeyword = () => {
    if (keywordInput.trim()) {
      const newFilters = {
        ...filters,
        keywords: [...filters.keywords, keywordInput.trim()],
      }
      handleFilterChange(newFilters)
      setKeywordInput("")
    }
  }

  const addPattern = () => {
    if (patternInput.trim()) {
      const newFilters = {
        ...filters,
        patterns: [...filters.patterns, patternInput.trim()],
      }
      handleFilterChange(newFilters)
      setPatternInput("")
    }
  }

  const addExcludeKeyword = () => {
    if (excludeInput.trim()) {
      const newFilters = {
        ...filters,
        excludeKeywords: [...filters.excludeKeywords, excludeInput.trim()],
      }
      handleFilterChange(newFilters)
      setExcludeInput("")
    }
  }

  const removeKeyword = (index) => {
    const newFilters = {
      ...filters,
      keywords: filters.keywords.filter((_, i) => i !== index),
    }
    handleFilterChange(newFilters)
  }

  const removePattern = (index) => {
    const newFilters = {
      ...filters,
      patterns: filters.patterns.filter((_, i) => i !== index),
    }
    handleFilterChange(newFilters)
  }

  const removeExcludeKeyword = (index) => {
    const newFilters = {
      ...filters,
      excludeKeywords: filters.excludeKeywords.filter((_, i) => i !== index),
    }
    handleFilterChange(newFilters)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log("[v0] Text copied to clipboard")
    })
  }

  if (!extractedData) {
    return (
      <div className="card p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Text Extraction</h3>
        <p className="text-gray-600">Capture or upload an image to extract text</p>
      </div>
    )
  }

  const tabs = [
    { id: "all", label: "All Text", count: extractedData.totalLines },
    { id: "filtered", label: "Filtered", count: extractedData.matchCount },
    { id: "emails", label: "Emails", count: extractedData.categories?.emails?.length || 0 },
    { id: "phones", label: "Phones", count: extractedData.categories?.phones?.length || 0 },
    { id: "numbers", label: "Numbers", count: extractedData.categories?.numbers?.length || 0 },
    { id: "urls", label: "URLs", count: extractedData.categories?.urls?.length || 0 },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case "all":
        return (
          <div className="space-y-2">
            {extractedData.allText.split("\n").map((line, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded border-l-4 border-blue-500">
                <span className="font-mono text-sm">{line}</span>
                <button
                  onClick={() => copyToClipboard(line)}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        )
      case "filtered":
        return (
          <div className="space-y-2">
            {extractedData.matchedLines?.map((line, index) => (
              <div key={index} className="p-2 bg-green-50 rounded border-l-4 border-green-500">
                <span className="font-mono text-sm">{line}</span>
                <button
                  onClick={() => copyToClipboard(line)}
                  className="ml-2 text-xs text-green-600 hover:text-green-800"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        )
      case "emails":
        return (
          <div className="space-y-2">
            {extractedData.categories?.emails?.map((email, index) => (
              <div key={index} className="p-2 bg-purple-50 rounded border-l-4 border-purple-500">
                <span className="font-mono text-sm">{email}</span>
                <button
                  onClick={() => copyToClipboard(email)}
                  className="ml-2 text-xs text-purple-600 hover:text-purple-800"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        )
      case "phones":
        return (
          <div className="space-y-2">
            {extractedData.categories?.phones?.map((phone, index) => (
              <div key={index} className="p-2 bg-orange-50 rounded border-l-4 border-orange-500">
                <span className="font-mono text-sm">{phone}</span>
                <button
                  onClick={() => copyToClipboard(phone)}
                  className="ml-2 text-xs text-orange-600 hover:text-orange-800"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        )
      case "numbers":
        return (
          <div className="space-y-2">
            {extractedData.categories?.numbers?.map((number, index) => (
              <div key={index} className="p-2 bg-indigo-50 rounded border-l-4 border-indigo-500">
                <span className="font-mono text-sm">{number}</span>
                <button
                  onClick={() => copyToClipboard(number)}
                  className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        )
      case "urls":
        return (
          <div className="space-y-2">
            {extractedData.categories?.urls?.map((url, index) => (
              <div key={index} className="p-2 bg-cyan-50 rounded border-l-4 border-cyan-500">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-cyan-700 hover:text-cyan-900"
                >
                  {url}
                </a>
                <button onClick={() => copyToClipboard(url)} className="ml-2 text-xs text-cyan-600 hover:text-cyan-800">
                  Copy
                </button>
              </div>
            ))}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Extracted Text</h3>
        <div className="text-sm text-gray-600">Confidence: {extractedData.confidence}%</div>
      </div>

      {/* Filter Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-3">Text Filters</h4>

        {/* Keywords */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Include Keywords</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Enter keyword..."
              className="flex-1 px-3 py-1 border rounded text-sm"
              onKeyPress={(e) => e.key === "Enter" && addKeyword()}
            />
            <button onClick={addKeyword} className="btn-primary text-sm px-3 py-1">
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.keywords.map((keyword, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                {keyword}
                <button onClick={() => removeKeyword(index)} className="ml-1 text-blue-600">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Exclude Keywords */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Exclude Keywords</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              placeholder="Enter keyword to exclude..."
              className="flex-1 px-3 py-1 border rounded text-sm"
              onKeyPress={(e) => e.key === "Enter" && addExcludeKeyword()}
            />
            <button onClick={addExcludeKeyword} className="btn-secondary text-sm px-3 py-1">
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.excludeKeywords.map((keyword, index) => (
              <span key={index} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                {keyword}
                <button onClick={() => removeExcludeKeyword(index)} className="ml-1 text-red-600">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Character Type Filters */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={filters.includeNumbers}
              onChange={(e) => handleFilterChange({ ...filters, includeNumbers: e.target.checked })}
              className="mr-2"
            />
            Include Numbers
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={filters.includeLetters}
              onChange={(e) => handleFilterChange({ ...filters, includeLetters: e.target.checked })}
              className="mr-2"
            />
            Include Letters
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={filters.includeSymbols}
              onChange={(e) => handleFilterChange({ ...filters, includeSymbols: e.target.checked })}
              className="mr-2"
            />
            Include Symbols
          </label>
        </div>

        {/* Length Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min Length</label>
            <input
              type="number"
              value={filters.minLength}
              onChange={(e) => handleFilterChange({ ...filters, minLength: Number.parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-1 border rounded text-sm"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Length</label>
            <input
              type="number"
              value={filters.maxLength}
              onChange={(e) => handleFilterChange({ ...filters, maxLength: Number.parseInt(e.target.value) || 1000 })}
              className="w-full px-3 py-1 border rounded text-sm"
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">{renderContent()}</div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button onClick={() => copyToClipboard(extractedData.filteredText)} className="btn-primary">
          Copy Filtered Text
        </button>
        <button onClick={() => copyToClipboard(extractedData.allText)} className="btn-secondary">
          Copy All Text
        </button>
      </div>
    </div>
  )
}
