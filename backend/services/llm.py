import logging

import litellm

from config import LLM_MODEL
from models import Recipe

logger = logging.getLogger(__name__)

RECIPE_SYSTEM_MESSAGE = """You are a culinary expert and food scientist with the precision of a test kitchen chef.
Your recipes should rely on technique, food science, and clear, descriptive instructions.

Write with the authority and explanatory style of J. Kenji López-Alt or a Serious Eats guide.
- Explain the "WHY" behind key steps.
- Use precise visual and sensory cues.
- Suggest specific techniques to improve the final result.

Follow the schema structure exactly for formatting."""

UPDATE_SYSTEM_MESSAGE = """You are a meticulous test kitchen editor. Your goal is to modify the provided recipe according to the user's request while STRICTLY preserving the original recipe's voice, formatting, and scientific precision.

- Do NOT summarize or shorten unchanged sections.
- When changing ingredients, ensure quantities and techniques are adjusted to match.
- If the modification affects the cooking method (e.g., frying to baking), rewrite the relevant instructions completely with proper timings and visual cues.
"""


async def generate_recipe_from_prompt(
    prompt: str,
    complexity: str = "standard",
    diet: str = "standard",
    time: str = "any",
    servings: str = "standard",
) -> tuple[Recipe, dict]:
    """
    Generate a recipe from a user prompt with modifiers.
    Returns (recipe, usage_info).
    """
    
    modifiers = []
    if complexity != "standard":
        modifiers.append(f"Complexity Level: {complexity}")
    if diet != "standard":
        modifiers.append(f"Dietary Restriction: {diet}")
    if time != "any":
        modifiers.append(f"Time Constraint: {time}")
    if servings != "standard":
        modifiers.append(f"Target Servings: {servings}")
        
    system_msg = RECIPE_SYSTEM_MESSAGE
    
    # Construct a rich user prompt
    full_prompt = f"Request: {prompt}\n"
    if modifiers:
        full_prompt += "\nConstraints & Preferences:\n" + "\n".join(f"- {m}" for m in modifiers)
    
    full_prompt += "\n\nPlease create a detailed, step-by-step recipe following the system guidelines."

    response = await litellm.acompletion(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": full_prompt},
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


async def update_recipe_with_modifications(original_recipe: dict, modifications: str) -> tuple[Recipe, dict]:
    """
    Update an existing recipe based on modification instructions.
    Returns (updated_recipe, usage_info).
    """
    # Convert recipe dict to formatted string for the prompt
    original_recipe_str = (
        f"Title: {original_recipe.get('title', '')}\n"
        f"Description: {original_recipe.get('description', '')}\n\n"
        f"Ingredients:\n"
        + "\n".join(f"- {i}" for i in original_recipe.get("ingredients", []))
        + "\n\n"
        "Instructions:\n"
        + "\n".join(
            f"{n+1}. {s}" for n, s in enumerate(original_recipe.get("instructions", []))
        )
        + "\n\n"
        "Notes:\n" + "\n".join(f"- {n}" for n in original_recipe.get("notes", []))
    )

    update_prompt = (
        "ORIGINAL RECIPE:\n"
        "================\n"
        f"{original_recipe_str}\n"
        "================\n\n"
        "MODIFICATION REQUEST:\n"
        f"{modifications}\n\n"
        "Please rewrite the recipe to incorporate these changes. Keep the rest of the recipe consistent with the original style."
    )

    response = await litellm.acompletion(
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
