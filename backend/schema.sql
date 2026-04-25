-- Synapse Database Schema for InsForge

-- Notebooks table
CREATE TABLE IF NOT EXISTS notebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources table
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    summary TEXT,
    fulltext TEXT,
    credibility_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model TEXT,
    citations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outputs table
CREATE TABLE IF NOT EXISTS outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content JSONB NOT NULL,
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sources_notebook ON sources(notebook_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_notebook ON chat_messages(notebook_id);
CREATE INDEX IF NOT EXISTS idx_outputs_notebook ON outputs(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook_id);
