import os
from openai import OpenAI
from flask import Flask, request, jsonify

# Initialize the OpenAI client with your API key
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)


@app.route("/api/generate-recipe", methods=["POST"])
def generate_recipe():
    data = request.get_json()
    prompt = data.get("prompt", "")

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    system_message = (
        "You are a creative chef. When given a prompt, generate a recipe formatted in markdown. The output must include:\n"
        "- A title as a level 1 header.\n"
        "- An 'Ingredients:' section as a level 4 header with a bullet list.\n"
        "- An 'Instructions:' section as a level 4 header with a numbered list.\n"
        "- A 'Tips:' section as a level 3 header with a bullet list.\n"
        "Ensure that the markdown headers are exactly as specified."
    )

    try:
        # Create a ChatCompletion request using OpenAI's API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
        )
        # Extract the generated recipe text
        recipe = response.choices[0].message.content.strip()
        print(f"Generated recipe: {recipe}")
        return jsonify({"recipe": recipe})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5001)
