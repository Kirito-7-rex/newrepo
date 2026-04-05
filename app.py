from flask import Flask, request, jsonify, render_template
import pickle
import pandas as pd

app = Flask(__name__)

with open("model.pkl", "rb") as f:
    model = pickle.load(f)

@app.route("/")
def login():
    return render_template("index.html")

@app.route("/signup")
def signup():
    return render_template("signup.html")

@app.route("/otp")
def otp():
    return render_template("otp.html")

@app.route("/home")
def home():
    return render_template("home.html")

def encode(data):
    device = 1 if data["device"] == "Mobile" else 0
    location = 0 if data["location"] == "India" else 1

    loginCount = int(data["loginCount"])
    failedAttempts = int(data["failedAttempts"])

    time_str = data["time"]
    hour = int(time_str.split(":")[0])

    if "PM" in time_str and hour != 12:
        hour += 12
    if "AM" in time_str and hour == 12:
        hour = 0

    return pd.DataFrame([[device, location, loginCount, hour, failedAttempts]],
        columns=["device", "location", "loginCount", "hour", "failedAttempts"]
    )

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    input_data = encode(data)
    pred = model.predict(input_data)[0]
    return jsonify({"prediction": int(pred)})

if __name__ == "__main__":
    app.run(debug=True)
