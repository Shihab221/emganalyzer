/**
 * onnxruntime-node ships JS but types are not always published — minimal stubs for our usage.
 */
declare module 'onnxruntime-node' {
  export class Tensor {
    constructor(dataType: string, data: Float32Array, dims: readonly number[]);
    readonly data: Float32Array | BigInt64Array | Int32Array;
    readonly dims: readonly number[];
  }

  export class InferenceSession {
    static create(path: string, options?: unknown): Promise<InferenceSession>;
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor & { data: unknown }>>;
  }
}
