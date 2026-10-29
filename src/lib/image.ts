"use client";

// Photo preparation in the browser before anything is uploaded.

export interface PreparedPhoto {
  blob: Blob;
  thumb: string; // small data URL kept on the device for the timeline
  width: number;
  height: number;
  brightness: number; // mean luminance 0-255
}

const MAX_LONG_SIDE = 1600;
export const MIN_SHORT_SIDE = 480; // SD skin analysis minimum

async function loadBitmap(source: Blob): Promise<ImageBitmap> {
  return createImageBitmap(source, { imageOrientation: "from-image" });
}

function draw(bitmap: ImageBitmap, maxLong: number) {
  const scale = Math.min(1, maxLong / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

export function meanBrightness(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  // Sample the central area where the face should be.
  const x = Math.round(w * 0.25);
  const y = Math.round(h * 0.2);
  const data = ctx.getImageData(x, y, Math.round(w * 0.5), Math.round(h * 0.6)).data;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 16) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    n++;
  }
  return n ? sum / n : 0;
}

export async function preparePhoto(source: Blob): Promise<PreparedPhoto> {
  const bitmap = await loadBitmap(source);
  const { canvas, ctx, w, h } = draw(bitmap, MAX_LONG_SIDE);
  const brightness = meanBrightness(ctx, w, h);
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.92),
  );
  const small = draw(bitmap, 480);
  const thumb = small.canvas.toDataURL("image/jpeg", 0.8);
  bitmap.close();
  return { blob, thumb, width: w, height: h, brightness };
}

export function photoProblems(p: PreparedPhoto): string[] {
  const out: string[] = [];
  if (Math.min(p.width, p.height) < MIN_SHORT_SIDE) out.push("The photo is too small. Use a higher camera resolution.");
  if (p.brightness < 70) out.push("It looks dark. Face a window or a bright, even light.");
  if (p.brightness > 225) out.push("It looks overexposed. Step away from direct light.");
  if (p.width > p.height) out.push("Hold the phone upright (portrait) for the most consistent results.");
  return out;
}
