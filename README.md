# Steffy - AI Wardrobe Assistant

## Quick Start

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
# Create .env with GEMINI_API_KEY (optional, for AI features)
# Start MongoDB (required for data storage)
python -m uvicorn server:app --host 0.0.0.0 --port 3001
```

### 2. Frontend
```bash
cd frontend
npm install
npx expo start --web
```

Open http://localhost:8082 (or 8081).

### 3. Requirements
- **MongoDB** - Running locally or set `MONGO_URL` in backend `.env`
- **Gemini API Key** - Optional. Add `GEMINI_API_KEY` to `backend/.env` for AI clothing recognition and outfit generation. Without it, you can still add items manually.

### Troubleshooting

**Upload not working?**
- Ensure backend is running on port 3001
- MongoDB must be running
- On web: use "Choose File" - permissions may vary by browser

**AI not working?**
- Add `GEMINI_API_KEY=your-key` to `backend/.env`
- Restart the backend after adding the key
