import type { CarState, DetectedRect } from './types';
import type { Mat, MatVector } from '@techstark/opencv-js';
import { MIN_AREA, OVERLAY_HOLD, BADGE_HOLD, COLOR_CONFIGS } from './config';
import { formatTime, speakText } from './utils';
import { addLapTime, resetCarTimer, toggleCarDisabled } from './car';
import { drawDetectionOverlay, drawCountdown, drawWinnerBanner } from './overlays';
import { race } from './race';
import { blockedEntries } from './blocked-ranges';
import { recordLap } from './best-laps';

/** Shared OpenCV working matrices, allocated once and reused every frame. */
interface SharedMats {
  mask:      Mat;
  dilated:   Mat;
  contours:  MatVector;
  hierarchy: Mat;
  kernel:    Mat;
  blockMask: Mat;
}

/** Process a single frame of colour detection for one car. */
function processCarFrame(
  car: CarState,
  ctx: CanvasRenderingContext2D,
  hsv: Mat,
  shared: SharedMats,
  now: number,
): void {
  const { mask, dilated, contours, hierarchy, kernel } = shared;

  // During cooldown, just hold the last overlay briefly then bail out
  if (now < car.cooldownUntil) {
    if (now - car.lastDetectedAt < OVERLAY_HOLD) drawDetectionOverlay(ctx, car, car.lastRects);
    car.badgeEl.classList.add('d-none');
    car.cooldownBadgeEl.classList.remove('d-none');
    car.wasInCooldown = true;
    return;
  }

  if (car.wasInCooldown) {
    car.badgeHold     = 0;
    car.wasInCooldown = false;
  }
  car.cooldownBadgeEl.classList.add('d-none');

  // Build colour mask and find contours
  cv.inRange(hsv, car.lowerBound!, car.upperBound!, mask);

  // Subtract any blocked HSV ranges so they don't trigger detection
  for (const entry of blockedEntries) {
    cv.inRange(hsv, entry.lowerBound, entry.upperBound, shared.blockMask);
    cv.bitwise_not(shared.blockMask, shared.blockMask);
    cv.bitwise_and(mask, shared.blockMask, mask);
  }

  cv.dilate(mask, dilated, kernel, new cv.Point(-1, -1), 2);
  cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const frameRects: DetectedRect[] = [];
  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const area    = cv.contourArea(contour);
    if (area >= MIN_AREA) {
      const r = cv.boundingRect(contour);
      frameRects.push({ x: r.x, y: r.y, width: r.width, height: r.height, area });
    }
    contour.delete();
  }

  const detected = frameRects.length > 0;

  if (detected) {
    car.lastRects      = frameRects;
    car.lastDetectedAt = now;

    // First frame of a new detection — record lap
    if (car.badgeHold === 0) {
      car.lapCount++;
      const lapTimeMs = now - car.timerStart;
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
    car.badgeHold = BADGE_HOLD;
  } else if (car.badgeHold > 0) {
    car.badgeHold--;
  }

  // Draw overlay (live or lingering)
  if (detected) {
    drawDetectionOverlay(ctx, car, frameRects);
  } else if (now - car.lastDetectedAt < OVERLAY_HOLD) {
    drawDetectionOverlay(ctx, car, car.lastRects);
  }

  car.badgeEl.classList.toggle(
    'd-none',
    !(car.badgeHold > 0 || now - car.lastDetectedAt < OVERLAY_HOLD),
  );
}

/** Start the requestAnimationFrame detection loop. */
export function startDetectionLoop(
  cars: CarState[],
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): void {
  const rgb      = new cv.Mat();
  const hsv      = new cv.Mat();
  const shared: SharedMats = {
    mask:      new cv.Mat(),
    dilated:   new cv.Mat(),
    contours:  new cv.MatVector(),
    hierarchy: new cv.Mat(),
    kernel:    cv.Mat.ones(5, 5, cv.CV_8U),
    blockMask: new cv.Mat(),
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
        car.timerEl.textContent = race.state === 'running'
          ? formatTime(now - car.timerStart)
          : '00.000';
      }
    }

    if (race.state === 'running') {
      const src = cv.matFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
      cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
      cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);

      for (const car of cars) {
        if (car.disabled || !car.lowerBound || !car.upperBound) continue;
        processCarFrame(car, ctx, hsv, shared, now);
      }

      src.delete();
    } else if (race.state === 'countdown') {
      drawCountdown(ctx, canvas, race.countdownValue);
    }

    drawWinnerBanner(ctx, canvas, race.winnerLabel, race.winnerColor);
    requestAnimationFrame(processFrame);
  }

  requestAnimationFrame(processFrame);

  window.addEventListener('unload', () => {
    [rgb, hsv, shared.mask, shared.dilated, shared.hierarchy, shared.kernel, shared.blockMask]
      .forEach(m => m.delete());
    shared.contours.delete();
    for (const car of cars) {
      car.lowerBound?.delete();
      car.upperBound?.delete();
    }
  });
}
