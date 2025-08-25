"use client"

import { useState } from "react"

export default function TextFilterPanel({ onFilter, allText = "" }) {
  const [filters, setFilters] = useState({
    keywords: [],
    patterns: [],
    includeNumbers: true,
    includeLetters: true,
    minLength: 0,
    maxLength: Number.POSITIVE_INFINITY,
    caseSensitive: false,
  })

  const [keywordInput, setKeywordInput] = useState("")
  const [patternInput, setPatternInput] = useState("")
  const [filteredResult, setFilteredResult] = useState(null)

  const applyFilters = () => {
    const result = filterText(allText, filters)
    setFilteredResult(result)
    onFilter(result)
  }

  const filterText = (text, filterOptions) => {
    const {
      keywords = [],
      patterns = [],
      includeNumbers = true,
      includeLetters = true,
      minLength = 0,
      maxLength = Number.POSITIVE_INFINITY,
      caseSensitive = false,
    } = filterOptions

    let lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    // Apply length filters
    lines = lines.filter((line) => line.length >= minLength && line.length <= maxLength)

    // Apply keyword filters
    if (keywords.length > 0) {
      lines = lines.filter((line) => {
        const searchText = caseSensitive ? line : line.toLowerCase()
        const searchKeywords = caseSensitive ? keywords : keywords.map((k) => k.toLowerCase())
        return searchKeywords.some((keyword) => searchText.includes(keyword))
      })
    }

    // Apply pattern filters (regex)
    if (patterns.length > 0) {
      lines = lines.filter((line) => {
        return patterns.some((pattern) => {
          try {
            const regex = new RegExp(pattern, caseSensitive ? "g" : "gi")
            return regex.test(line)
          } catch (e) {
            console.warn("Invalid regex pattern:", pattern)
            return false
          }
        })
      })
    }

    // Apply character type filters
    if (!includeNumbers) {
      lines = lines.filter((line) => !/\d/.test(line))
    }
    if (!includeLetters) {
      lines = lines.filter((line) => !/[a-zA-Z]/.test(line))
    }

    return {
      filteredText: lines.join("\n"),
      matchedLines: lines,
      totalLines: text.split("\n").filter((line) => line.trim().length > 0).length,
    }
  }

  const addKeyword = () => {
    if (keywordInput.trim() && !filters.keywords.includes(keywordInput.trim())) {
      setFilters((prev) => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()],
      }))
      setKeywordInput("")
    }
  }

  const removeKeyword = (keyword) => {
    setFilters((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keyword),
    }))
  }

  const addPattern = () => {
    if (patternInput.trim() && !filters.patterns.includes(patternInput.trim())) {
      setFilters((prev) => ({
        ...prev,
        patterns: [...prev.patterns, patternInput.trim()],
      }))
      setPatternInput("")
    }
  }

  const removePattern = (pattern) => {
    setFilters((prev) => ({
      ...prev,
      patterns: prev.patterns.filter((p) => p !== pattern),
    }))
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Text Filter Settings</h3>

      <div className="space-y-4">
        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium mb-2">Keywords</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addKeyword()}
              className="flex-1 p-2 border rounded text-sm"
              placeholder="Add keyword..."
            />
            <button onClick={addKeyword} className="btn-primary px-3 py-2 text-sm">
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
              >
                {keyword}
                <button onClick={() => removeKeyword(keyword)} className="text-blue-600 hover:text-blue-800">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Regex Patterns */}
        <div>
          <label className="block text-sm font-medium mb-2">Regex Patterns</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={patternInput}
              onChange={(e) => setPatternInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addPattern()}
              className="flex-1 p-2 border rounded text-sm font-mono"
              placeholder="Add regex pattern..."
            />
            <button onClick={addPattern} className="btn-primary px-3 py-2 text-sm">
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.patterns.map((pattern) => (
              <span
                key={pattern}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono"
              >
                {pattern}
                <button onClick={() => removePattern(pattern)} className="text-green-600 hover:text-green-800">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Length Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min Length</label>
            <input
              type="number"
              value={filters.minLength}
              onChange={(e) => setFilters((prev) => ({ ...prev, minLength: Number.parseInt(e.target.value) || 0 }))}
              className="w-full p-2 border rounded text-sm"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Length</label>
            <input
              type="number"
              value={filters.maxLength === Number.POSITIVE_INFINITY ? "" : filters.maxLength}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  maxLength: e.target.value ? Number.parseInt(e.target.value) : Number.POSITIVE_INFINITY,
                }))
              }
              className="w-full p-2 border rounded text-sm"
              min="1"
              placeholder="No limit"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.includeNumbers}
              onChange={(e) => setFilters((prev) => ({ ...prev, includeNumbers: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm">Include Numbers</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.includeLetters}
              onChange={(e) => setFilters((prev) => ({ ...prev, includeLetters: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm">Include Letters</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.caseSensitive}
              onChange={(e) => setFilters((prev) => ({ ...prev, caseSensitive: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm">Case Sensitive</span>
          </label>
        </div>

        {/* Apply Button */}
        <button onClick={applyFilters} className="btn-primary w-full">
          Apply Filters
        </button>

        {/* Results */}
        {filteredResult && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <div className="text-sm text-gray-600 mb-2">
              Found {filteredResult.matchedLines.length} of {filteredResult.totalLines} lines
            </div>
            <div className="text-sm font-mono bg-white p-2 rounded border max-h-32 overflow-y-auto">
              {filteredResult.filteredText || "No matches found"}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
