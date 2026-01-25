from typing import List, Optional

from pydantic import BaseModel, Field


class IngredientGroup(BaseModel):
    group_name: str = Field(
        description="Name of the ingredient group, e.g., 'For the Marinade', 'For the Salad'"
    )
    items: List[str] = Field(
        description="List of ingredients in this group. Include precise metrics and prep notes (e.g., '1 cup (150g) all-purpose flour')."
    )


class Macros(BaseModel):
    calories: int = Field(description="Estimated calories per serving")
    protein: int = Field(description="Estimated protein in grams per serving")
    carbs: int = Field(description="Estimated carbohydrates in grams per serving")
    fat: int = Field(description="Estimated fat in grams per serving")


class Recipe(BaseModel):
    title: str = Field(description="Descriptive and appetizing title for the dish.")
    description: str = Field(
        description="A short, engaging headnote explaining the dish and what makes it special. "
        "Write with the authority and explanatory style of J. Kenji López-Alt or a Serious Eats guide."
    )
    prep_time: str = Field(
        default="", description="Preparation time, e.g., '30 minutes'"
    )
    cook_time: str = Field(default="", description="Cooking time, e.g., '1 hour'")
    servings: str = Field(
        default="", description="Number of servings, e.g., '4-6 servings'"
    )
    macros: Optional[Macros] = Field(
        default=None, description="Estimated macronutrients per serving (provide realistic estimates)"
    )
    ingredients: List[IngredientGroup] = Field(
        description="Ingredients organized by group (e.g., Main, Sauce, Garnish). "
        "Each item must be precise."
    )
    instructions: List[str] = Field(
        description="Step-by-step cooking instructions. "
        "1. Numbered, clear, and actionable. "
        "2. Start with a strong verb. "
        "3. **Bold** key temperatures, times, and crucial visual cues using <strong> tags. "
        "4. Include short explanatory parentheticals for complex steps to teach the user *why* they are doing it (e.g., 'Salting the water assumes...')."
    )
    notes: List[str] = Field(
        default=[],
        description="Chef's notes, specific techniques to improve the result, or serving suggestions."
    )


class RecipeRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000)
    complexity: str = Field("standard", pattern="^(simple|standard|fancy)$")
    diet: str = Field("standard", pattern="^(standard|high protein|low calorie|low fat|low carb|junk)$")
    time: str = Field("any", pattern="^(any|quick|medium|slow)$")
    servings: str = Field("standard", pattern="^(standard|single|pair|party)$")


class UpdateRecipeRequest(BaseModel):
    id: str = Field(..., min_length=10, max_length=100)
    original_recipe: Recipe
    modifications: str = Field(..., min_length=1, max_length=1000)


class GenerateImageRequest(BaseModel):
    recipe: dict = Field(default_factory=dict)
    recipe_id: str = ""


class AddFavoriteRequest(BaseModel):
    title: str = ""


class PreferencesUpdate(BaseModel):
    imageGenerationEnabled: bool = True


# Response Models


class GenerateRecipeResponse(BaseModel):
    recipe: Recipe
    id: str


class UpdateRecipeResponse(BaseModel):
    recipe: Recipe


class GetRecipeResponse(BaseModel):
    recipe: Recipe
    image_url: str = ""
    timestamp: str = ""
    uid: str
    displayName: str = ""
    prompt: Optional[str] = None


class RecipeHistoryItem(BaseModel):
    id: str
    title: str
    timestamp: str = ""


class RecipeHistoryResponse(BaseModel):
    history: List[RecipeHistoryItem]
    offset: int
    limit: int


class MessageResponse(BaseModel):
    message: str


# Image Response Models


class GenerateImageResponse(BaseModel):
    image_url: str


# Favorites Models


class FavoriteItem(BaseModel):
    id: str
    title: str = ""


class FavoritesResponse(BaseModel):
    favorites: List[FavoriteItem]
    favoriteIds: List[str]


# Preferences Models


class Preferences(BaseModel):
    imageGenerationEnabled: bool = True


class PreferencesResponse(BaseModel):
    preferences: Preferences


# Health Models


class ServicesStatus(BaseModel):
    app: str = "ok"
    firebase: str = "ok"
    gemini: str = "ok"


class HealthResponse(BaseModel):
    status: str
    services: ServicesStatus
