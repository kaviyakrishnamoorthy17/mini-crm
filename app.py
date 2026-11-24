import os
import re

from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
from supabase import create_client

# Step 1: load the secret keys from the .env file
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Step 2: connect to the Supabase database
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = Flask(__name__)

VALID_STATUSES = ["New", "Contacted", "Converted"]
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


def error_response(message, status_code):
    # Every error goes back in the same JSON format
    return jsonify({"error": message}), status_code


def validate_lead(data, require_all_fields):
    # Returns an error message if something is wrong, otherwise None
    if data is None:
        return "No data was sent."

    required_fields = ["name", "email", "phone", "business_name"]

    # Check each field one by one
    for field in required_fields:
        if field in data:
            value = str(data[field]).strip()
            if value == "":
                return field.replace("_", " ").capitalize() + " cannot be empty."
        elif require_all_fields:
            return field.replace("_", " ").capitalize() + " is required."

    if "email" in data:
        if not re.match(EMAIL_PATTERN, str(data["email"]).strip()):
            return "Please enter a valid email address."

    if "phone" in data:
        digits_only = re.sub(r"\D", "", str(data["phone"]))
        if len(digits_only) < 7 or len(digits_only) > 15:
            return "Phone number must have 7 to 15 digits."

    if "status" in data:
        if data["status"] not in VALID_STATUSES:
            return "Status must be New, Contacted or Converted."

    return None


def clean_lead(data):
    # Keep only the allowed fields and trim spaces
    allowed_fields = ["name", "email", "phone", "business_name", "status"]
    cleaned = {}
    for field in allowed_fields:
        if field in data:
            cleaned[field] = str(data[field]).strip()
    return cleaned


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/leads", methods=["GET"])
def get_leads():
    try:
        search_text = request.args.get("search", "").strip()
        status_filter = request.args.get("status", "").strip()

        query = supabase.table("leads").select("*")

        # Filter by status if one was chosen
        if status_filter != "":
            query = query.eq("status", status_filter)

        # Search in name OR email
        if search_text != "":
            # remove characters that would break the filter text
            safe_text = search_text.replace(",", " ").replace("(", " ").replace(")", " ")
            query = query.or_("name.ilike.%" + safe_text + "%,email.ilike.%" + safe_text + "%")

        result = query.order("created_at", desc=True).execute()
        return jsonify(result.data), 200

    except Exception as error:
        print("Error in get_leads:", error)
        return error_response("Could not load leads. Please try again.", 500)


@app.route("/api/leads", methods=["POST"])
def add_lead():
    try:
        data = request.get_json(silent=True)

        problem = validate_lead(data, require_all_fields=True)
        if problem:
            return error_response(problem, 400)

        new_lead = clean_lead(data)
        if "status" not in new_lead:
            new_lead["status"] = "New"

        result = supabase.table("leads").insert(new_lead).execute()
        return jsonify(result.data[0]), 201

    except Exception as error:
        print("Error in add_lead:", error)
        return error_response("Could not add the lead. Please try again.", 500)


@app.route("/api/leads/<int:lead_id>", methods=["PUT"])
def update_lead(lead_id):
    try:
        data = request.get_json(silent=True)

        problem = validate_lead(data, require_all_fields=False)
        if problem:
            return error_response(problem, 400)

        changes = clean_lead(data)
        if len(changes) == 0:
            return error_response("Nothing to update.", 400)

        result = supabase.table("leads").update(changes).eq("id", lead_id).execute()

        if len(result.data) == 0:
            return error_response("Lead not found.", 404)

        return jsonify(result.data[0]), 200

    except Exception as error:
        print("Error in update_lead:", error)
        return error_response("Could not update the lead. Please try again.", 500)


@app.route("/api/leads/<int:lead_id>", methods=["DELETE"])
def delete_lead(lead_id):
    try:
        result = supabase.table("leads").delete().eq("id", lead_id).execute()

        if len(result.data) == 0:
            return error_response("Lead not found.", 404)

        return jsonify({"message": "Lead deleted."}), 200

    except Exception as error:
        print("Error in delete_lead:", error)
        return error_response("Could not delete the lead. Please try again.", 500)


@app.route("/api/stats", methods=["GET"])
def get_stats():
    try:
        result = supabase.table("leads").select("status").execute()

        total_leads = 0
        new_leads = 0
        converted_leads = 0

        # Count each lead with a simple loop
        for lead in result.data:
            total_leads = total_leads + 1
            if lead["status"] == "New":
                new_leads = new_leads + 1
            if lead["status"] == "Converted":
                converted_leads = converted_leads + 1

        return jsonify({
            "total": total_leads,
            "new": new_leads,
            "converted": converted_leads,
        }), 200

    except Exception as error:
        print("Error in get_stats:", error)
        return error_response("Could not load the numbers.", 500)


if __name__ == "__main__":
    app.run(debug=True)
