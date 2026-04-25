# Synapse Frontend

Next.js frontend for Synapse AI research notebook.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your backend URL
```

3. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

### Home Page
- List all notebooks
- Create new notebook
- Clean, modern UI inspired by NotebookLM

### Notebook Page (6 Tabs)

#### 1. Research Tab
- Deep Research Agent with live SSE streaming
- Shows thinking steps in real-time
- Auto-populates sources with credibility scores
- Depth selector: Quick / Deep / Expert

#### 2. Sources Tab
- Add sources manually (URL, PDF, YouTube, Text)
- View all sources with summaries
- Delete sources
- Credibility scoring

#### 3. Chat Tab
- Context-aware chat with all sources
- Citations in responses
- Model selector (GPT-4, Claude, Gemini)
- Chat history

#### 4. Face-Off Tab
- Ask one question, get 3 answers simultaneously
- Three-column layout (GPT-4, Claude, Gemini)
- Agreement/Disagreement analysis panel
- Color-coded responses

#### 5. Avatar Tab
- Create Tavus video conversation session
- Talk face-to-face with AI expert
- Expert has full context of all sources
- Real-time video conversation

#### 6. Outputs Tab
- Generate Podcast (real audio with TTS)
- Generate Quiz (10 MCQ questions)
- Generate Study Guide (structured sections)
- Generate Flashcards (20 cards)

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS 3.4
- shadcn/ui components
- Axios for API calls
- Lucide React icons

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variable: `NEXT_PUBLIC_API_URL`
4. Deploy!

## Project Structure

```
src/
├── app/
│   ├── layout.jsx          # Root layout
│   ├── page.jsx            # Home page
│   ├── globals.css         # Global styles
│   └── notebook/[id]/
│       └── page.jsx        # Notebook detail page
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── research/           # Research panel
│   ├── sources/            # Sources panel
│   ├── chat/               # Chat panel
│   ├── faceoff/            # Face-off panel
│   ├── avatar/             # Avatar panel
│   └── outputs/            # Outputs panel
└── lib/
    ├── api.js              # API client
    └── utils.js            # Utilities
```
