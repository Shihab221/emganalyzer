// ============================================
// Hot-path EMG ingest (survives Vercel/serverless load)
//
// Problems this fixes:
// - One Postgres row per live sample + COUNT + DELETE storm
// - findFirst() + INSERT per sample during recording
// - Exhausting DB connections and serverless concurrency
//
// Caveat: the live ring is per Node instance (lambda). Under heavy scale,
// different GET/POST invocations may briefly disagree until warm. Recording
// batches use DB-backed activeRecording to re-resolve session id occasionally.
// ============================================

import type { SensorData } from '@/lib/types';
import prisma from '@/lib/prisma';

const MAX_LIVE = 500;
const RECORD_BATCH_SIZE = 48;
const SESSION_LOOKUP_COOLDOWN_MS = 3000;

type G = typeof globalThis & {
  __emgLiveRing?: SensorData[];
  __emgRecordSessionId?: string | null;
  __emgRecordBatch?: { sessionId: string; emg: number; timestamp: Date }[];
  __emgSessionLookupAt?: number;
};

const g = globalThis as G;

function liveRing(): SensorData[] {
  if (!g.__emgLiveRing) g.__emgLiveRing = [];
  return g.__emgLiveRing;
}

function recordBatch(): { sessionId: string; emg: number; timestamp: Date }[] {
  if (!g.__emgRecordBatch) g.__emgRecordBatch = [];
  return g.__emgRecordBatch;
}

export function pushLiveSample(sample: SensorData): void {
  const ring = liveRing();
  ring.push(sample);
  while (ring.length > MAX_LIVE) ring.shift();
}

export function getLiveHistory(limit: number): SensorData[] {
  const ring = liveRing();
  if (ring.length === 0) return [];
  return ring.slice(-Math.min(limit, ring.length));
}

export function getLatestLive(): SensorData | null {
  const ring = liveRing();
  return ring.length ? ring[ring.length - 1] : null;
}

export function setRecordingSessionId(sessionId: string | null): void {
  g.__emgRecordSessionId = sessionId;
}

export function getRecordingSessionIdCached(): string | null {
  return g.__emgRecordSessionId ?? null;
}

async function resolveRecordingSessionId(): Promise<string | null> {
  if (g.__emgRecordSessionId) return g.__emgRecordSessionId;
  const now = Date.now();
  if (g.__emgSessionLookupAt && now - g.__emgSessionLookupAt < SESSION_LOOKUP_COOLDOWN_MS) {
    return null;
  }
  g.__emgSessionLookupAt = now;
  const row = await prisma.activeRecording.findFirst();
  if (row) {
    g.__emgRecordSessionId = row.sessionId;
    return row.sessionId;
  }
  return null;
}

/** Queue sample for persisted session; batched INSERT to reduce DB load. */
export async function enqueueRecordingSample(emg: number, timestampMs: number): Promise<void> {
  const sessionId = await resolveRecordingSessionId();
  if (!sessionId) return;

  const batch = recordBatch();
  batch.push({ sessionId, emg, timestamp: new Date(timestampMs) });

  if (batch.length >= RECORD_BATCH_SIZE) {
    await flushRecordingBatch(false);
  }
}

/** Flush queued recording rows to Postgres (call on Stop recording). */
export async function flushRecordingBatch(force: boolean): Promise<void> {
  const batch = recordBatch();
  if (batch.length === 0) return;
  if (!force && batch.length < RECORD_BATCH_SIZE) return;

  const chunk = batch.splice(0, batch.length);
  if (chunk.length === 0) return;

  await prisma.sensorData.createMany({
    data: chunk,
  });
}
