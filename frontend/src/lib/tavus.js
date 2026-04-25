/**
 * Tavus AI Avatar Service
 * Direct frontend integration - no backend proxy
 */

const TAVUS_API_KEY = process.env.NEXT_PUBLIC_TAVUS_API_KEY
const TAVUS_BASE_URL = 'https://tavusapi.com/v2'

const tavusHeaders = {
  'x-api-key': TAVUS_API_KEY,
  'Content-Type': 'application/json'
}

/**
 * Build context/system prompt for Tavus persona
 */
const buildContext = (notebookTitle, sources) => {
  const contextParts = [
    '<identity>',
    `You are an expert research assistant for the topic: ${notebookTitle}`,
  ]

  if (sources.length > 0) {
    contextParts.push('You have deep knowledge of the research sources provided to you.')
  } else {
    contextParts.push('You are a knowledgeable general expert ready to discuss this topic.')
  }
  
  contextParts.push('</identity>', '')

  if (sources.length > 0) {
    contextParts.push(
      '<knowledge_base>',
      'You have access to the following research sources:',
      ''
    )

    // Include up to 10 sources with full content
    sources.slice(0, 10).forEach((source, idx) => {
      contextParts.push(
        `=== Source ${idx + 1} ===`,
        `Title: ${source.title || 'Untitled'}`,
        `Type: ${source.type || 'unknown'}`,
        `URL: ${source.url || 'N/A'}`,
        ''
      )

      // Include full content if available
      if (source.content) {
        contextParts.push(
          'Full Content:',
          source.content.substring(0, 3000), // Limit to 3000 chars per source
          ''
        )
      } else if (source.summary) {
        contextParts.push(
          'Summary:',
          source.summary,
          ''
        )
      }

      // Include any extracted text
      if (source.text && source.text !== source.content) {
        contextParts.push(
          'Extracted Text:',
          source.text.substring(0, 2000),
          ''
        )
      }

      contextParts.push('') // Blank line between sources
    })

    contextParts.push('</knowledge_base>', '')
  }

  contextParts.push(
    '<instructions>',
  )

  if (sources.length > 0) {
    contextParts.push(
      '- Answer questions based on the research sources provided above',
      '- Always cite sources by number when referencing information (e.g., "According to Source 3...")',
      '- Quote directly from sources when appropriate',
      '- If asked about something not in your sources, clearly state that',
    )
  } else {
    contextParts.push(
      '- Provide helpful, accurate information about the topic',
      '- Draw on your general knowledge to assist the user',
      '- Suggest that adding sources would enable more specific, cited answers',
    )
  }

  contextParts.push(
    '- Be conversational, warm, and engaging',
    '- Provide actionable insights and connections between sources when relevant',
    '- Help users understand complex topics by breaking them down',
    '- Ask clarifying questions if the user\'s query is ambiguous',
    '</instructions>',
    '',
    '<personality>',
    '- Knowledgeable but approachable',
    '- Enthusiastic about the research topic',
    '- Patient and thorough in explanations',
    '- Proactive in suggesting related insights',
    '</personality>'
  )

  return contextParts.join('\n')
}

/**
 * Create Tavus conversation session
 */
export const createTavusSession = async (notebookTitle, sources) => {
  if (!TAVUS_API_KEY) {
    throw new Error('Tavus API key not configured. Add NEXT_PUBLIC_TAVUS_API_KEY to .env.local')
  }

  try {
    const context = buildContext(notebookTitle, sources)

    console.log('Creating Tavus persona...', {
      title: notebookTitle,
      sourcesCount: sources.length
    })

    // Create persona with replica_id
    const personaPayload = {
      persona_name: `Research Assistant: ${notebookTitle.slice(0, 50)}`,
      system_prompt: context,
      default_replica_id: process.env.NEXT_PUBLIC_TAVUS_REPLICA_ID || 'rf4e9d9790f0'
    }

    console.log('Persona payload:', personaPayload)

    const personaResponse = await fetch(`${TAVUS_BASE_URL}/personas`, {
      method: 'POST',
      headers: tavusHeaders,
      body: JSON.stringify(personaPayload)
    })

    if (!personaResponse.ok) {
      const errorText = await personaResponse.text()
      console.error('Tavus persona creation failed:', {
        status: personaResponse.status,
        statusText: personaResponse.statusText,
        error: errorText
      })
      
      // Provide helpful error messages
      if (personaResponse.status === 401) {
        throw new Error('Tavus API key is invalid. Please check NEXT_PUBLIC_TAVUS_API_KEY in .env.local')
      } else if (personaResponse.status === 400) {
        throw new Error(`Tavus API error: ${errorText}. You may need to set NEXT_PUBLIC_TAVUS_REPLICA_ID in .env.local`)
      }
      
      throw new Error(`Tavus persona creation failed (${personaResponse.status}): ${errorText}`)
    }

    const personaData = await personaResponse.json()
    const personaId = personaData.persona_id

    console.log('Persona created:', personaId)

    // Create conversation
    const conversationResponse = await fetch(`${TAVUS_BASE_URL}/conversations`, {
      method: 'POST',
      headers: tavusHeaders,
      body: JSON.stringify({
        persona_id: personaId,
        conversation_name: `Research: ${notebookTitle}`,
        properties: {
          max_call_duration: 600, // 10 minutes
          participant_left_timeout: 60,
          enable_recording: false
        }
      })
    })

    if (!conversationResponse.ok) {
      const errorText = await conversationResponse.text()
      console.error('Tavus conversation creation failed:', {
        status: conversationResponse.status,
        statusText: conversationResponse.statusText,
        error: errorText
      })
      throw new Error(`Tavus conversation creation failed (${conversationResponse.status}): ${errorText}`)
    }

    const conversationData = await conversationResponse.json()

    console.log('Conversation created:', conversationData.conversation_id)

    return {
      sessionId: conversationData.conversation_id,
      conversationUrl: conversationData.conversation_url,
      status: conversationData.status || 'active',
      personaId
    }
  } catch (error) {
    console.error('Tavus session creation error:', error)
    throw error
  }
}

/**
 * Get conversation status
 */
export const getTavusConversationStatus = async (conversationId) => {
  if (!TAVUS_API_KEY) {
    throw new Error('Tavus API key not configured')
  }

  try {
    const response = await fetch(`${TAVUS_BASE_URL}/conversations/${conversationId}`, {
      method: 'GET',
      headers: tavusHeaders
    })

    if (!response.ok) {
      throw new Error(`Failed to get conversation status: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Tavus status check error:', error)
    throw error
  }
}

/**
 * End conversation
 */
export const endTavusConversation = async (conversationId) => {
  if (!TAVUS_API_KEY) {
    throw new Error('Tavus API key not configured')
  }

  try {
    const response = await fetch(`${TAVUS_BASE_URL}/conversations/${conversationId}/end`, {
      method: 'POST',
      headers: tavusHeaders
    })

    if (!response.ok) {
      throw new Error(`Failed to end conversation: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Tavus end conversation error:', error)
    throw error
  }
}
