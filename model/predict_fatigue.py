"""
Read JSON from stdin: {"features": [f0, f1, f2]}
Print JSON: prediction, per-class probabilities, raw sklearn output.
"""
from __future__ import annotations

import json
import os
import sys
import warnings

import joblib
import numpy as np

warnings.filterwarnings("ignore")

ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ROOT, "fatigue_model.pkl")


def main() -> None:
    raw = sys.stdin.read()
    if not raw.strip():
        print(json.dumps({"ok": False, "error": "empty stdin"}))
        sys.exit(1)

    try:
        obj = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"ok": False, "error": f"invalid json: {e}"}))
        sys.exit(1)

    feats = obj.get("features")
    if not isinstance(feats, list) or len(feats) != 3:
        print(json.dumps({"ok": False, "error": "expected features array of length 3"}))
        sys.exit(1)

    try:
        X = np.array([feats], dtype=np.float64)
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(1)

    try:
        model = joblib.load(MODEL_PATH)
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"model load failed: {e}"}))
        sys.exit(1)

    pred = int(model.predict(X)[0])
    proba = model.predict_proba(X)[0]
    classes = [int(c) for c in model.classes_]

    out = {
        "ok": True,
        "prediction": pred,
        "classes": classes,
        "probabilities": {str(classes[i]): float(proba[i]) for i in range(len(classes))},
    }
    print(json.dumps(out))


if __name__ == "__main__":
    main()
