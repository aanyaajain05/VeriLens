import joblib

model = joblib.load("model.joblib")

samples = [
    "Artificial intelligence, a transformative force in modern society, continues to reshape industries and redefine the boundaries of human potential.",
    "ok so i went to the market yesterday and they had no tomatoes, which was annoying because i wanted to make pasta",
    "The mitochondria is the powerhouse of the cell, and it plays a crucial role in energy production.",
    "my teacher gave us homework again lol, i literally have 3 assignments due friday",
]

for s in samples:
    p = model.predict_proba([s])[0][1]
    print(f"{p:.2f} AI-probability | {s[:70]}")