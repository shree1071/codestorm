# Synapse Backend

FastAPI backend for Synapse AI research notebook.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Set up InsForge database:
- Go to InsForge dashboard
- Run the SQL in `schema.sql` to create tables
- Get your INSFORGE_URL and INSFORGE_ANON_KEY
- Add them to .env

5. Run the server:
```bash
python -m uvicorn main:app --reload --port 8000
```

## API Endpoints

### Notebooks
- `POST /api/notebooks` - Create notebook
- `GET /api/notebooks` - List notebooks
- `GET /api/notebooks/{id}` - Get notebook
- `PUT /api/notebooks/{id}` - Update notebook
- `DELETE /api/notebooks/{id}` - Delete notebook

### Sources
- `POST /api/notebooks/{id}/sources/url` - Add URL source
- `POST /api/notebooks/{id}/sources/pdf` - Upload PDF
- `POST /api/notebooks/{id}/sources/youtube` - Add YouTube video
- `POST /api/notebooks/{id}/sources/text` - Add text
- `GET /api/notebooks/{id}/sources` - List sources
- `DELETE /api/notebooks/{id}/sources/{sid}` - Delete source

### Research Agent
- `POST /api/notebooks/{id}/research` - Start deep research (SSE stream)

### Chat
- `POST /api/notebooks/{id}/chat` - Send message
- `GET /api/notebooks/{id}/chat/history` - Get history
- `DELETE /api/notebooks/{id}/chat/history` - Clear history

### Face-Off
- `POST /api/notebooks/{id}/faceoff` - Multi-model comparison

### Avatar
- `POST /api/notebooks/{id}/avatar/session` - Create Tavus session

### Podcast
- `POST /api/notebooks/{id}/podcast/generate` - Generate podcast
- `GET /api/notebooks/{id}/podcast/audio/{filename}` - Stream audio

### Outputs
- `POST /api/notebooks/{id}/outputs/quiz` - Generate quiz
- `POST /api/notebooks/{id}/outputs/study-guide` - Generate study guide
- `POST /api/notebooks/{id}/outputs/flashcards` - Generate flashcards
- `GET /api/notebooks/{id}/outputs` - List outputs

## Deploy to Render

1. Create new Web Service on Render
2. Connect your GitHub repo
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from .env
6. Deploy!
