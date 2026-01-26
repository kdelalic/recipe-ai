# RecipeLab - Project Context

RecipeLab is an AI-powered recipe generation application that allows users to generate recipes based on prompts/ingredients, save favorites, and share them.

## Architecture Overview

- **Frontend**: React 19 SPA with React Router v7, served via Vite
- **Backend**: Python FastAPI async API with LLM integration
- **Database**: Firebase Firestore (NoSQL)
- **Auth**: Firebase Authentication
- **AI**: LiteLLM for text generation, Google GenAI for images

## Design Philosophy

- **"Emerald & Slate"** color theme with glassmorphic UI elements
- **Mobile-first** responsive design with safe-area handling
- **Async-first** backend for optimal performance

## Module Context

@backend/GEMINI.md
@frontend/GEMINI.md
@firebase/GEMINI.md

## General Coding Guidelines

- Follow existing patterns in the codebase
- Keep functions small and focused
- Use descriptive variable and function names
- Handle errors gracefully with user-friendly messages

## Quick Start

```bash
# Backend (runs on :5001)
cd backend && uv run python app.py

# Frontend (runs on :5173)
cd frontend && bun run dev
```
