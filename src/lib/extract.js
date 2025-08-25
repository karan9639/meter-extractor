// Extract FR1 value from OCR text using the specified regex pattern
export function extractFR1(text) {
  if (!text) return null

  const regex = /FR1[:\s]*([0-9]+(?:\.[0-9]+)?)[^\d]*m3[/\\]?hr/i
  const match = text.match(regex)

  console.log("[v0] Trying to match:", text)
  console.log("[v0] Regex result:", match)

  if (!match) return null

  const raw = match[1]
  const normalized = String(Number.parseFloat(raw))

  return { raw, normalized }
}

// Optional: Extract T1 totalizer value
export function extractT1(text) {
  if (!text) return null

  const regex = /T1:\s*([0-9]+(?:\.[0-9]+)?)\s*m3/i
  const match = text.match(regex)

  if (!match) return null

  const raw = match[1]
  const normalized = String(Number.parseFloat(raw))

  return { raw, normalized }
}

// Test the extraction function
console.assert(extractFR1("FR1:041.09 m3/Hr")?.raw === "041.09", "Should extract 041.09")
console.assert(extractFR1("FR1:041.09 m3/Hr")?.normalized === "41.09", "Should normalize to 41.09")
console.assert(extractFR1("FR1: 7.5 m3/Hr")?.raw === "7.5", "Should handle spaces")
console.assert(extractFR1("invalid text") === null, "Should return null for invalid text")
