import os
import datetime
from openai import OpenAI
from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin with your service account key
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)


@app.route("/api/generate-recipe", methods=["POST"])
def generate_recipe():
    data = request.get_json()
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    system_message = """You are a creative chef. When given a prompt, generate a recipe formatted in markdown. Be concise.
The output must include:
- A title as a level 1 header.
- An 'Ingredients:' section as a level 4 header with a bullet list.
- An 'Instructions:' section as a level 4 header with a numbered list.
- A 'Notes:' section as a level 3 header with a bullet list.
Ensure that the markdown headers are exactly as specified."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
        )
        recipe = response.choices[0].message.content.strip()
        print(f"Generated recipe: {recipe}")

        # Save the generated recipe into Firestore
        recipe_data = {
            "prompt": prompt,
            "recipe": recipe,
            "timestamp": datetime.datetime.utcnow(),
        }
        db.collection("recipes").add(recipe_data)
        return jsonify({"recipe": recipe})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/recipe-history", methods=["GET"])
def get_recipe_history():
    try:
        recipes_ref = db.collection("recipes").order_by(
            "timestamp", direction=firestore.Query.DESCENDING
        )
        docs = recipes_ref.stream()
        history = []
        for doc in docs:
            data = doc.to_dict()
            # Extract the title using a simple approach (assuming the title is the first line starting with "# ")
            import re

            match = re.search(r"^# (.*)", data.get("recipe", ""), re.MULTILINE)
            title = match.group(1).strip() if match else "Recipe"
            history.append({"title": title, "recipe": data.get("recipe", "")})
        return jsonify({"history": history})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5001)
