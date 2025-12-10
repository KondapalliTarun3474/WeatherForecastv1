from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from utils.logging import configure_logging
from auth import authenticate_user
from forecast import run_forecast

# --- NEW: Define the Application Version ---
APP_VERSION = "1.0.0" 

app = Flask(__name__)
CORS(app)
configure_logging(app)

@app.route("/health")
def health():
    return jsonify({"status": "up"}), 200

# --- NEW: Version Endpoint ---
@app.route("/version")
def version():
    """Returns the application version for the Frontend to display."""
    return jsonify({"version": APP_VERSION}), 200

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    if authenticate_user(data.get("username"), data.get("password")):
        return jsonify({"message": "login success"}), 200
    return jsonify({"error": "invalid credentials"}), 401

@app.route("/forecast", methods=["POST"])
def forecast():
    payload = request.json
    try:
        result = run_forecast(
            lat=payload["lat"],
            lon=payload["lon"],
            param=payload.get("property", "T2M")
        )
        return jsonify(result), 200
    except Exception as e:
        app.logger.error(f"Forecast error: {str(e)}")
        return jsonify({"error": str(e)}), 500
        
@app.route("/heatmap", methods=["POST"])
def heatmap():
    """
    Returns a 10x10 grid of temperature values around the given lat/lon.
    The grid covers ±1 degree around the input coordinates.
    """
    payload = request.json
    center_lat = float(payload["lat"])
    center_lon = float(payload["lon"])

    grid_size = 10
    step = 0.2   # 10 points → 2 degree span

    points = []

    for i in range(grid_size):
        for j in range(grid_size):
            lat = center_lat - 1 + i * step
            lon = center_lon - 1 + j * step

            # Call your existing forecasting function:
            try:
                result = run_forecast(lat=lat, lon=lon, param="T2M")
                temp = float(result[0]["value"])
            except:
                temp = None

            points.append({
                "lat": lat,
                "lon": lon,
                "temp": temp
            })

    return jsonify({"grid": points}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
