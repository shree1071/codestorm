/**
 * Tavily Web Search Service
 * Direct frontend integration - no backend proxy
 */

const TAVILY_API_KEY = process.env.NEXT_PUBLIC_TAVILY_API_KEY
const TAVILY_API_URL = 'https://api.tavily.com/search'

// Domains that often have anti-scraping or paywalls
const BLOCKED_DOMAINS = [
  'mdpi.com',
  'springer.com',
  'sciencedirect.com',
  'ieee.org',
  'acm.org',
  'jstor.org',
  'wiley.com',
  'nature.com',
  'science.org',
  'elsevier.com',
  'researchgate.net',
  'academia.edu'
]

const isBlockedDomain = (url) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return BLOCKED_DOMAINS.some(domain => hostname.includes(domain))
  } catch {
    return false
  }
}

export const tavilySearch = async (query, options = {}) => {
  const {
    maxResults = 5,
    searchDepth = 'basic', // 'basic' or 'advanced'
    includeAnswer = true,
    includeRawContent = false,
    filterBlockedDomains = true // New option to filter out problematic domains
  } = options

  if (!TAVILY_API_KEY) {
    throw new Error('Tavily API key not configured')
  }

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: maxResults * 2, // Request more to account for filtering
        search_depth: searchDepth,
        include_answer: includeAnswer,
        include_raw_content: includeRawContent
      })
    })

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Format and filter results
    let results = (data.results || []).map(item => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || '',
      score: item.score || 0.0
    }))

    // Filter out blocked domains if enabled
    if (filterBlockedDomains) {
      results = results.filter(item => !isBlockedDomain(item.url))
    }

    // Limit to requested max results after filtering
    results = results.slice(0, maxResults)

    return {
      status: 'success',
      query,
      answer: data.answer || '',
      results,
      totalResults: results.length
    }
  } catch (error) {
    console.error('Tavily search error:', error)
    return {
      status: 'error',
      error: error.message,
      query,
      results: []
    }
  }
}

export const tavilyQuickAnswer = async (query) => {
  const result = await tavilySearch(query, {
    maxResults: 3,
    searchDepth: 'basic'
  })

  if (result.status === 'error') {
    return `Search failed: ${result.error}`
  }

  // Return Tavily's AI-generated answer if available
  if (result.answer) {
    return result.answer
  }

  // Otherwise, combine top results
  if (result.results.length > 0) {
    return result.results
      .slice(0, 3)
      .map(r => `**${r.title}**\n${r.content}`)
      .join('\n\n')
  }

  return 'No results found.'
}
