import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CarData, CarBounds } from '../types';
import { useConfigStore } from './config';

let nextId = 1;

export const useCarsStore = defineStore('cars', () => {
  const cars = ref<CarData[]>([]);

  /**
   * Non-reactive map of OpenCV HSV bound matrices per car id.
   * Managed imperatively since Mat objects are not serialisable.
   */
  const boundsMap = new Map<string, CarBounds>();

  /** Create a new car and add it to the array. */
  function addCar(configKey: string): CarData {
    const car: CarData = {
      id:                       `car-${nextId++}`,
      configKey,
      disabled:                 false,
      lapCount:                 0,
      timerStart:               performance.now(),
      cooldownUntil:            0,
      wasInCooldown:            false,
      badgeHoldFrames:          0,
      lastDetectedRects:        [],
      lastDetectionTimestampMs: -Infinity,
      lapTimes:                 [],
      showDetectionBadge:       false,
      showCooldownBadge:        false,
    };
    cars.value.push(car);
    return car;
  }

  /** Remove a car by id, freeing OpenCV resources. */
  function removeCar(carId: string) {
    const bounds = boundsMap.get(carId);
    if (bounds) {
      bounds.lowerBound.delete();
      bounds.upperBound.delete();
      boundsMap.delete(carId);
    }
    const idx = cars.value.findIndex(c => c.id === carId);
    if (idx >= 0) cars.value.splice(idx, 1);
  }

  /** Remove all cars, freeing all OpenCV resources. */
  function removeAllCars() {
    for (const [, bounds] of boundsMap) {
      bounds.lowerBound.delete();
      bounds.upperBound.delete();
    }
    boundsMap.clear();
    cars.value.splice(0);
  }

  /** (Re-)allocate OpenCV HSV bound matrices for a car based on canvas size. */
  function rebuildBounds(carId: string, canvasWidth: number, canvasHeight: number) {
    const car = cars.value.find(c => c.id === carId);
    if (!car) return;

    const config = useConfigStore();
    const colorConfig = config.colorConfigs[car.configKey];
    if (!colorConfig) return;

    // Free old mats
    const oldBounds = boundsMap.get(carId);
    if (oldBounds) {
      oldBounds.lowerBound.delete();
      oldBounds.upperBound.delete();
    }

    boundsMap.set(carId, {
      lowerBound: new cv.Mat(canvasHeight, canvasWidth, cv.CV_8UC3,
        new cv.Scalar(colorConfig.hMin, colorConfig.sMin, colorConfig.vMin)),
      upperBound: new cv.Mat(canvasHeight, canvasWidth, cv.CV_8UC3,
        new cv.Scalar(colorConfig.hMax, colorConfig.sMax, colorConfig.vMax)),
    });
  }

  /** Get OpenCV bounds for a car (returns undefined if not built). */
  function getBounds(carId: string): CarBounds | undefined {
    return boundsMap.get(carId);
  }

  /** Toggle a car's disabled state. */
  function toggleDisabled(carId: string, cooldownMs: number) {
    const car = cars.value.find(c => c.id === carId);
    if (!car) return;
    car.disabled = !car.disabled;
    if (!car.disabled) {
      const now          = performance.now();
      car.timerStart     = now;
      car.cooldownUntil  = now + cooldownMs;
      car.badgeHoldFrames = 0;
      car.wasInCooldown  = false;
    } else {
      car.showDetectionBadge = false;
      car.showCooldownBadge  = false;
    }
  }

  /** Reset a car's timer and start a fresh cooldown window. */
  function resetCarTimer(carId: string, cooldownMs: number) {
    const car = cars.value.find(c => c.id === carId);
    if (!car) return;
    const now            = performance.now();
    car.timerStart       = now;
    car.cooldownUntil    = now + cooldownMs;
    car.badgeHoldFrames  = 0;
    car.wasInCooldown    = false;
  }

  /** Add a lap time to a car's display list (prepend). */
  function addLapTime(carId: string, timeStr: string) {
    const car = cars.value.find(c => c.id === carId);
    if (!car) return;
    car.lapTimes.unshift(timeStr);
  }

  /** Destroy and recreate cars from a list of colour keys. */
  function rebuildFromKeys(colorKeys: string[], canvasWidth: number, canvasHeight: number): CarData[] {
    removeAllCars();
    const newCars: CarData[] = [];
    for (const key of colorKeys) {
      const car = addCar(key);
      rebuildBounds(car.id, canvasWidth, canvasHeight);
      newCars.push(car);
    }
    return newCars;
  }

  return {
    cars,
    boundsMap,
    addCar, removeCar, removeAllCars,
    rebuildBounds, getBounds,
    toggleDisabled, resetCarTimer, addLapTime,
    rebuildFromKeys,
  };
});
