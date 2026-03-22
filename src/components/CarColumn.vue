<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import type { CarData } from '../types';
import { useConfigStore } from '../stores/config';
import { useCarsStore } from '../stores/cars';
import { useRaceStore } from '../stores/race';
import { drawCarRangeBar } from '../services/overlays';
import { formatTime } from '../utils/format';

const props = defineProps<{
  car: CarData;
}>();

const config    = useConfigStore();
const carsStore = useCarsStore();
const race      = useRaceStore();

const rangeCanvasRef = ref<HTMLCanvasElement | null>(null);

const colorConfig = () => config.colorConfigs[props.car.configKey];

function redrawRangeBar() {
  if (!rangeCanvasRef.value) return;
  const cfg = colorConfig();
  if (cfg) drawCarRangeBar(rangeCanvasRef.value, cfg);
}

onMounted(() => {
  nextTick(() => redrawRangeBar());
});

watch(() => props.car.configKey, () => nextTick(redrawRangeBar));

function onToggleDisabled() {
  carsStore.toggleDisabled(props.car.id, config.cooldownMs);
}

/** Timer display — depends on race.frameTimestamp which updates every rAF tick. */
function timerDisplay(): string {
  if (props.car.disabled) return '00.000';
  if (race.state === 'running') return formatTime(race.frameTimestamp - props.car.timerStart);
  return '00.000';
}
</script>

<template>
  <div class="car-col card shadow-sm"
       :style="{ opacity: car.disabled ? '0.45' : '' }">
    <div class="card-header p-2 d-flex flex-column gap-1">
      <div class="d-flex align-items-center gap-1">
        <span class="small fw-semibold flex-grow-1"
              :style="{ color: colorConfig()?.badgeColor }">
          {{ colorConfig()?.label }}
        </span>
        <button class="btn btn-sm flex-shrink-0"
                :class="car.disabled ? 'btn-warning' : 'btn-outline-secondary'"
                :title="car.disabled ? 'Enable detection' : 'Disable detection'"
                @click="onToggleDisabled">
          {{ car.disabled ? '▶' : '⏹' }}
        </button>
      </div>
      <canvas ref="rangeCanvasRef" class="w-100 d-block rounded" height="40"></canvas>
      <div class="car-timer" :style="{ color: colorConfig()?.badgeColor }">
        {{ timerDisplay() }}
      </div>
      <span v-if="car.showDetectionBadge"
            class="badge text-center"
            :style="{ background: colorConfig()?.badgeColor }">
        Detected!
      </span>
      <span v-if="car.showCooldownBadge"
            class="badge bg-secondary text-center">
        ⏸ Cooldown…
      </span>
    </div>
    <div class="card-body p-2" style="max-height: 40dvh; overflow-y: auto;">
      <div>
        <span v-for="(lap, index) in car.lapTimes" :key="index"
              class="badge car-lap-entry"
              :style="{ background: colorConfig()?.badgeColor }">
          {{ lap }}
        </span>
      </div>
    </div>
  </div>
</template>
