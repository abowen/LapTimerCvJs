import type { CarState, RaceState } from './types';
import { COOLDOWN_MS } from './config';
import { speakText } from './utils';

/** Shared mutable race state — read by the detection loop, written by lifecycle functions. */
export const race = {
  state:            'idle'  as RaceState,
  countdownValue:   3,
  countdownTimerId: null    as number | null,
  lapsTarget:       3,
  won:              false,
  winnerLabel:      '',
  winnerColor:      '',
  lastAnnouncedLap: 0,
  disabledBeforeRace: new Set<CarState>(),
};

/** Begin the 3-2-1 countdown, then start all car timers. */
export function startRace(
  cars: CarState[],
  startBtn: HTMLButtonElement,
  lapsInput: HTMLInputElement,
): void {
  race.lapsTarget      = Math.max(1, parseInt(lapsInput.value, 10) || 3);
  race.state           = 'countdown';
  race.countdownValue  = 3;
  race.disabledBeforeRace.clear();
  for (const car of cars) {
    if (car.disabled) race.disabledBeforeRace.add(car);
  }
  startBtn.textContent = String(race.countdownValue);
  startBtn.disabled    = true;
  startBtn.classList.replace('btn-success', 'btn-warning');
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
          car.timerStart    = now;
          car.cooldownUntil = now + COOLDOWN_MS;
          car.wasInCooldown = false;
          car.badgeHold     = 0;
        }
      }

      speakText('Start');
      startBtn.textContent = 'GO!';
      setTimeout(() => {
        startBtn.textContent = '↺ Reset';
        startBtn.disabled    = false;
        startBtn.classList.replace('btn-warning', 'btn-danger');
      }, 600);
    } else {
      startBtn.textContent = String(race.countdownValue);
      speakText(String(race.countdownValue));
    }
  }, 1000);
}

/** Reset the race to idle — re-enable all cars and clear lap history. */
export function resetRace(
  cars: CarState[],
  startBtn: HTMLButtonElement,
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
    if (car.disabled && !race.disabledBeforeRace.has(car)) {
      car.disabled = false;
      car.disableBtnEl.textContent = '⏹';
      car.disableBtnEl.title       = 'Disable detection';
      car.disableBtnEl.classList.replace('btn-warning', 'btn-outline-secondary');
      car.colEl.style.opacity = '';
    }
    car.lapCount = 0;
    car.lapListEl.innerHTML = '';
    car.badgeEl.classList.add('d-none');
    car.cooldownBadgeEl.classList.add('d-none');
    car.timerEl.textContent = '00.000';
  }

  startBtn.textContent = '▶ Start';
  startBtn.disabled    = false;
  startBtn.classList.replace('btn-danger', 'btn-success');
  lapsInput.disabled   = false;
}
