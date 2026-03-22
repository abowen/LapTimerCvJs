<script setup lang="ts">
import { useBestLapsStore } from '../stores/bestLaps';
import { formatLapTime, formatTimestamp } from '../utils/format';

const bestLaps = useBestLapsStore();
</script>

<template>
  <div class="card shadow-sm mb-3">
    <div class="card-header py-2 collapsible-header" data-bs-toggle="collapse"
         data-bs-target="#best-overall-body" aria-expanded="true">
      <span class="small fw-semibold">Best Laps – Top 10 Overall</span>
    </div>
    <div id="best-overall-body" class="collapse show">
      <div class="card-body py-2 px-3">
        <p v-if="bestLaps.overallBest.length === 0"
           class="text-muted small mb-0 text-center">No laps recorded yet</p>
        <div v-for="(record, i) in bestLaps.overallBest" :key="i"
             class="d-flex align-items-center gap-2 mb-1 small">
          <span class="text-muted" style="min-width: 24px">{{ i + 1 }}.</span>
          <span class="fw-semibold" style="min-width: 90px">{{ record.driver }}</span>
          <span class="font-monospace flex-grow-1">{{ formatLapTime(record.lapTimeMs) }}</span>
          <span class="text-muted">{{ formatTimestamp(record.timestamp) }}</span>
        </div>
        <button class="btn btn-sm btn-outline-danger w-100 mt-2"
                @click="bestLaps.clearAll()">Clear All</button>
      </div>
    </div>
  </div>
</template>
