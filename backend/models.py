from typing import List, Optional

from pydantic import BaseModel, Field


class IngredientGroup(BaseModel):
    group_name: str = Field(
        description="Name of the ingredient group, e.g., 'For the filling', 'For the sauce'"
    )
    items: List[str] = Field(description="List of ingredients in this group")


class Macros(BaseModel):
    calories: int = Field(description="Estimated calories per serving")
    protein: int = Field(description="Estimated protein in grams per serving")
    carbs: int = Field(description="Estimated carbohydrates in grams per serving")
    fat: int = Field(description="Estimated fat in grams per serving")


class Recipe(BaseModel):
    title: str
    description: str
    prep_time: str = Field(
        default="", description="Preparation time, e.g., '30 minutes'"
    )
    cook_time: str = Field(default="", description="Cooking time, e.g., '1 hour'")
    servings: str = Field(
        default="", description="Number of servings, e.g., '4-6 servings'"
    )
    macros: Optional[Macros] = Field(
        default=None, description="Estimated macronutrients per serving"
    )
    ingredients: List[IngredientGroup] = Field(
        description="Ingredients organized by group"
    )
    instructions: List[str]
    notes: List[str] = []


class RecipeRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000)


class UpdateRecipeRequest(BaseModel):
    id: str = Field(..., min_length=10, max_length=100)
    original_recipe: Recipe
    modifications: str = Field(..., min_length=1, max_length=1000)
