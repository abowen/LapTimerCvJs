import type { CarState, RaceState } from './types';
import { COOLDOWN_MS } from './config';
import { speakText } from './utils';

const COUNTDOWN_START          = 3;
const COUNTDOWN_INTERVAL_MS    = 1000;
const BUTTON_RESET_DELAY_MS    = 600;

/** Shared mutable race state — read by the detection loop, written by lifecycle functions. */
export const race = {
  state:                   'idle'  as RaceState,
  countdownValue:          COUNTDOWN_START,
  countdownTimerId:        null    as number | null,
  lapsTarget:              3,
  won:                     false,
  winnerLabel:             '',
  winnerColor:             '',
  lastAnnouncedLap:        0,
  carsDisabledBeforeRace:  new Set<CarState>(),
};

/** Begin the 3-2-1 countdown, then start all car timers. */
export function startRace(
  cars: CarState[],
  startButton: HTMLButtonElement,
  lapsInput: HTMLInputElement,
): void {
  race.lapsTarget      = Math.max(1, parseInt(lapsInput.value, 10) || COUNTDOWN_START);
  race.state           = 'countdown';
  race.countdownValue  = COUNTDOWN_START;
  race.carsDisabledBeforeRace.clear();
  for (const car of cars) {
    if (car.disabled) race.carsDisabledBeforeRace.add(car);
  }
  startButton.textContent = String(race.countdownValue);
  startButton.disabled    = true;
  startButton.classList.replace('btn-success', 'btn-warning');
  lapsInput.disabled   = true;
  speakText(String(race.countdownValue));
  
  race.countdownTimerId = window.setInterval(() => {
    race.countdownValue--;

    if (race.countdownValue <= 0) {
      clearInterval(race.countdownTimerId!);
      race.countdownTimerId = null;
      race.state = 'running';

      const now = performance.now();
      for (const car of cars) {
        if (!car.disabled) {
          car.timerStart        = now;
          car.cooldownUntil     = now + COOLDOWN_MS;
          car.wasInCooldown     = false;
          car.badgeHoldFrames   = 0;
        }
      }

      speakText('Start');
      startButton.textContent = 'GO!';
      setTimeout(() => {
        startButton.textContent = '↺ Reset';
        startButton.disabled    = false;
        startButton.classList.replace('btn-warning', 'btn-danger');
      }, BUTTON_RESET_DELAY_MS);
    } else {
      startButton.textContent = String(race.countdownValue);
      speakText(String(race.countdownValue));
    }
  }, COUNTDOWN_INTERVAL_MS);
}

/** Reset the race to idle — re-enable all cars and clear lap history. */
export function resetRace(
  cars: CarState[],
  startButton: HTMLButtonElement,
  lapsInput: HTMLInputElement,
): void {
  if (race.countdownTimerId !== null) {
    clearInterval(race.countdownTimerId);
    race.countdownTimerId = null;
  }

  race.state            = 'idle';
  race.won              = false;
  race.winnerLabel      = '';
  race.winnerColor      = '';
  race.lastAnnouncedLap = 0;

  for (const car of cars) {
    if (car.disabled && !race.carsDisabledBeforeRace.has(car)) {
      car.disabled = false;
      car.disableButton.textContent = '⏹';
      car.disableButton.title       = 'Disable detection';
      car.disableButton.classList.replace('btn-warning', 'btn-outline-secondary');
      car.columnElement.style.opacity = '';
    }
    car.lapCount = 0;
    car.lapListElement.innerHTML = '';
    car.detectionBadge.classList.add('d-none');
    car.cooldownBadge.classList.add('d-none');
    car.timerElement.textContent = '00.000';
  }

  startButton.textContent = '▶ Start';
  startButton.disabled    = false;
  startButton.classList.replace('btn-danger', 'btn-success');
  lapsInput.disabled   = false;
}
