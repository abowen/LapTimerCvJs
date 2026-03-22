<script setup lang="ts">
import { computed } from 'vue';
import { useBlockedRangesStore } from '../stores/blockedRanges';
import { hsvToRgb } from '../utils/color';

const blocked = useBlockedRangesStore();

const hasEntries = computed(() => blocked.entries.length > 0);

function swatchColor(entry: typeof blocked.entries[0]): string {
  const r = entry.range;
  const [rv, gv, bv] = hsvToRgb(
    Math.round((r.hMin + r.hMax) / 2),
    Math.round((r.sMin + r.sMax) / 2),
    Math.round((r.vMin + r.vMax) / 2),
  );
  return `rgb(${rv},${gv},${bv})`;
}

function rangeLabel(entry: typeof blocked.entries[0]): string {
  const r = entry.range;
  return `H: ${r.hMin}–${r.hMax}  S: ${r.sMin}–${r.sMax}  V: ${r.vMin}–${r.vMax}`;
}

function onRemove(index: number) {
  blocked.removeEntry(index);
}
</script>

<template>
  <div v-if="hasEntries" class="card shadow-sm mb-3">
    <div class="card-header py-2 collapsible-header small fw-semibold"
         data-bs-toggle="collapse" data-bs-target="#blocked-body" aria-expanded="true">
      <span>Blocked HSV Ranges</span>
    </div>
    <div id="blocked-body" class="collapse show">
      <div class="card-body py-2 px-3">
        <div v-for="(entry, index) in blocked.entries" :key="index"
             class="d-flex align-items-center gap-2 mb-1">
          <span class="flex-shrink-0 rounded border"
                style="width: 100px; height: 20px; display: inline-block"
                :style="{ backgroundColor: swatchColor(entry) }"></span>
          <span class="font-monospace small flex-grow-1">{{ rangeLabel(entry) }}</span>
          <button class="btn btn-sm btn-outline-danger py-0 px-1 flex-shrink-0"
                  title="Remove block" @click="onRemove(index)">×</button>
        </div>
      </div>
    </div>
  </div>
</template>
