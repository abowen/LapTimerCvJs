import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RaceState, CarData } from '../types';
import { speakText } from '../utils/speech';

const COUNTDOWN_START       = 3;
const COUNTDOWN_INTERVAL_MS = 1000;
const BUTTON_RESET_DELAY_MS = 600;

export const useRaceStore = defineStore('race', () => {
  const state            = ref<RaceState>('idle');
  const countdownValue   = ref(COUNTDOWN_START);
  const lapsTarget       = ref(3);
  const qualifying       = ref(false);
  const won              = ref(false);
  const winnerLabel      = ref('');
  const winnerColor      = ref('');
  const lastAnnouncedLap = ref(0);

  /** Reactive frame timestamp updated every rAF tick by the detection loop. */
  const frameTimestamp   = ref(0);

  let countdownTimerId: number | null = null;
  const carsDisabledBeforeRace = new Set<string>();

  /** Begin the 3-2-1 countdown, then start all car timers. In qualifying mode, skip the countdown. */
  function startRace(cars: CarData[], cooldownMs: number) {
    carsDisabledBeforeRace.clear();
    for (const car of cars) {
      if (car.disabled) carsDisabledBeforeRace.add(car.id);
    }

    if (qualifying.value) {
      state.value = 'running';
      const now = performance.now();
      for (const car of cars) {
        if (!car.disabled) {
          car.timerStart      = now;
          car.cooldownUntil   = now + cooldownMs;
          car.wasInCooldown   = false;
          car.badgeHoldFrames = 0;
        }
      }
      return;
    }

    state.value          = 'countdown';
    countdownValue.value = COUNTDOWN_START;
    speakText(String(countdownValue.value));

    countdownTimerId = window.setInterval(() => {
      countdownValue.value--;

      if (countdownValue.value <= 0) {
        clearInterval(countdownTimerId!);
        countdownTimerId = null;
        state.value = 'running';

        const now = performance.now();
        for (const car of cars) {
          if (!car.disabled) {
            car.timerStart      = now;
            car.cooldownUntil   = now + cooldownMs;
            car.wasInCooldown   = false;
            car.badgeHoldFrames = 0;
          }
        }

        speakText('Start');
        // Delay handled by component watching state
        setTimeout(() => { /* component reacts to state === 'running' */ }, BUTTON_RESET_DELAY_MS);
      } else {
        speakText(String(countdownValue.value));
      }
    }, COUNTDOWN_INTERVAL_MS);
  }

  /** Reset the race to idle — re-enable all cars and clear lap history. */
  function resetRace(cars: CarData[]) {
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }

    state.value            = 'idle';
    won.value              = false;
    winnerLabel.value      = '';
    winnerColor.value      = '';
    lastAnnouncedLap.value = 0;

    for (const car of cars) {
      if (car.disabled && !carsDisabledBeforeRace.has(car.id)) {
        car.disabled = false;
      }
      car.lapCount           = 0;
      car.lapTimes           = [];
      car.showDetectionBadge = false;
      car.showCooldownBadge  = false;
    }
  }

  return {
    state, countdownValue, lapsTarget, qualifying,
    won, winnerLabel, winnerColor, lastAnnouncedLap,
    frameTimestamp,
    carsDisabledBeforeRace,
    startRace, resetRace,
  };
});
