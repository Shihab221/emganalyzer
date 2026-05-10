// ============================================
// ONNX inference (onnxruntime-node) for fatigue_model.onnx
// No Python at runtime — regenerate ONNX with model/export_onnx.py after .pkl changes
// ============================================

import path from 'path';

import type { InferenceSession } from 'onnxruntime-node';

let sessionPromise: Promise<InferenceSession> | null = null;

async function loadOrt() {
  return import('onnxruntime-node');
}

export async function getFatigueInferenceSession(): Promise<InferenceSession> {
  if (!sessionPromise) {
    const ort = await loadOrt();
    const modelPath = path.join(process.cwd(), 'model', 'fatigue_model.onnx');
    sessionPromise = ort.InferenceSession.create(modelPath);
  }
  return sessionPromise;
}

export interface FatigueOnnxResult {
  prediction: number;
  classes: number[];
  probabilities: Record<string, number>;
}

/**
 * Runs RandomForest ONNX with input shape [1, 3].
 */
export async function runFatigueOnnx(features: [number, number, number]): Promise<FatigueOnnxResult> {
  const ort = await loadOrt();
  const session = await getFatigueInferenceSession();

  const input = new Float32Array([
    features[0],
    features[1],
    features[2],
  ]);
  const tensor = new ort.Tensor('float32', input, [1, 3]);

  const out = await session.run({ float_input: tensor });

  const labelData = out.label?.data;
  let prediction = 0;
  if (labelData) {
    const v = labelData[0];
    prediction = typeof v === 'bigint' ? Number(v) : Number(v);
  }

  const probTensor = out.probabilities;
  const probs = probTensor?.data;
  if (!probs || probs.length === 0) {
    return {
      prediction,
      classes: [0, 1],
      probabilities: { '0': prediction === 0 ? 1 : 0, '1': prediction === 1 ? 1 : 0 },
    };
  }

  const flat = Array.from(probs as Iterable<number>);
  const probabilities: Record<string, number> = {};
  const classes: number[] = [];
  for (let i = 0; i < flat.length; i++) {
    classes.push(i);
    probabilities[String(i)] = Math.round(flat[i] * 1000000) / 1000000;
  }

  return { prediction, classes, probabilities };
}
