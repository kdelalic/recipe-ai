# Backend Context

## Tech Stack

- **Python 3.12+** with **FastAPI** (async)
- **Firebase Firestore** (async client)
- **LiteLLM** for text generation (default: `claude-sonnet-4-5`)
- **Google GenAI** for images (default: `gemini-2.5-flash-image`)
- **uv** for package management

## Structure

```
backend/
├── app.py             # Entry point, CORS, router mounting
├── models.py          # Pydantic models (Recipe, Macros, IngredientGroup)
├── routes/            # API endpoint handlers
├── services/
│   ├── llm.py         # LLM prompts and generation logic
│   ├── firebase.py    # Firestore client init
│   └── storage.py     # GCS image storage
└── pyproject.toml     # Dependencies
```

## Key Patterns

### Data Models
- `Recipe`: title, description, prep_time, cook_time, servings, macros, ingredients, instructions, notes
- `IngredientGroup`: Groups ingredients by purpose (e.g., "For the Marinade")
- `Macros`: Per-serving nutritional estimates

### Authentication
Firebase Admin SDK verifies tokens via FastAPI dependency injection in `auth.py`.

## Python Style Guide

- Use **type hints** for all function parameters and return values
- Use **async/await** for all I/O operations
- Use **Pydantic models** for request/response validation
- Follow **PEP 8** naming: `snake_case` for functions/variables, `PascalCase` for classes
- Keep route handlers thin; business logic goes in `services/`
- Use f-strings for string formatting

## Commands

```bash
uv run python app.py      # Start server (:5001, hot reload)
uv add <package>          # Add dependency
```
