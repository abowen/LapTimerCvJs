import { ref, type Ref } from 'vue';
import { startCamera, waitForOpenCV } from '../services/camera';

/**
 * Composable to initialise the camera and wait for OpenCV.
 * Returns the status message ref and an `init` function.
 */
export function useCamera(
  videoRef: Ref<HTMLVideoElement | null>,
  canvasRef: Ref<HTMLCanvasElement | null>,
) {
  const status = ref('Initializing…');

  async function init() {
    const video  = videoRef.value;
    const canvas = canvasRef.value;
    if (!video || !canvas) throw new Error('Video/canvas refs not ready');

    await startCamera(video, canvas, (msg) => { status.value = msg; });
    await waitForOpenCV();
    status.value = 'Ready — press Start to begin the race!';
  }

  return { status, init };
}
