import { ref, watch, type Ref } from 'vue';
import { startCamera, waitForOpenCV } from '../services/camera';
import { useConfigStore } from '../stores/config';

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

    const config = useConfigStore();
    await startCamera(video, canvas, (msg) => { status.value = msg; }, config.fps);
    await waitForOpenCV();
    status.value = 'Ready — press Start to begin the race!';

    watch(() => config.fps, async (newFps) => {
      if (!video.srcObject) return;
      const track = (video.srcObject as MediaStream).getVideoTracks()[0];
      if (!track) return;
      try {
        await track.applyConstraints({ frameRate: { ideal: newFps } });
      } catch {
        // If applyConstraints not supported, ignore silently
      }
    });
  }

  return { status, init };
}
