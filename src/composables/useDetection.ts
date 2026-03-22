import type { Ref } from 'vue';
import type { Mat, MatVector } from '@techstark/opencv-js';
import type { CarData, DetectedRect } from '../types';
import { useConfigStore, OVERLAY_HOLD_MS, BADGE_HOLD_FRAMES } from '../stores/config';
import { useRaceStore } from '../stores/race';
import { useCarsStore } from '../stores/cars';
import { useBlockedRangesStore } from '../stores/blockedRanges';
import { useBestLapsStore } from '../stores/bestLaps';
import { formatTime } from '../utils/format';
import { speakText } from '../utils/speech';
import { drawDetectionOverlay, drawCountdown, drawWinnerBanner } from '../services/overlays';

interface SharedMats {
  colorMask:         Mat;
  dilatedMask:       Mat;
  contours:          MatVector;
  hierarchy:         Mat;
  dilationKernel:    Mat;
  blockedRangesMask: Mat;
}

const DILATION_ANCHOR     = new cv.Point(-1, -1);
const DILATION_ITERATIONS = 2;

function buildColorMask(
  hsv: Mat,
  lowerBound: Mat,
  upperBound: Mat,
  blocked: ReturnType<typeof useBlockedRangesStore>,
  shared: SharedMats,
) {
  cv.inRange(hsv, lowerBound, upperBound, shared.colorMask);
  for (const entry of blocked.entries) {
    cv.inRange(hsv, entry.lowerBound, entry.upperBound, shared.blockedRangesMask);
    cv.bitwise_not(shared.blockedRangesMask, shared.blockedRangesMask);
    cv.bitwise_and(shared.colorMask, shared.blockedRangesMask, shared.colorMask);
  }
}

function findDetectedRectangles(shared: SharedMats, minArea: number): DetectedRect[] {
  cv.dilate(shared.colorMask, shared.dilatedMask, shared.dilationKernel,
    DILATION_ANCHOR, DILATION_ITERATIONS);
  cv.findContours(shared.dilatedMask, shared.contours, shared.hierarchy,
    cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const rects: DetectedRect[] = [];
  for (let i = 0; i < shared.contours.size(); i++) {
    const contour = shared.contours.get(i);
    const area    = cv.contourArea(contour);
    if (area >= minArea) {
      const rect = cv.boundingRect(contour);
      rects.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, area });
    }
    contour.delete();
  }
  return rects;
}

function handleDetection(
  car: CarData,
  lapTimeMs: number,
  config: ReturnType<typeof useConfigStore>,
  race: ReturnType<typeof useRaceStore>,
  carsStore: ReturnType<typeof useCarsStore>,
  bestLaps: ReturnType<typeof useBestLapsStore>,
) {
  car.lapCount++;
  const colorConfig = config.colorConfigs[car.configKey];
  carsStore.addLapTime(car.id, `Lap ${car.lapCount}: ${formatTime(lapTimeMs)}`);
  bestLaps.recordLap(colorConfig.label, lapTimeMs);

  if (car.lapCount >= race.lapsTarget) {
    if (!race.won) {
      race.won         = true;
      race.winnerLabel = `${colorConfig.label} won`;
      race.winnerColor = colorConfig.badgeColor;
      speakText(`${colorConfig.label} wins`);
    }
    carsStore.toggleDisabled(car.id, config.cooldownMs);
  } else {
    if (car.lapCount > race.lastAnnouncedLap) {
      race.lastAnnouncedLap = car.lapCount;
      const remaining = race.lapsTarget - car.lapCount;
      speakText(`${colorConfig.label} ${remaining} lap${remaining === 1 ? '' : 's'} remaining`);
    }
    carsStore.resetCarTimer(car.id, config.cooldownMs);
  }
}

function processCarFrame(
  car: CarData,
  ctx: CanvasRenderingContext2D,
  hsv: Mat,
  shared: SharedMats,
  now: number,
  config: ReturnType<typeof useConfigStore>,
  race: ReturnType<typeof useRaceStore>,
  carsStore: ReturnType<typeof useCarsStore>,
  blocked: ReturnType<typeof useBlockedRangesStore>,
  bestLaps: ReturnType<typeof useBestLapsStore>,
) {
  const bounds = carsStore.getBounds(car.id);
  if (!bounds) return;

  const colorConfig = config.colorConfigs[car.configKey];
  if (!colorConfig) return;

  if (now < car.cooldownUntil) {
    if (now - car.lastDetectionTimestampMs < OVERLAY_HOLD_MS) {
      drawDetectionOverlay(ctx, colorConfig, car.lastDetectedRects);
    }
    car.showDetectionBadge = false;
    car.showCooldownBadge  = true;
    car.wasInCooldown      = true;
    return;
  }

  if (car.wasInCooldown) {
    car.badgeHoldFrames = 0;
    car.wasInCooldown   = false;
  }
  car.showCooldownBadge = false;

  buildColorMask(hsv, bounds.lowerBound, bounds.upperBound, blocked, shared);
  const detectedRects = findDetectedRectangles(shared, config.minArea);
  const detected = detectedRects.length > 0;

  if (detected) {
    car.lastDetectedRects        = detectedRects;
    car.lastDetectionTimestampMs = now;
    if (car.badgeHoldFrames === 0) {
      handleDetection(car, now - car.timerStart, config, race, carsStore, bestLaps);
    }
    car.badgeHoldFrames = BADGE_HOLD_FRAMES;
  } else if (car.badgeHoldFrames > 0) {
    car.badgeHoldFrames--;
  }

  if (detected) {
    drawDetectionOverlay(ctx, colorConfig, detectedRects);
  } else if (now - car.lastDetectionTimestampMs < OVERLAY_HOLD_MS) {
    drawDetectionOverlay(ctx, colorConfig, car.lastDetectedRects);
  }

  car.showDetectionBadge = car.badgeHoldFrames > 0 || now - car.lastDetectionTimestampMs < OVERLAY_HOLD_MS;
}

/**
 * Composable that starts the requestAnimationFrame detection loop.
 * Reads car data from the cars store and writes detection results back.
 */
export function useDetection(
  videoRef: Ref<HTMLVideoElement | null>,
  canvasRef: Ref<HTMLCanvasElement | null>,
) {
  /** Current frame timestamp (updated every rAF). Components can use this for timer display. */
  const now = { value: performance.now() };

  function start() {
    const video  = videoRef.value!;
    const canvas = canvasRef.value!;
    const ctx = canvas.getContext('2d')!;

    const config   = useConfigStore();
    const race     = useRaceStore();
    const carsStore = useCarsStore();
    const blocked  = useBlockedRangesStore();
    const bestLaps = useBestLapsStore();

    const rgbFrame = new cv.Mat();
    const hsvFrame = new cv.Mat();
    const shared: SharedMats = {
      colorMask:         new cv.Mat(),
      dilatedMask:       new cv.Mat(),
      contours:          new cv.MatVector(),
      hierarchy:         new cv.Mat(),
      dilationKernel:    cv.Mat.ones(5, 5, cv.CV_8U),
      blockedRangesMask: new cv.Mat(),
    };

    function processFrame() {
      if (video.readyState < video.HAVE_ENOUGH_DATA) {
        requestAnimationFrame(processFrame);
        return;
      }

      const frameNow = performance.now();
      now.value = frameNow;
      race.frameTimestamp = frameNow;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (race.state === 'running') {
        const sourceFrame = cv.matFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
        cv.cvtColor(sourceFrame, rgbFrame, cv.COLOR_RGBA2RGB);
        cv.cvtColor(rgbFrame, hsvFrame, cv.COLOR_RGB2HSV);

        for (const car of carsStore.cars) {
          if (car.disabled) continue;
          processCarFrame(car, ctx, hsvFrame, shared, frameNow, config, race, carsStore, blocked, bestLaps);
        }
        sourceFrame.delete();
      } else if (race.state === 'countdown') {
        drawCountdown(ctx, canvas, race.countdownValue);
      }

      drawWinnerBanner(ctx, canvas, race.winnerLabel, race.winnerColor);
      requestAnimationFrame(processFrame);
    }

    requestAnimationFrame(processFrame);

    window.addEventListener('unload', () => {
      [rgbFrame, hsvFrame, shared.colorMask, shared.dilatedMask,
       shared.hierarchy, shared.dilationKernel, shared.blockedRangesMask]
        .forEach(mat => mat.delete());
      shared.contours.delete();
    });
  }

  return { now, start };
}
