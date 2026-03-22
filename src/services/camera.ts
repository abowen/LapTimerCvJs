/** Request camera access, preferring the rear-facing camera with a fallback. */
export async function startCamera(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  setStatus: (msg: string) => void,
): Promise<void> {
  setStatus('Requesting camera access…');

  const tryStream = async (constraints: MediaStreamConstraints) => {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await new Promise<void>((resolve) => { video.onloadedmetadata = () => resolve(); });
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
  };

  try {
    await tryStream({ video: { facingMode: 'environment' }, audio: false });
    setStatus('Camera ready — waiting for OpenCV…');
  } catch {
    try {
      await tryStream({ video: true, audio: false });
      setStatus('Camera ready (fallback) — waiting for OpenCV…');
    } catch (err) {
      setStatus(`Camera error: ${String(err)}`);
      throw err;
    }
  }
}

/** Resolves once the OpenCV runtime (cv.Mat) is available. */
export function waitForOpenCV(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof cv !== 'undefined' && cv.Mat) { resolve(); return; }
    const orig = (typeof cv !== 'undefined' ? cv.onRuntimeInitialized : undefined) as (() => void) | undefined;
    (cv as unknown as Record<string, unknown>)['onRuntimeInitialized'] = () => {
      if (orig) orig();
      resolve();
    };
  });
}

/** Sample a region of canvas pixels and return per-channel HSV min/max + raw ImageData. */
export function sampleHsvAt(
  centerX: number,
  centerY: number,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  sampleSize: number,
): { range: import('../types').HsvRange; imageData: ImageData } {
  const halfSize     = Math.floor(sampleSize / 2);
  const sampleX      = Math.max(0, Math.min(canvas.width  - 1, centerX - halfSize));
  const sampleY      = Math.max(0, Math.min(canvas.height - 1, centerY - halfSize));
  const sampleWidth  = Math.min(sampleSize, canvas.width  - sampleX);
  const sampleHeight = Math.min(sampleSize, canvas.height - sampleY);

  const imageData = ctx.getImageData(sampleX, sampleY, sampleWidth, sampleHeight);
  const sourceMat = cv.matFromImageData(imageData);
  const rgbMat    = new cv.Mat();
  const hsvMat    = new cv.Mat();
  const channels  = new cv.MatVector();

  try {
    cv.cvtColor(sourceMat, rgbMat, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgbMat, hsvMat, cv.COLOR_RGB2HSV);
    cv.split(hsvMat, channels);

    const hueChannel        = channels.get(0);
    const saturationChannel = channels.get(1);
    const valueChannel      = channels.get(2);

    const getMinMax = (mat: { data: ArrayLike<number> }): { min: number; max: number } => {
      const data = mat.data as Uint8Array;
      let lo = 255, hi = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] < lo) lo = data[i];
        if (data[i] > hi) hi = data[i];
      }
      return { min: lo, max: hi };
    };

    const hueRange        = getMinMax(hueChannel);
    const saturationRange = getMinMax(saturationChannel);
    const valueRange      = getMinMax(valueChannel);

    hueChannel.delete(); saturationChannel.delete(); valueChannel.delete();

    return {
      range: {
        hMin: hueRange.min,        hMax: hueRange.max,
        sMin: saturationRange.min,  sMax: saturationRange.max,
        vMin: valueRange.min,       vMax: valueRange.max,
      },
      imageData,
    };
  } finally {
    sourceMat.delete(); rgbMat.delete(); hsvMat.delete(); channels.delete();
  }
}
