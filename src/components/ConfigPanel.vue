<script setup lang="ts">
import { useConfigStore } from '../stores/config';
import { useRaceStore } from '../stores/race';

const config = useConfigStore();
const race   = useRaceStore();
</script>

<template>
  <div class="card shadow-sm mb-3">
    <div class="card-header py-2 collapsible-header" data-bs-toggle="collapse"
         data-bs-target="#config-body" aria-expanded="false">
      <span class="small fw-semibold">Configuration</span>
    </div>
    <div id="config-body" class="collapse">
      <div class="card-body py-2 px-3">
        <div class="row g-2">
          <div class="col-3">
            <label for="laps-input" class="form-label small mb-1">Laps</label>
            <input type="number" id="laps-input"
                   class="form-control form-control-sm"
                   min="1" max="99"
                   v-model.number="race.lapsTarget"
                   :disabled="race.state !== 'idle'">
          </div>
          <div class="col-3">
            <label for="cfg-min-area" class="form-label small mb-1">Min Detection (px²)</label>
            <input type="number" id="cfg-min-area"
                   class="form-control form-control-sm"
                   min="1"
                   v-model.number="config.minArea">
          </div>
          <div class="col-3">
            <label for="cfg-cooldown" class="form-label small mb-1">Cooldown (ms)</label>
            <input type="number" id="cfg-cooldown"
                   class="form-control form-control-sm"
                   min="0" step="100"
                   v-model.number="config.cooldownMs">
          </div>
          <div class="col-3">
            <label for="cfg-hsv-size" class="form-label small mb-1">HSV Size (px)</label>
            <input type="number" id="cfg-hsv-size"
                   class="form-control form-control-sm"
                   min="1" max="200"
                   v-model.number="config.hsvSampleSize">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
