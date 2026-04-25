import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const api = {
  // Notebooks
  listNotebooks: async () => {
    const { data } = await client.get('/api/notebooks')
    return data.notebooks || []
  },

  createNotebook: async (title) => {
    const { data } = await client.post('/api/notebooks', { title })
    return data
  },

  getNotebook: async (id) => {
    const { data } = await client.get(`/api/notebooks/${id}`)
    return data
  },

  updateNotebook: async (id, title) => {
    const { data } = await client.put(`/api/notebooks/${id}`, { title })
    return data
  },

  deleteNotebook: async (id) => {
    await client.delete(`/api/notebooks/${id}`)
  },

  // Sources
  getSources: async (notebookId) => {
    const { data } = await client.get(`/api/notebooks/${notebookId}/sources`)
    return data.sources || []
  },

  addUrlSource: async (notebookId, url) => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/sources/url`, { url })
    return data
  },

  addPdfSource: async (notebookId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await client.post(`/api/notebooks/${notebookId}/sources/pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  addYoutubeSource: async (notebookId, url) => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/sources/youtube`, { url })
    return data
  },

  addGithubSource: async (notebookId, url) => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/sources/github`, { url })
    return data
  },

  addTextSource: async (notebookId, title, content) => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/sources/text`, { title, content })
    return data
  },

  deleteSource: async (notebookId, sourceId) => {
    await client.delete(`/api/notebooks/${notebookId}/sources/${sourceId}`)
  },

  // Research - DEPRECATED: Now called directly from frontend via Tavily
  // Kept for backward compatibility only
  startResearch: async (notebookId, topic, depth = 'deep') => {
    console.warn('api.startResearch is deprecated. Use tavilySearch from @/lib/tavily instead')
    const { data } = await client.get(
      `/api/notebooks/${notebookId}/research`,
      { params: { topic, depth } }
    )
    return data
  },

  // Chat
  sendMessage: async (notebookId, message, model = 'gpt-4') => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/chat`, { message, model })
    return data
  },

  getChatHistory: async (notebookId) => {
    const { data } = await client.get(`/api/notebooks/${notebookId}/chat/history`)
    return data.messages || []
  },

  clearChatHistory: async (notebookId) => {
    await client.delete(`/api/notebooks/${notebookId}/chat/history`)
  },

  // Face-Off
  faceOff: async (notebookId, question, models = null) => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/faceoff`, { question, models })
    return data
  },

  // Avatar - DEPRECATED: Now called directly from frontend via Tavus
  // Kept for backward compatibility only
  createAvatarSession: async (notebookId) => {
    console.warn('api.createAvatarSession is deprecated. Use createTavusSession from @/lib/tavus instead')
    const { data } = await client.post(`/api/notebooks/${notebookId}/avatar/session`)
    return data
  },

  // Podcast
  generatePodcast: async (notebookId, format = 'deep_dive', length = 'medium') => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/podcast/generate`, { format, length })
    return data
  },

  // Outputs
  generateQuiz: async (notebookId) => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/outputs/quiz`)
    return data
  },

  generateStudyGuide: async (notebookId) => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/outputs/study-guide`)
    return data
  },

  generateFlashcards: async (notebookId) => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/outputs/flashcards`)
    return data
  },

  getOutputs: async (notebookId, type = null) => {
    const url = type 
      ? `/api/notebooks/${notebookId}/outputs?output_type=${type}`
      : `/api/notebooks/${notebookId}/outputs`
    const { data } = await client.get(url)
    return data
  },

  // Graph / Knowledge Graph
  getGraphStats: async (notebookId) => {
    const { data } = await client.get(`/api/notebooks/${notebookId}/graph/stats`)
    return data
  },

  getGraphData: async (notebookId) => {
    const { data } = await client.get(`/api/notebooks/${notebookId}/graph/data`)
    return data
  },

  buildGraph: async (notebookId, rebuild = false) => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/graph/build`, { rebuild })
    return data
  },

  queryGraph: async (notebookId, question, mode = 'mix') => {
    const { data } = await client.post(`/api/notebooks/${notebookId}/graph/query`, { question, mode })
    return data
  },

  deleteGraph: async (notebookId) => {
    const { data } = await client.delete(`/api/notebooks/${notebookId}/graph`)
    return data
  },
}
