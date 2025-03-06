import os
import datetime
import re
from openai import OpenAI
from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore
from firebase_admin import auth as firebase_auth
from google.cloud.firestore_v1.base_query import FieldFilter
from dotenv import load_dotenv
from flask_cors import CORS
from pydantic import BaseModel
from typing import List

load_dotenv()

# Initialize Firebase Admin with your service account key
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)

frontend_urls = os.getenv("FRONTEND_URLS", "http://localhost:5173").split(",")
CORS(
    app,
    resources={r"/api/*": {"origins": frontend_urls + ["http://localhost:5173"]}},
)


class Recipe(BaseModel):
    title: str
    description: str
    ingredients: List[str]
    instructions: List[str]
    notes: List[str]


def get_uid_from_request(request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None, jsonify({"error": "Authorization header missing"}), 401
    token = auth_header.split("Bearer ")[-1]
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        uid = decoded_token["uid"]
        return uid, None, None
    except Exception as e:
        return None, jsonify({"error": "Invalid token: " + str(e)}), 401


@app.route("/api/generate-recipe", methods=["POST"])
def generate_recipe():
    uid, error_response, status_code = get_uid_from_request(request)
    if error_response:
        return error_response, status_code

    data = request.get_json()
    print(f"Request body: {data}")
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    system_message = """You are a creative chef with the precision and depth of recipes found on Serious Eats and the expertise of Kenji J. Alt-Lopez. 
When given a prompt, generate a recipe that is both detailed and practical, reflecting the thorough testing and clear instructions characteristic of those sources."""

    try:
        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1000,
            response_format=Recipe,
        )

        print(f"Response: {response.to_json()}")

        recipe = response.choices[0].message.parsed
        recipe_dict = recipe.model_dump()

        # Save the generated recipe into Firestore
        recipe_data = {
            "uid": uid,
            "prompt": prompt,
            "recipe": recipe_dict,
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "archived": False,
        }
        # 'add' returns a tuple (update_time, doc_ref)
        _, doc_ref = db.collection("recipes").add(recipe_data)
        return jsonify({"recipe": recipe_dict, "id": doc_ref.id})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/update-recipe", methods=["POST"])
def update_recipe():
    data = request.get_json()
    recipe_id = data.get("id")
    original_recipe = data.get("original_recipe", "")
    modifications = data.get("modifications", "")

    if not recipe_id or not original_recipe or not modifications:
        return (
            jsonify(
                {"error": "Recipe ID, original recipe, and modifications are required"}
            ),
            400,
        )

    uid, error_response, status_code = get_uid_from_request(request)
    if error_response:
        return error_response, status_code

    doc_ref = db.collection("recipes").document(recipe_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "Recipe not found"}), 404
    data_doc = doc.to_dict()

    # Check if the recipe belongs to the current user
    if data_doc.get("uid") != uid:
        return jsonify({"error": "Unauthorized access"}), 403

    # Build a prompt that instructs the model to update the recipe while preserving its original structure.
    update_prompt = (
        "Below is a recipe:\n\n"
        f"{original_recipe}\n\n"
        "Modify this recipe based on the following instructions, changing only the specified parts:\n\n"
        f"{modifications}"
    )

    try:
        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a creative chef who is skilled at editing recipes while preserving their original structure and style.",
                },
                {"role": "user", "content": update_prompt},
            ],
            max_tokens=1000,
            response_format=Recipe,
        )

        print(f"Response: {response.to_json()}")

        updated_recipe = response.choices[0].message.parsed
        updated_recipe_dict = updated_recipe.model_dump()

        # Update the existing document in Firestore with the new recipe content.
        doc_ref = db.collection("recipes").document(recipe_id)
        doc_ref.update(
            {
                "recipe": updated_recipe_dict,
                "timestamp": datetime.datetime.now(
                    datetime.timezone.utc
                ),  # Update timestamp as well.
            }
        )

        return jsonify({"recipe": updated_recipe_dict})
    except Exception as e:
        print(f"Error updating recipe: {e}")
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
        uid = data.get("uid", "")
        timestamp = data.get("timestamp", "")
        user = firebase_auth.get_user(uid)
        displayName = user.display_name if user.display_name else ""
        return jsonify(
            {
                "recipe": recipe,
                "timestamp": timestamp,
                "uid": uid,
                "displayName": displayName,
            }
        )
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/recipe-history", methods=["GET"])
def get_recipe_history():
    uid, error_response, status_code = get_uid_from_request(request)
    if error_response:
        return error_response, status_code

    try:
        recipes_ref = (
            db.collection("recipes")
            .where(filter=FieldFilter("uid", "==", uid))
            .where(filter=FieldFilter("archived", "==", False))
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
        )
        docs = recipes_ref.stream()
        history = []
        for doc in docs:
            data = doc.to_dict()
            history.append(
                {
                    "id": doc.id,
                    "recipe": data.get("recipe", ""),
                }
            )
        return jsonify({"history": history})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/recipe/<recipe_id>/archive", methods=["PATCH"])
def archive_recipe(recipe_id):
    uid, error_response, status_code = get_uid_from_request(request)
    if error_response:
        return error_response, status_code

    try:
        doc_ref = db.collection("recipes").document(recipe_id)
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"error": "Recipe not found"}), 404
        data = doc.to_dict()
        if data.get("uid") != uid:
            return jsonify({"error": "Unauthorized access"}), 403

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


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5001)
