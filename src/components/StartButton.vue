<script setup lang="ts">
import { computed } from 'vue';
import { useRaceStore } from '../stores/race';
import { useCarsStore } from '../stores/cars';
import { useConfigStore } from '../stores/config';

const race  = useRaceStore();
const cars  = useCarsStore();
const config = useConfigStore();

const buttonText = computed(() => {
  if (race.state === 'countdown') return String(race.countdownValue);
  if (race.state === 'running') return '↺ Reset';
  return '▶ Start';
});

const buttonClass = computed(() => {
  if (race.state === 'countdown') return 'btn btn-warning btn-lg w-100 mb-3';
  if (race.state === 'running') return 'btn btn-danger btn-lg w-100 mb-3';
  return 'btn btn-success btn-lg w-100 mb-3';
});

const isDisabled = computed(() => race.state === 'countdown');

function onClick() {
  if (race.state === 'idle') {
    race.startRace(cars.cars, config.cooldownMs);
  } else if (race.state === 'running') {
    race.resetRace(cars.cars);
  }
}
</script>

<template>
  <button :class="buttonClass" :disabled="isDisabled" @click="onClick">
    {{ buttonText }}
  </button>
</template>
