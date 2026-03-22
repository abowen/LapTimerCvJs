<script setup lang="ts">
import { useCarsStore } from '../stores/cars';
import CarColumn from './CarColumn.vue';

const cars = useCarsStore();
</script>

<template>
  <div class="card shadow-sm mb-3">
    <div class="card-header py-2 collapsible-header" data-bs-toggle="collapse"
         data-bs-target="#cars-body" aria-expanded="true">
      <span class="small fw-semibold">Cars</span>
    </div>
    <div id="cars-body" class="collapse show">
      <div class="card-body py-2 px-3">
        <div class="d-flex flex-wrap gap-2">
          <CarColumn v-for="car in cars.cars" :key="car.id" :car="car" />
        </div>
      </div>
    </div>
  </div>
</template>
