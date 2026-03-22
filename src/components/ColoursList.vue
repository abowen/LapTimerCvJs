<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '../stores/config';
import { useCarsStore } from '../stores/cars';

const config = useConfigStore();
const cars   = useCarsStore();

const props = defineProps<{
  canvasRef: HTMLCanvasElement | null;
}>();

const colorEntries = computed(() => {
  return Object.entries(config.colorConfigs).map(([key, cfg]) => ({
    key,
    config: cfg,
    enabled: cars.cars.some(c => c.configKey === key),
  }));
});

function onColorToggle(key: string, enabled: boolean) {
  if (enabled && props.canvasRef) {
    const car = cars.addCar(key);
    cars.rebuildBounds(car.id, props.canvasRef.width, props.canvasRef.height);
  } else {
    const car = cars.cars.find(c => c.configKey === key);
    if (car) cars.removeCar(car.id);
  }
}

function onRemoveColour(key: string) {
  if (Object.keys(config.colorConfigs).length <= 1) return;
  const car = cars.cars.find(c => c.configKey === key);
  if (car) cars.removeCar(car.id);
  config.removeColorConfig(key);
}
</script>

<template>
  <div>
    <div v-for="entry in colorEntries" :key="entry.key"
         class="d-flex align-items-center gap-2 mb-1">
      <input type="checkbox" class="form-check-input flex-shrink-0"
             :checked="entry.enabled" title="Enable / disable car"
             @change="onColorToggle(entry.key, ($event.target as HTMLInputElement).checked)">
      <span class="flex-shrink-0 rounded border"
            style="width:100px;height:20px;display:inline-block"
            :style="{ backgroundColor: entry.config.badgeColor }"></span>
      <span class="small flex-grow-1">{{ entry.config.label }}</span>
      <button class="btn btn-sm btn-outline-danger py-0 px-1 flex-shrink-0"
              title="Remove colour"
              @click="onRemoveColour(entry.key)">×</button>
    </div>
  </div>
</template>
