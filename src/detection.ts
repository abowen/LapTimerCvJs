import type { CarState, DetectedRect } from './types';
import type { Mat, MatVector } from '@techstark/opencv-js';
import { MIN_AREA, OVERLAY_HOLD_MS, BADGE_HOLD_FRAMES, COLOR_CONFIGS } from './config';
import { formatTime, speakText } from './utils';
import { addLapTime, resetCarTimer, toggleCarDisabled } from './car';
import { drawDetectionOverlay, drawCountdown, drawWinnerBanner } from './overlays';
import { race } from './race';
import { blockedEntries } from './blocked-ranges';
import { recordLap } from './best-laps';

/** Shared OpenCV working matrices, allocated once and reused every frame. */
interface SharedMats {
  colorMask:         Mat;
  dilatedMask:       Mat;
  contours:          MatVector;
  hierarchy:         Mat;
  dilationKernel:    Mat;
  blockedRangesMask: Mat;
}

const DILATION_ANCHOR    = new cv.Point(-1, -1);
const DILATION_ITERATIONS = 2;

/** Build a colour mask for one car, subtracting any blocked HSV ranges. */
function buildColorMask(
  hsv: Mat,
  car: CarState,
  shared: SharedMats,
): void {
  cv.inRange(hsv, car.lowerBound!, car.upperBound!, shared.colorMask);

  // Subtract blocked HSV ranges so they don't trigger false detections
  for (const entry of blockedEntries) {
    cv.inRange(hsv, entry.lowerBound, entry.upperBound, shared.blockedRangesMask);
    cv.bitwise_not(shared.blockedRangesMask, shared.blockedRangesMask);
    cv.bitwise_and(shared.colorMask, shared.blockedRangesMask, shared.colorMask);
  }
}

/** Find all bounding rectangles that meet the minimum area threshold. */
function findDetectedRectangles(shared: SharedMats): DetectedRect[] {
  cv.dilate(shared.colorMask, shared.dilatedMask, shared.dilationKernel,
    DILATION_ANCHOR, DILATION_ITERATIONS);
  cv.findContours(shared.dilatedMask, shared.contours, shared.hierarchy,
    cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const detectedRectangles: DetectedRect[] = [];
  for (let i = 0; i < shared.contours.size(); i++) {
    const contour = shared.contours.get(i);
    const area    = cv.contourArea(contour);
    if (area >= MIN_AREA) {
      const rect = cv.boundingRect(contour);
      detectedRectangles.push({
        x: rect.x, y: rect.y, width: rect.width, height: rect.height, area,
      });
    }
    contour.delete();
  }
  return detectedRectangles;
}

/** Handle lap recording, race win detection, and lap announcements. */
function handleDetection(car: CarState, lapTimeMs: number): void {
  car.lapCount++;
  addLapTime(car, `Lap ${car.lapCount}: ${formatTime(lapTimeMs)}`);
  recordLap(COLOR_CONFIGS[car.configKey].label, lapTimeMs);

  if (car.lapCount >= race.lapsTarget) {
    if (!race.won) {
      race.won         = true;
      race.winnerLabel = `${COLOR_CONFIGS[car.configKey].label} won`;
      race.winnerColor = COLOR_CONFIGS[car.configKey].badgeColor;
      speakText(`${COLOR_CONFIGS[car.configKey].label} wins`);
    }
    toggleCarDisabled(car);
  } else {
    if (car.lapCount > race.lastAnnouncedLap) {
      race.lastAnnouncedLap = car.lapCount;
      const remaining = race.lapsTarget - car.lapCount;
      speakText(`${COLOR_CONFIGS[car.configKey].label} ${remaining} lap${remaining === 1 ? '' : 's'} remaining`);
    }
    resetCarTimer(car);
  }
}

/** Process a single frame of colour detection for one car. */
function processCarFrame(
  car: CarState,
  ctx: CanvasRenderingContext2D,
  hsv: Mat,
  shared: SharedMats,
  now: number,
): void {
  // During cooldown, just hold the last overlay briefly then bail out
  if (now < car.cooldownUntil) {
    if (now - car.lastDetectionTimestampMs < OVERLAY_HOLD_MS) {
      drawDetectionOverlay(ctx, car, car.lastDetectedRects);
    }
    car.detectionBadge.classList.add('d-none');
    car.cooldownBadge.classList.remove('d-none');
    car.wasInCooldown = true;
    return;
  }

  if (car.wasInCooldown) {
    car.badgeHoldFrames = 0;
    car.wasInCooldown   = false;
  }
  car.cooldownBadge.classList.add('d-none');

  // Build colour mask, subtract blocked ranges, and find contours
  buildColorMask(hsv, car, shared);
  const detectedRectangles = findDetectedRectangles(shared);

  const detected = detectedRectangles.length > 0;

  if (detected) {
    car.lastDetectedRects        = detectedRectangles;
    car.lastDetectionTimestampMs = now;

    // First frame of a new detection — record lap
    if (car.badgeHoldFrames === 0) {
      const lapTimeMs = now - car.timerStart;
      handleDetection(car, lapTimeMs);
    }
    car.badgeHoldFrames = BADGE_HOLD_FRAMES;
  } else if (car.badgeHoldFrames > 0) {
    car.badgeHoldFrames--;
  }

  // Draw overlay (live or lingering)
  if (detected) {
    drawDetectionOverlay(ctx, car, detectedRectangles);
  } else if (now - car.lastDetectionTimestampMs < OVERLAY_HOLD_MS) {
    drawDetectionOverlay(ctx, car, car.lastDetectedRects);
  }

  car.detectionBadge.classList.toggle(
    'd-none',
    !(car.badgeHoldFrames > 0 || now - car.lastDetectionTimestampMs < OVERLAY_HOLD_MS),
  );
}

/** Start the requestAnimationFrame detection loop. */
export function startDetectionLoop(
  cars: CarState[],
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): void {
  const rgbFrame   = new cv.Mat();
  const hsvFrame   = new cv.Mat();
  const shared: SharedMats = {
    colorMask:         new cv.Mat(),
    dilatedMask:       new cv.Mat(),
    contours:          new cv.MatVector(),
    hierarchy:         new cv.Mat(),
    dilationKernel:    cv.Mat.ones(5, 5, cv.CV_8U),
    blockedRangesMask: new cv.Mat(),
  };

  function processFrame(): void {
    if (video.readyState < video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(processFrame);
      return;
    }

    const now = performance.now();
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Timers are frozen at 00.000 until the race is running
    for (const car of cars) {
      if (!car.disabled) {
        car.timerElement.textContent = race.state === 'running'
          ? formatTime(now - car.timerStart)
          : '00.000';
      }
    }

    if (race.state === 'running') {
      const sourceFrame = cv.matFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
      cv.cvtColor(sourceFrame, rgbFrame, cv.COLOR_RGBA2RGB);
      cv.cvtColor(rgbFrame, hsvFrame, cv.COLOR_RGB2HSV);

      for (const car of cars) {
        if (car.disabled || !car.lowerBound || !car.upperBound) continue;
        processCarFrame(car, ctx, hsvFrame, shared, now);
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
    for (const car of cars) {
      car.lowerBound?.delete();
      car.upperBound?.delete();
    }
  });
}
