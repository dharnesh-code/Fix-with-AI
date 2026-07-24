# Fix With AI

A home repair assistant. Upload a photo + description of a plumbing, carpentry, or
electronics/appliance problem — get back a diagnosis, risk level, required tools,
precautions, a step-by-step repair guide, an interactive flowchart, and a follow-up chatbot.

- **Backend:** Python (FastAPI) + Google Gemini API
- **Frontend:** React (Vite) + react-flow

---

## 1. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# open .env and paste your Gemini API key into GEMINI_API_KEY

uvicorn main:app --reload --port 8000
```

Backend will run at `http://localhost:8000`. Check `http://localhost:8000/api/health`.

Get a Gemini API key at https://aistudio.google.com/apikey if you don't have one yet.

## 2. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install

cp .env.example .env
# defaults to http://localhost:8000, only change if your backend runs elsewhere

npm run dev
```

Frontend will run at `http://localhost:5173`. Open it in your browser.

## 3. Using it

1. Upload a photo of the issue and describe what's happening.
2. Click "Diagnose the problem."
3. Review the diagnosis card, risk level, and precautions.
4. Switch tabs to see the step-by-step guide, the flowchart, the tools checklist,
   or ask a follow-up question in the chat tab.

## Project structure

```
fix-with-ai/
├── backend/
│   ├── main.py            # FastAPI app + routes
│   ├── gemini_client.py   # Gemini API calls (diagnosis + chat)
│   ├── prompts.py         # System prompts sent to Gemini
│   ├── schemas.py         # Pydantic response models
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── index.css
    │   └── components/
    │       ├── UploadPanel.jsx
    │       ├── DiagnosisCard.jsx
    │       ├── PrecautionsBanner.jsx
    │       ├── StepGuide.jsx
    │       ├── ToolsChecklist.jsx
    │       ├── FlowchartView.jsx
    │       └── ChatWindow.jsx
    ├── index.html
    ├── package.json
    └── .env.example
```

## Notes

- Sessions (diagnosis + chat history) are stored in memory in the backend — they reset when
  the server restarts. Swap `SESSIONS` in `main.py` for Redis or a database for production use.
- The Gemini prompt in `prompts.py` explicitly routes anything involving gas lines, main
  electrical panels, or structural damage to "call a professional" instead of DIY steps —
  keep this rule if you extend the prompt.
- Never put your Gemini API key in the frontend — it always stays server-side in `backend/.env`.

## Next steps you could add

- User accounts + saved repair history (there's already a `/api/history/{session_id}` stub)
- Image compression on upload for faster responses
- A local reference library of common fixes as an offline fallback
