import logging
import litellm

from config import LLM_MODEL
from models import Recipe

logger = logging.getLogger(__name__)

RECIPE_SYSTEM_MESSAGE = """You are a creative chef with the precision and depth of recipes found on Serious Eats and the expertise of Chef J. Kenji López-Alt and Chef Chris Young.
When given a prompt, generate a recipe that is both detailed and practical, reflecting the thorough testing and clear instructions characteristic of those sources. Write with warmth and personality while maintaining technical accuracy.

FORMATTING GUIDELINES:
- Always include prep_time, cook_time, and servings
- Always include macros with estimated calories, protein, carbs, and fat per serving (as integers)
- Group ingredients logically (e.g., "For the filling", "For the sauce", "For serving") - use clear, descriptive group names
- Keep individual ingredients concise but include quantities and any prep notes in parentheses
- Write instructions as clear, actionable steps - start each with a verb
- Bold key techniques or temperatures within instructions using <strong> tags when helpful"""

UPDATE_SYSTEM_MESSAGE = "You are a creative chef who is skilled at editing recipes while preserving their original structure and style."


def generate_recipe_from_prompt(prompt: str) -> tuple[Recipe, dict]:
    """
    Generate a recipe from a user prompt.
    Returns (recipe, usage_info).
    """
    response = litellm.completion(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": RECIPE_SYSTEM_MESSAGE},
            {"role": "user", "content": prompt},
        ],
        max_tokens=2000,
        response_format=Recipe,
    )

    usage = response.usage
    logger.info(
        f"Token usage - Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens}"
    )

    recipe = Recipe.model_validate_json(response.choices[0].message.content)
    return recipe, {"prompt_tokens": usage.prompt_tokens, "completion_tokens": usage.completion_tokens}


def update_recipe_with_modifications(original_recipe: dict, modifications: str) -> tuple[Recipe, dict]:
    """
    Update an existing recipe based on modification instructions.
    Returns (updated_recipe, usage_info).
    """
    # Convert recipe dict to formatted string for the prompt
    original_recipe_str = (
        f"Title: {original_recipe.get('title', '')}\n\n"
        f"Description: {original_recipe.get('description', '')}\n\n"
        f"Ingredients:\n"
        + "\n".join(f"- {i}" for i in original_recipe.get("ingredients", []))
        + "\n\n"
        f"Instructions:\n"
        + "\n".join(
            f"{n+1}. {s}" for n, s in enumerate(original_recipe.get("instructions", []))
        )
        + "\n\n"
        f"Notes:\n" + "\n".join(f"- {n}" for n in original_recipe.get("notes", []))
    )

    update_prompt = (
        "Below is a recipe:\n\n"
        f"{original_recipe_str}\n\n"
        "Modify this recipe based on the following instructions, changing only the specified parts:\n\n"
        f"{modifications}"
    )

    response = litellm.completion(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": UPDATE_SYSTEM_MESSAGE},
            {"role": "user", "content": update_prompt},
        ],
        max_tokens=2000,
        response_format=Recipe,
    )

    usage = response.usage
    logger.info(
        f"Update token usage - Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens}"
    )

    updated_recipe = Recipe.model_validate_json(response.choices[0].message.content)
    return updated_recipe, {"prompt_tokens": usage.prompt_tokens, "completion_tokens": usage.completion_tokens}
