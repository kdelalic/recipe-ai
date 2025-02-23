import os
import datetime
import re
from openai import OpenAI
from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

# Initialize Firebase Admin with your service account key
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
CORS(app, resources={r"/api/*": {"origins": [frontend_url, "http://localhost:5173"]}})


@app.route("/api/generate-recipe", methods=["POST"])
def generate_recipe():
    data = request.get_json()
    print(f"Request body: {data}")
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    system_message = """You are a creative chef with the precision and depth of recipes found on Serious Eats and the expertise of Kenji J. Alt-Lopez. 
When given a prompt, generate a recipe that is both detailed and practical, reflecting the thorough testing and clear instructions characteristic of those sources. 
In addition to the title, include a short description immediately below the title that summarizes the dish.

The output must include:
- A title as a level 1 header.
- A short description immediately under the title.
- An 'Ingredients:' section as a level 2 header with a bullet list.
- An 'Instructions:' section as a level 2 header with a numbered list.
- A 'Notes:' section as a level 2 header with a bullet list.

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
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "archived": False,
        }
        # 'add' returns a tuple (update_time, doc_ref)
        _, doc_ref = db.collection("recipes").add(recipe_data)
        return jsonify({"recipe": recipe, "id": doc_ref.id})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/recipe/<recipe_id>", methods=["GET"])
def get_recipe(recipe_id):
    try:
        doc_ref = db.collection("recipes").document(recipe_id)
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"error": "Recipe not found"}), 404
        data = doc.to_dict()
        recipe = data.get("recipe", "")
        timestamp = data.get("timestamp", "")
        return jsonify({"recipe": data.get("recipe", ""), "timestamp": timestamp})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/recipe-history", methods=["GET"])
def get_recipe_history():
    try:
        recipes_ref = (
            db.collection("recipes")
            .where("archived", "==", False)
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
        )
        docs = recipes_ref.stream()
        history = []
        for doc in docs:
            data = doc.to_dict()
            match = re.search(r"^# (.*)", data.get("recipe", ""), re.MULTILINE)
            title = match.group(1).strip() if match else "Recipe"
            history.append(
                {
                    "id": doc.id,
                    "title": title,
                    "recipe": data.get("recipe", ""),
                }
            )
        return jsonify({"history": history})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/recipe/<recipe_id>/archive", methods=["PATCH"])
def archive_recipe(recipe_id):
    try:
        doc_ref = db.collection("recipes").document(recipe_id)
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"error": "Recipe not found"}), 404

        doc_ref.update(
            {
                "archived": True,
                "archivedAt": datetime.datetime.now(datetime.timezone.utc),
            }
        )
        return jsonify({"message": "Recipe archived successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/generate-image", methods=["POST"])
def generate_image():
    enable_flag = os.getenv("ENABLE_IMAGE_GENERATION", "false").lower() == "true"
    if not enable_flag:
        return jsonify({"error": "Image generation feature is disabled."}), 403

    data = request.get_json()
    # Log the body
    print(data)
    recipe_text = data.get("recipe", "")
    if not recipe_text:
        return jsonify({"error": "No recipe provided"}), 400

    # Build an image prompt using the entire recipe text
    image_prompt = (
        f"Generate a realistic, high-quality photo of the dish described in the following recipe:\n\n"
        f"{recipe_text}\n\n"
        "The image should capture the dish's essence with appealing plating and a gourmet presentation."
    )

    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=image_prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        image_url = response.data[0].url
        print(f"Generated image: {image_url}")
        return jsonify({"image_url": image_url})
    except Exception as e:
        print(f"Error generating image: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5001)
