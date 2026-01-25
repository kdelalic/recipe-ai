# RecipeLab - Project Context for Agents

This file provides context for AI agents working on the RecipeLab project. It outlines the architecture, tech stack, and development workflows.

## 1. Project Overview
RecipeLab is an AI-powered recipe generation application. It allows users to generate recipes based on prompts/ingredients, save favorites, and share them.

## 2. Tech Stack

### Backend
- **Language**: Python 3.x
- **Framework**: FastAPI (Async)
- **Database**: Firebase Firestore (Async)
- **AI/LLM**: 
  - **Text**: `litellm` used to interface with models (Default: `claude-sonnet-4-5`).
  - **Images**: Google GenAI (`google.genai`) used for image generation (Default: `gemini-2.5-flash-image`).
- **Storage**: Google Cloud Storage (for generated images).
- **Package Manager**: uv
- **Entry Point**: `backend/app.py`

### Frontend
- **Framework**: React 19 (Vite)
- **Routing**: react-router-dom v7
- **Styling**: CSS Modules / Standard CSS (located in `frontend/src/styles`)
- **State/HTTP**: Axios with Firebase Auth interceptors (`frontend/src/utils/api.js`)
- **Build Tool**: Vite

## 3. Project Structure
```
/
├── backend/
│   ├── app.py             # Main application entry point & startup logic
│   ├── config.py          # Configuration & Environment Variables
│   ├── routes/            # API Endpoints
│   │   ├── recipes.py     # Recipe generation & management endpoints
│   │   ├── images.py      # Image generation endpoints
│   │   └── ...
│   ├── services/          # Business logic & external services
│   │   ├── llm.py         # LLM interaction & System Prompts
│   │   ├── firebase.py    # Firestore initialization
│   │   └── storage.py     # GCS image handling
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/         # React page components
│   │   ├── components/    # Reusable UI components
│   │   ├── styles/        # Shared CSS files
│   │   ├── utils/         # Helpers & API client (api.js)
│   │   └── App.jsx        # Root component
│   └── package.json       # Node dependencies
└── gemini.md              # This file
```

## 4. Key Considerations for Agents

### AI Implementation
- **Recipe Generation**: Logic resides in `backend/services/llm.py`. It uses `litellm` to call the configured model. System prompts are defined at the top of this file.
- **Image Generation**: handled in `backend/routes/images.py`. It requires `ENABLE_IMAGE_GENERATION=true` and a valid `GOOGLE_API_KEY`.
- **Environment Variables**:
  - `LLM_MODEL`: The LLM model name (default: `claude-sonnet-4-5`).
  - `GEMINI_IMAGE_MODEL`: The image model name (default: `gemini-2.5-flash-image`).
  - `GOOGLE_API_KEY`: Required for Gemini/Google models.
  - `ENABLE_IMAGE_GENERATION`: Feature flag to toggle image generation.

### Authentication
- **Frontend**: Uses Firebase Auth SDK. The `api.js` utility automatically attaches the ID token to requests via an interceptor.
- **Backend**: Verifies Firebase tokens using `firebase-admin`. The `auth.py` module handles dependency injection for `get_current_user`.

### Styling
- This project allows standard CSS import. 
- Check `frontend/src/styles` for existing global styles and variables before creating new ones.

## 5. Development Workflow

### Running the Backend
Navigate to the `backend` directory:
```bash
uv run python app.py
```
Server runs at `http://localhost:5001` (by default).
Hot reload is enabled by default.

### Running the Frontend
Navigate to the `frontend` directory:
```bash
bun run dev
```
Dev server runs at `http://localhost:5173`.

### Production Build
The backend is configured to serve the frontend static files from `frontend/dist`.
1. Build frontend: `cd frontend && bun run build`
2. Run backend: `cd backend && uv run python app.py`

### Installing Dependencies
Make sure to install the latest compatible versions of any new packages in both the frontend and backend.
