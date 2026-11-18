import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.metrics import classification_report

df = pd.read_csv("data/archive.csv").dropna()
print("Class counts:\n", df["generated"].value_counts())

X_train, X_test, y_train, y_test = train_test_split(
    df["text"], df["generated"],
    test_size=0.2, random_state=42, stratify=df["generated"]
)

model = make_pipeline(
    TfidfVectorizer(ngram_range=(1, 2), max_features=50000, sublinear_tf=True),
    LogisticRegression(max_iter=1000),
)
model.fit(X_train, y_train)

print(classification_report(y_test, model.predict(X_test)))
joblib.dump(model, "model.joblib")
print("Saved model.joblib")