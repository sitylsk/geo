/**
 * Compress an image File in the browser to a JPEG data URL that stays small
 * enough to submit within serverless request-body limits.
 *
 * Phone screenshots are often several MB; sending three of them raw as base64
 * in one JSON request easily exceeds Vercel's ~4.5MB body limit. We downscale
 * to a max dimension and re-encode as JPEG, stepping the quality/size down
 * until the result is comfortably under `maxBytes`.
 */
export async function compressImageToDataUrl(
  file: File,
  {
    maxDimension = 1400,
    maxBytes = 900_000,
    quality = 0.82,
  }: { maxDimension?: number; maxBytes?: number; quality?: number } = {},
): Promise<string> {
  const bitmap = await loadImage(file);

  let dim = maxDimension;
  let q = quality;

  // Try progressively smaller/lower-quality encodes until under maxBytes.
  for (let attempt = 0; attempt < 6; attempt++) {
    const dataUrl = drawToJpeg(bitmap, dim, q);
    if (approxBytesFromDataUrl(dataUrl) <= maxBytes) {
      cleanup(bitmap);
      return dataUrl;
    }
    // reduce quality first, then dimensions
    if (q > 0.5) {
      q -= 0.12;
    } else {
      dim = Math.round(dim * 0.8);
    }
  }

  const finalUrl = drawToJpeg(bitmap, dim, Math.max(q, 0.4));
  cleanup(bitmap);
  return finalUrl;
}

type Drawable = HTMLImageElement | ImageBitmap;

async function loadImage(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to <img> loader
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}

function drawToJpeg(source: Drawable, maxDimension: number, quality: number): string {
  const sw = "width" in source ? source.width : (source as HTMLImageElement).naturalWidth;
  const sh = "height" in source ? source.height : (source as HTMLImageElement).naturalHeight;

  const scale = Math.min(1, maxDimension / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  // white backdrop so transparent PNGs don't turn black when flattened to JPEG
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

function approxBytesFromDataUrl(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

function cleanup(source: Drawable) {
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    source.close();
  }
}
