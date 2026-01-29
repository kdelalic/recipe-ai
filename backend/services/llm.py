import asyncio
import logging

import litellm

from config import LLM_MODEL, MOCK_MODE
from models import IngredientGroup, Recipe

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
    if MOCK_MODE:
        logger.info("MOCK_MODE enabled: Returning mock recipe")
        await asyncio.sleep(1.5)
        mock_recipe = Recipe(
            title="Mock Spaghetti Carbonara",
            description="A classic Roman pasta dish made with eggs, hard cheese, cured pork, and black pepper. This is a mock recipe for testing.",
            prep_time="15 minutes",
            cook_time="20 minutes",
            servings="4",
            macros={"calories": 650, "protein": 25, "carbs": 70, "fat": 30},
            ingredients=[
                IngredientGroup(
                    group_name="Main",
                    items=[
                        "400g spaghetti",
                        "200g guanciale or pancetta, cubed",
                        "100g Pecorino Romano, grated",
                    ],
                ),
                IngredientGroup(
                    group_name="Sauce",
                    items=[
                        "4 large eggs",
                        "Freshly ground black pepper",
                    ],
                ),
            ],
            instructions=[
                "Bring a large pot of salted water to a <strong>boil</strong>.",
                "Cook the spaghetti until <strong>al dente</strong>.",
                "Meanwhile, fry the guanciale/pancetta over <strong>medium heat</strong> until <strong>crispy</strong>.",
                "Whisk eggs and cheese together in a bowl with plenty of pepper.",
                "Drain pasta, reserving some water. Toss pasta with pork fat.",
                "Remove from heat and quickly mix in the egg mixture to create a <strong>creamy sauce</strong>.",
                "Serve immediately with more cheese and pepper.",
            ],
            notes=[
                "Do not scramble the eggs! Remove pan from heat before adding.",
                "Use high quality cheese for best results.",
            ],
        )
        return mock_recipe, {"prompt_tokens": 0, "completion_tokens": 0}

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
    if MOCK_MODE:
        logger.info("MOCK_MODE enabled: Returning mock updated recipe")
        await asyncio.sleep(1.5)
        # Just return the original recipe with a slight modification to title for proof
        original_recipe_obj = Recipe(**original_recipe) if isinstance(original_recipe, dict) else original_recipe
        if hasattr(original_recipe_obj, "title"):
            original_recipe_obj.title += " (Modified)"
        return original_recipe_obj, {"prompt_tokens": 0, "completion_tokens": 0}

    # Convert recipe dict to formatted string for the prompt
    original_recipe_str = (
        f"Title: {original_recipe.get('title', '')}\n"
        f"Description: {original_recipe.get('description', '')}\n\n"
        f"Ingredients:\n" + "\n".join(f"- {i}" for i in original_recipe.get("ingredients", [])) + "\n\n"
        "Instructions:\n"
        + "\n".join(f"{n + 1}. {s}" for n, s in enumerate(original_recipe.get("instructions", [])))
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
