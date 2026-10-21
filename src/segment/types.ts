/** Per-pixel probability (0..1) that a pixel belongs to a person, row-major. */
export interface PersonMask {
  width: number;
  height: number;
  data: Float32Array;
}

export interface Segmenter {
  segment(image: HTMLCanvasElement): Promise<PersonMask>;
}
