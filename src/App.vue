<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { DEFAULT_CAR_COLORS } from './stores/config';
import { useCarsStore } from './stores/cars';
import { useProfilesStore } from './stores/profiles';
import { useBestLapsStore } from './stores/bestLaps';
import { useCamera } from './composables/useCamera';
import { useDetection } from './composables/useDetection';
import DriversPanel from './components/DriversPanel.vue';
import StartButton from './components/StartButton.vue';
import CarsPanel from './components/CarsPanel.vue';
import BestLapsOverall from './components/BestLapsOverall.vue';
import BestLapsPerDriver from './components/BestLapsPerDriver.vue';
import BlockedRanges from './components/BlockedRanges.vue';
import ConfigPanel from './components/ConfigPanel.vue';

const cars     = useCarsStore();
const profiles = useProfilesStore();
const bestLaps = useBestLapsStore();

const videoRef  = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const driversPanelRef = ref<InstanceType<typeof DriversPanel> | null>(null);

const { status, init: initCamera } = useCamera(videoRef, canvasRef);
const { start: startDetection } = useDetection(videoRef, canvasRef);

/** Cached canvas 2d context. */
function canvasCtx(): CanvasRenderingContext2D | null {
  return canvasRef.value?.getContext('2d') ?? null;
}

function rebuildCars(colorKeys: string[]) {
  if (!canvasRef.value) return;
  cars.rebuildFromKeys(colorKeys, canvasRef.value.width, canvasRef.value.height);
}

function onCanvasClick(event: MouseEvent) {
  driversPanelRef.value?.onCanvasInteraction(event.clientX, event.clientY);
}

function onCanvasTouch(event: TouchEvent) {
  event.preventDefault();
  driversPanelRef.value?.onCanvasInteraction(event.touches[0].clientX, event.touches[0].clientY);
}

onMounted(async () => {
  try {
    await initCamera();

    const canvas = canvasRef.value!;

    // Create default cars
    for (const key of DEFAULT_CAR_COLORS) {
      const car = cars.addCar(key);
      cars.rebuildBounds(car.id, canvas.width, canvas.height);
    }

    // Profiles: ensure Demo exists, apply saved profile
    const profileKeys = profiles.ensureDefaultProfile(cars.cars, canvas.width, canvas.height);
    if (profileKeys) rebuildCars(profileKeys);

    const savedName = profiles.loadSelectedProfile();
    // If saved profile doesn't exist, fall back to first available
    const allNames = profiles.profileNames();
    const effectiveName = allNames.includes(savedName) ? savedName : allNames[0] ?? savedName;

    if (effectiveName !== savedName || profileKeys) {
      const keys = profiles.applyProfile(effectiveName, canvas.width, canvas.height);
      if (keys) rebuildCars(keys);
    }
    profiles.saveSelectedProfile(effectiveName);
    bestLaps.setActiveProfile(effectiveName);

    // Populate profile dropdown now that profiles are ready
    driversPanelRef.value?.refreshProfileNames();

    status.value = 'Ready — press Start to begin the race!';
    startDetection();
  } catch (err) {
    status.value = `Error: ${String(err)}`;
    console.error(err);
  }
});
</script>

<template>
  <main class="container-fluid py-3">
    <h1 class="text-center mb-3 fs-3">RC Lap Timer</h1>

    <!-- Camera -->
    <div class="card shadow-sm mb-3">
      <div class="card-header py-2 collapsible-header" data-bs-toggle="collapse"
           data-bs-target="#camera-body" aria-expanded="true">
        <span class="small fw-semibold">Camera</span>
      </div>
      <div id="camera-body" class="collapse show">
        <div class="card-body p-0 overflow-hidden rounded-bottom">
          <canvas ref="canvasRef" class="w-100 d-block" id="canvas"
                  @click="onCanvasClick"
                  @touchstart.prevent="onCanvasTouch"></canvas>
        </div>
      </div>
    </div>

    <DriversPanel
      ref="driversPanelRef"
      :canvas-ref="canvasRef"
      :canvas-ctx="canvasCtx()"
      @rebuild-cars="rebuildCars" />

    <StartButton />

    <CarsPanel />

    <BestLapsOverall />
    <BestLapsPerDriver />
    <BlockedRanges />
    <ConfigPanel />

    <p class="text-center text-muted mt-1 small mb-0">{{ status }}</p>
  </main>

  <!-- Hidden video element for camera feed -->
  <video ref="videoRef" autoplay playsinline muted style="display:none;"></video>
</template>
