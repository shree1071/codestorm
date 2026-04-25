/**
 * OpenRouter API - Access to multiple AI models
 * Get API key from: https://openrouter.ai/keys
 */

const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Available models for Face-Off
 */
export const MODELS = {
  GPT4: {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    color: 'from-green-500 to-emerald-600',
    icon: '🤖'
  },
  CLAUDE: {
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    color: 'from-purple-500 to-indigo-600',
    icon: '🧠'
  },
  GEMINI: {
    id: 'google/gemini-2.5-flash-lite-preview-09-2025',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'Google',
    color: 'from-blue-500 to-cyan-600',
    icon: '✨'
  }
}

/**
 * Call a specific model
 */
export const callModel = async (modelId, question, sources = []) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured. Add NEXT_PUBLIC_OPENROUTER_API_KEY to .env.local')
  }

  // Build context from sources
  let context = ''
  if (sources.length > 0) {
    context = '\n\n<sources>\n'
    sources.slice(0, 5).forEach((source, idx) => {
      context += `\nSource ${idx + 1}: ${source.title}\n`
      if (source.content) {
        context += `${source.content.substring(0, 1000)}\n`
      } else if (source.summary) {
        context += `${source.summary}\n`
      }
    })
    context += '\n</sources>\n\nAnswer the question based on the sources above. Cite sources by number.'
  }

  const messages = [
    {
      role: 'user',
      content: question + context
    }
  ]

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
        'X-Title': 'Synapse Research Assistant'
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`API error (${response.status}): ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    
    return {
      content: data.choices[0]?.message?.content || 'No response',
      usage: data.usage,
      model: data.model
    }
  } catch (error) {
    console.error(`Error calling ${modelId}:`, error)
    throw error
  }
}

/**
 * Run Face-Off: Call all 3 models simultaneously
 */
export const runFaceOff = async (question, sources = []) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured. Get one at https://openrouter.ai/keys')
  }

  const modelIds = Object.keys(MODELS)
  
  // Call all models in parallel
  const promises = modelIds.map(async (key) => {
    const model = MODELS[key]
    const startTime = Date.now()
    
    try {
      const result = await callModel(model.id, question, sources)
      const endTime = Date.now()
      
      return {
        model: key,
        modelName: model.name,
        provider: model.provider,
        color: model.color,
        icon: model.icon,
        response: result.content,
        responseTime: endTime - startTime,
        tokens: result.usage?.total_tokens || 0,
        status: 'success'
      }
    } catch (error) {
      const endTime = Date.now()
      return {
        model: key,
        modelName: model.name,
        provider: model.provider,
        color: model.color,
        icon: model.icon,
        response: `Error: ${error.message}`,
        responseTime: endTime - startTime,
        tokens: 0,
        status: 'error'
      }
    }
  })

  const results = await Promise.all(promises)
  
  // Sort by response time (fastest first)
  results.sort((a, b) => a.responseTime - b.responseTime)
  
  return results
}
