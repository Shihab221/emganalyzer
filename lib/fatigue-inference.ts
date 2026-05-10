// ============================================
// Pure JS RandomForest inference — model/fatigue_rf.json
// Regenerate JSON after .pkl changes: python model/export_rf_json.py
// Keeps serverless bundles small (no onnxruntime-node).
// ============================================

import fs from 'fs';
import path from 'path';

/** sklearn stores left child -1 at leaves */
const TREE_LEAF = -1;

interface ExportedTree {
  children_left: number[];
  children_right: number[];
  feature: number[];
  threshold: number[];
  /** For each node, class impulse / counts at node (leaf uses these for probabilities). */
  values: number[][];
}

interface ExportedForest {
  version: number;
  n_features: number;
  classes: number[];
  trees: ExportedTree[];
}

export interface FatigueOnnxResult {
  prediction: number;
  classes: number[];
  probabilities: Record<string, number>;
}

let cachedForest: ExportedForest | null = null;

function loadForest(): ExportedForest {
  if (cachedForest) return cachedForest;
  const jsonPath = path.join(process.cwd(), 'model', 'fatigue_rf.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  cachedForest = JSON.parse(raw) as ExportedForest;
  return cachedForest;
}

function treePredictProba(tree: ExportedTree, x: [number, number, number]): number[] {
  let node = 0;
  while (tree.children_left[node] !== TREE_LEAF) {
    const f = tree.feature[node];
    if (f < 0 || f >= x.length) {
      break;
    }
    if (x[f] <= tree.threshold[node]) {
      node = tree.children_left[node];
    } else {
      node = tree.children_right[node];
    }
  }

  const vals = tree.values[node];
  let s = 0;
  for (const v of vals) s += Math.max(0, v);
  if (s <= 0) return vals.map(() => 1 / vals.length);
  return vals.map((v) => Math.max(0, v) / s);
}

export function runFatigueModel(features: [number, number, number]): FatigueOnnxResult {
  const forest = loadForest();
  if (forest.version !== 1) {
    throw new Error('Unsupported fatigue_rf.json version');
  }
  const nClasses = forest.classes.length;
  const sum = new Array(nClasses).fill(0);

  for (const tree of forest.trees) {
    const p = treePredictProba(tree, features);
    for (let c = 0; c < nClasses; c++) {
      sum[c] += p[c] ?? 0;
    }
  }

  const invT = 1 / forest.trees.length;
  const proba = sum.map((v) => v * invT);

  let best = 0;
  for (let c = 1; c < nClasses; c++) {
    if (proba[c] > proba[best]) best = c;
  }

  const prediction = forest.classes[best];

  const probabilities: Record<string, number> = {};
  for (let c = 0; c < forest.classes.length; c++) {
    probabilities[String(forest.classes[c])] = Math.round(proba[c] * 1e6) / 1e6;
  }

  return {
    prediction,
    classes: [...forest.classes],
    probabilities,
  };
}

/** Alias for API route (async interface not required). */
export async function runFatigueOnnx(features: [number, number, number]): Promise<FatigueOnnxResult> {
  return runFatigueModel(features);
}
