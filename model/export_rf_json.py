"""
Export sklearn RandomForestClassifier trees to JSON for TypeScript inference
(no onnxruntime-node — keeps Vercel bundles under size limits).

Run after updating the pickle:
  pip install joblib scikit-learn numpy
  python model/export_rf_json.py
"""

from __future__ import annotations

import json
import os

import joblib
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
PKL = os.path.join(ROOT, "fatigue_model.pkl")
JSON_OUT = os.path.join(ROOT, "fatigue_rf.json")


def export_tree(estimator):
    t = estimator.tree_
    n_nodes = t.node_count
    values = []
    for i in range(n_nodes):
        vals = t.value[i][0].astype(np.float64).tolist()
        values.append(vals)
    return {
        "children_left": [int(x) for x in t.children_left],
        "children_right": [int(x) for x in t.children_right],
        "feature": [int(x) for x in t.feature],
        "threshold": [float(x) for x in t.threshold],
        "values": values,
    }


def main() -> None:
    model = joblib.load(PKL)
    classes = [int(c) for c in model.classes_]

    payload = {
        "version": 1,
        "n_features": int(model.n_features_in_),
        "classes": classes,
        "trees": [export_tree(est) for est in model.estimators_],
    }

    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))

    print(f"Wrote {JSON_OUT} ({os.path.getsize(JSON_OUT)} bytes)")
    print(f"Trees: {len(payload['trees'])} classes={classes}")

    ref = model.predict_proba([[1.0, 2.0, 3.0]])[0].tolist()
    print(f"Sanity sklearn proba [1,2,3]: {ref}")


if __name__ == "__main__":
    main()
