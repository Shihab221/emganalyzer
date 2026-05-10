"""
One-time export: fatigue_model.pkl -> fatigue_model.onnx
Requires: pip install skl2onnx onnx joblib scikit-learn

Run from repo root: python model/export_onnx.py
"""
from __future__ import annotations

import os

import joblib
import numpy as np
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

ROOT = os.path.dirname(os.path.abspath(__file__))
PKL = os.path.join(ROOT, "fatigue_model.pkl")
ONNX_OUT = os.path.join(ROOT, "fatigue_model.onnx")


def main() -> None:
    model = joblib.load(PKL)
    n_features = int(getattr(model, "n_features_in_", 3))

    initial_type = [("float_input", FloatTensorType([None, n_features]))]
    options = {id(model): {"zipmap": False}}
    onx = convert_sklearn(
        model,
        initial_types=initial_type,
        options=options,
        target_opset=12,
    )

    with open(ONNX_OUT, "wb") as f:
        f.write(onx.SerializeToString())

    print(f"Wrote {ONNX_OUT} ({os.path.getsize(ONNX_OUT)} bytes)")

    # Smoke test + print output names (for Node binding)
    import onnxruntime as ort

    sess = ort.InferenceSession(ONNX_OUT, providers=["CPUExecutionProvider"])
    print("Inputs:", [i.name for i in sess.get_inputs()])
    print("Outputs:", [o.name for o in sess.get_outputs()])

    x = np.array([[1.0, 2.0, 3.0]], dtype=np.float32)
    outs = sess.run(None, {"float_input": x})
    for i, o in enumerate(sess.get_outputs()):
        print(f"  {o.name}: {outs[i]}")


if __name__ == "__main__":
    main()
