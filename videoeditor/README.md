# AI Video Editor

Full-stack webová aplikace pro automatický AI střih videí.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Python 3.11+ + FastAPI
- **Video processing**: FFmpeg + PySceneDetect + pydub
- **AI analýza**: Anthropic Claude API (claude-sonnet-4-5, Vision)

## Spuštění

### Požadavky

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
apt install ffmpeg
```

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # doplň ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## API Endpoints

| Method | Path | Popis |
|--------|------|-------|
| POST | `/upload` | Nahraje video soubor |
| POST | `/analyze/{job_id}` | Spustí AI analýzu |
| GET | `/status/{job_id}` | Vrátí stav + segmenty |
| POST | `/export/{job_id}` | Provede FFmpeg střih |
| GET | `/download/{job_id}` | Stáhne výsledné video |
| GET | `/source/{job_id}` | Vrátí původní video pro náhled |

## Konfigurace (.env)

```
ANTHROPIC_API_KEY=sk-ant-...
UPLOAD_DIR=/tmp/videoeditor
MAX_FILE_SIZE_MB=500
FRAMES_PER_SECOND=0.5
SILENCE_THRESHOLD_DB=-14
MIN_SILENCE_MS=1500
```

## Poznámky

- Bez `ANTHROPIC_API_KEY` aplikace funguje jen s PySceneDetect + audio analýzou
- Velká videa (>100 MB) mohou trvat 1–3 minuty
- Dočasné soubory se ukládají do `/tmp/videoeditor/`
