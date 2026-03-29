<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps<{
  videoRef: HTMLVideoElement | null;
}>();

interface FrameRateInfo {
  settings: { frameRate?: number };
  capabilities: { frameRate?: { min?: number; max?: number } };
}

const frameRateInfo = ref<FrameRateInfo | null>(null);
const error = ref<string | null>(null);

function refresh() {
  const video = props.videoRef;
  if (!video?.srcObject) {
    error.value = 'No active camera stream';
    frameRateInfo.value = null;
    return;
  }

  const stream = video.srcObject as MediaStream;
  const track = stream.getVideoTracks()[0];
  if (!track) {
    error.value = 'No video track found';
    frameRateInfo.value = null;
    return;
  }

  error.value = null;
  const settings = track.getSettings();
  const capabilities = typeof track.getCapabilities === 'function'
    ? track.getCapabilities()
    : {};

  frameRateInfo.value = {
    settings: { frameRate: settings.frameRate },
    capabilities: {
      frameRate: (capabilities as MediaTrackCapabilities).frameRate
        ? {
            min: (capabilities as MediaTrackCapabilities).frameRate!.min,
            max: (capabilities as MediaTrackCapabilities).frameRate!.max,
          }
        : undefined,
    },
  };
}

onMounted(() => {
  setTimeout(refresh, 1000);
});
</script>

<template>
  <div class="card shadow-sm mb-3">
    <div class="card-header py-2 collapsible-header" data-bs-toggle="collapse"
         data-bs-target="#debug-body" aria-expanded="false">
      <span class="small fw-semibold">Debug</span>
    </div>
    <div id="debug-body" class="collapse">
      <div class="card-body py-2 px-3">
        <button class="btn btn-outline-secondary btn-sm mb-2" @click="refresh">
          Refresh
        </button>

        <div v-if="error" class="text-danger small">{{ error }}</div>

        <div v-else-if="frameRateInfo">
          <table class="table table-sm table-bordered small mb-0">
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Current Frame Rate</td>
                <td>{{ frameRateInfo.settings.frameRate ?? 'N/A' }} fps</td>
              </tr>
              <tr v-if="frameRateInfo.capabilities.frameRate">
                <td>Supported Min</td>
                <td>{{ frameRateInfo.capabilities.frameRate.min }} fps</td>
              </tr>
              <tr v-if="frameRateInfo.capabilities.frameRate">
                <td>Supported Max</td>
                <td>{{ frameRateInfo.capabilities.frameRate.max }} fps</td>
              </tr>
              <tr v-if="!frameRateInfo.capabilities.frameRate">
                <td>Supported Range</td>
                <td class="text-muted">getCapabilities() not available</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="text-muted small">No data yet — press Refresh</div>
      </div>
    </div>
  </div>
</template>
