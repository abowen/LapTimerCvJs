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
