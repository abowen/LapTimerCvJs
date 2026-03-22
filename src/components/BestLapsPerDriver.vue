<script setup lang="ts">
import { useBestLapsStore } from '../stores/bestLaps';
import { formatLapTime, formatTimestamp } from '../utils/format';

const bestLaps = useBestLapsStore();

function onClearDriver(driver: string) {
  bestLaps.clearDriver(driver);
}
</script>

<template>
  <div class="card shadow-sm mb-3">
    <div class="card-header py-2 collapsible-header" data-bs-toggle="collapse"
         data-bs-target="#best-driver-body" aria-expanded="true">
      <span class="small fw-semibold">Best Laps – Top 5 Per Driver</span>
    </div>
    <div id="best-driver-body" class="collapse show">
      <div class="card-body py-2 px-3">
        <p v-if="bestLaps.perDriverBest.length === 0"
           class="text-muted small mb-0 text-center">No laps recorded yet</p>

        <template v-for="group in bestLaps.perDriverBest" :key="group.driver">
          <div class="d-flex align-items-center gap-2 mb-1">
            <span class="small fw-semibold flex-grow-1">{{ group.driver }}</span>
            <button class="btn btn-sm btn-outline-danger py-0 px-1"
                    @click="onClearDriver(group.driver)">Clear</button>
          </div>
          <div v-for="(record, i) in group.laps" :key="i"
               class="d-flex align-items-center gap-2 mb-1 small ps-2">
            <span class="text-muted" style="min-width: 24px">{{ i + 1 }}.</span>
            <span class="font-monospace flex-grow-1">{{ formatLapTime(record.lapTimeMs) }}</span>
            <span class="text-muted">{{ formatTimestamp(record.timestamp) }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
