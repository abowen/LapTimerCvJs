<script setup lang="ts">
import { ref, watch } from 'vue';
import { useConfigStore } from '../stores/config';
import { useCarsStore } from '../stores/cars';
import { useBlockedRangesStore } from '../stores/blockedRanges';
import { deriveColors } from '../utils/color';
import type { HsvRange } from '../types';

const config  = useConfigStore();
const cars    = useCarsStore();
const blocked = useBlockedRangesStore();

const props = defineProps<{
  canvasRef: HTMLCanvasElement | null;
  hsvResult: HsvRange | null;
  swatchDataUrl: string;
}>();

// Editable HSV range inputs, synced from prop when a new sample arrives
const hsvHMin = ref(0);
const hsvHMax = ref(0);
const hsvSMin = ref(0);
const hsvSMax = ref(0);
const hsvVMin = ref(0);
const hsvVMax = ref(0);
const nameInput = ref('');

watch(() => props.hsvResult, (range) => {
  if (!range) return;
  hsvHMin.value = range.hMin; hsvHMax.value = range.hMax;
  hsvSMin.value = range.sMin; hsvSMax.value = range.sMax;
  hsvVMin.value = range.vMin; hsvVMax.value = range.vMax;
});

function readHsvInputs(): HsvRange {
  return {
    hMin: hsvHMin.value, hMax: hsvHMax.value,
    sMin: hsvSMin.value, sMax: hsvSMax.value,
    vMin: hsvVMin.value, vMax: hsvVMax.value,
  };
}

function onAddDriver() {
  if (!props.hsvResult) return;
  const name = nameInput.value.trim();
  if (!name) return;
  const range = readHsvInputs();
  const { badgeColor, labelColor } = deriveColors(range.hMin, range.hMax, range.sMin, range.sMax, range.vMin, range.vMax);
  const key = config.generateColorKey(name);
  config.setColorConfig(key, { label: name, badgeColor, labelColor, ...range });

  if (props.canvasRef) {
    const car = cars.addCar(key);
    cars.rebuildBounds(car.id, props.canvasRef.width, props.canvasRef.height);
  }
  nameInput.value = '';
}

function onBlockColour() {
  if (!props.hsvResult || !props.canvasRef) return;
  const range = readHsvInputs();
  blocked.addEntry(range, props.canvasRef.width, props.canvasRef.height);
}
</script>

<template>
  <hr class="my-2">
  <p class="text-center text-muted small mb-1">
    Tap primary colour of the car in the camera to start adding a new driver
  </p>

  <div v-if="hsvResult">
    <div class="d-flex flex-wrap align-items-center justify-content-center gap-3">
      <img v-if="swatchDataUrl" :src="swatchDataUrl"
           class="rounded border flex-shrink-0" width="48" height="48">
      <div class="font-monospace small lh-lg">
        <div class="d-flex align-items-center gap-1">
          <span class="text-muted">H:</span>
          <input type="number" v-model.number="hsvHMin" class="form-control form-control-sm hsv-input" min="0" max="179">
          <span>–</span>
          <input type="number" v-model.number="hsvHMax" class="form-control form-control-sm hsv-input" min="0" max="179">
        </div>
        <div class="d-flex align-items-center gap-1">
          <span class="text-muted">S:</span>
          <input type="number" v-model.number="hsvSMin" class="form-control form-control-sm hsv-input" min="0" max="255">
          <span>–</span>
          <input type="number" v-model.number="hsvSMax" class="form-control form-control-sm hsv-input" min="0" max="255">
        </div>
        <div class="d-flex align-items-center gap-1">
          <span class="text-muted">V:</span>
          <input type="number" v-model.number="hsvVMin" class="form-control form-control-sm hsv-input" min="0" max="255">
          <span>–</span>
          <input type="number" v-model.number="hsvVMax" class="form-control form-control-sm hsv-input" min="0" max="255">
        </div>
      </div>
    </div>
    <div class="mt-2">
      <input type="text" v-model="nameInput"
             class="form-control form-control-sm mb-2"
             placeholder="Driver name…" maxlength="30">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-primary flex-grow-1"
                @click="onAddDriver">Add Driver</button>
        <button class="btn btn-sm btn-outline-secondary flex-grow-1"
                @click="onBlockColour">Block Colour</button>
      </div>
    </div>
  </div>
</template>
