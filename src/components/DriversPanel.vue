<script setup lang="ts">
import { ref } from 'vue';
import { useConfigStore } from '../stores/config';
import { sampleHsvAt } from '../services/camera';
import type { HsvRange } from '../types';

import ProfileManager from './ProfileManager.vue';
import ColoursList from './ColoursList.vue';
import HsvSampler from './HsvSampler.vue';

const config = useConfigStore();

const emit = defineEmits<{
  rebuildCars: [colorKeys: string[]];
}>();

const props = defineProps<{
  canvasRef: HTMLCanvasElement | null;
  canvasCtx: CanvasRenderingContext2D | null;
}>();

const profileManagerRef = ref<InstanceType<typeof ProfileManager> | null>(null);

// HSV sample state passed down to HsvSampler
const hsvResult = ref<HsvRange | null>(null);
const hsvSwatchDataUrl = ref('');

function onCanvasInteraction(clientX: number, clientY: number) {
  if (!props.canvasRef || !props.canvasCtx) return;
  const rect = props.canvasRef.getBoundingClientRect();
  const px = Math.round((clientX - rect.left) * (props.canvasRef.width / rect.width));
  const py = Math.round((clientY - rect.top) * (props.canvasRef.height / rect.height));

  const { range, imageData } = sampleHsvAt(px, py, props.canvasRef, props.canvasCtx, config.hsvSampleSize);
  hsvResult.value = range;

  // Render swatch as data URL
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);
  const swatchCanvas = document.createElement('canvas');
  swatchCanvas.width = 48;
  swatchCanvas.height = 48;
  swatchCanvas.getContext('2d')!.drawImage(tempCanvas, 0, 0, 48, 48);
  hsvSwatchDataUrl.value = swatchCanvas.toDataURL();
}

function refreshProfileNames() {
  profileManagerRef.value?.refreshProfileNames();
}

defineExpose({ onCanvasInteraction, refreshProfileNames });
</script>

<template>
  <div class="card shadow-sm mb-3">
    <div class="card-header py-2 collapsible-header" data-bs-toggle="collapse"
         data-bs-target="#hsv-helper-body" aria-expanded="true">
      <span class="small fw-semibold">Drivers and Track</span>
    </div>
    <div id="hsv-helper-body" class="collapse show">
      <div class="card-body py-2 px-3">
        <ProfileManager ref="profileManagerRef"
                        :canvas-ref="canvasRef"
                        @rebuild-cars="(keys) => emit('rebuildCars', keys)" />

        <ColoursList :canvas-ref="canvasRef" />

        <HsvSampler :canvas-ref="canvasRef"
                    :hsv-result="hsvResult"
                    :swatch-data-url="hsvSwatchDataUrl" />
      </div>
    </div>
  </div>
</template>
