<script setup lang="ts">
import { ref, computed } from 'vue';
import { useConfigStore, DEFAULT_PROFILE_NAME } from '../stores/config';
import { useRaceStore } from '../stores/race';
import { useCarsStore } from '../stores/cars';
import { useProfilesStore } from '../stores/profiles';
import { useBestLapsStore } from '../stores/bestLaps';
import type { Profile } from '../types';

const config   = useConfigStore();
const race     = useRaceStore();
const cars     = useCarsStore();
const profiles = useProfilesStore();
const bestLaps = useBestLapsStore();

const emit = defineEmits<{
  rebuildCars: [colorKeys: string[]];
}>();

const props = defineProps<{
  canvasRef: HTMLCanvasElement | null;
}>();

const profileNames = ref<string[]>([]);
const importStatusText = ref('');
const importStatusClass = ref('');
const showImportStatus = ref(false);
const importFileRef = ref<HTMLInputElement | null>(null);

function refreshProfileNames() {
  profileNames.value = profiles.profileNames();
}

const canDeleteProfile = computed(() => profileNames.value.length > 1 && race.state === 'idle');
const profileSelectDisabled = computed(() => race.state !== 'idle');

function switchToProfile(name: string) {
  if (!props.canvasRef) return;
  const colorKeys = profiles.applyProfile(name, props.canvasRef.width, props.canvasRef.height);
  if (colorKeys) emit('rebuildCars', colorKeys);
  bestLaps.setActiveProfile(name);
  profiles.saveSelectedProfile(name);
}

function onProfileChange(event: Event) {
  const name = (event.target as HTMLSelectElement).value;
  switchToProfile(name);
}

function onSaveProfile() {
  profiles.saveCurrentProfile(profiles.selectedProfile, cars.cars);
}

function onCopyProfile() {
  const inputName = prompt('New profile name (copy of current):');
  if (!inputName?.trim()) return;
  const name = inputName.trim();
  profiles.saveCurrentProfile(name, cars.cars);
  profiles.saveSelectedProfile(name);
  refreshProfileNames();
}

function onAddProfile() {
  const inputName = prompt('New profile name:');
  if (!inputName?.trim()) return;
  const name = inputName.trim();
  cars.removeAllCars();
  config.replaceColorConfigs({});
  profiles.saveCurrentProfile(name, cars.cars);
  profiles.saveSelectedProfile(name);
  refreshProfileNames();
}

function onDeleteProfile() {
  const name = profiles.selectedProfile;
  if (!name || profileNames.value.length <= 1) return;
  if (!confirm(`Delete profile "${name}"?`)) return;
  profiles.deleteProfileByName(name);
  refreshProfileNames();
  const first = profileNames.value[0];
  if (first) switchToProfile(first);
}

function onExportProfile() {
  const name = profiles.selectedProfile || DEFAULT_PROFILE_NAME;
  const data = profiles.exportProfile(name);
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function onImportProfile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string) as Profile;
      if (!data.colors || !data.carAssignments) throw new Error('Invalid profile');
      const name = file.name.replace(/\.json$/i, '');
      profiles.importProfile(name, data);
      refreshProfileNames();
      switchToProfile(name);
      importStatusText.value = `Imported profile "${name}"`;
      importStatusClass.value = 'small text-success mb-0';
      showImportStatus.value = true;
    } catch (err) {
      importStatusText.value = `Import failed: ${String(err)}`;
      importStatusClass.value = 'small text-danger mb-0';
      showImportStatus.value = true;
    }
    if (importFileRef.value) importFileRef.value.value = '';
  };
  reader.readAsText(file);
}

defineExpose({ refreshProfileNames });
</script>

<template>
  <!-- Profile selector -->
  <div class="d-flex align-items-center gap-2 mb-2">
    <label for="profile-select" class="mb-0 small fw-semibold text-end"
           style="flex:1 1 0;min-width:0">Profile:</label>
    <select id="profile-select" class="form-select form-select-sm"
            style="flex:1 1 0;min-width:0"
            :value="profiles.selectedProfile"
            :disabled="profileSelectDisabled"
            @change="onProfileChange">
      <option v-for="name in profileNames" :key="name" :value="name">{{ name }}</option>
    </select>
    <button class="btn btn-sm btn-primary" style="flex:1 1 0;min-width:0"
            @click="onSaveProfile">Save</button>
  </div>

  <!-- Profile actions -->
  <div class="d-flex align-items-center gap-2 mb-2">
    <button class="btn btn-sm btn-outline-success flex-grow-1" @click="onAddProfile">New</button>
    <button class="btn btn-sm btn-outline-primary flex-grow-1" @click="onCopyProfile">Copy</button>
    <button class="btn btn-sm btn-outline-danger flex-grow-1"
            :disabled="!canDeleteProfile"
            @click="onDeleteProfile">Delete</button>
  </div>

  <!-- Export / Import -->
  <div class="d-flex align-items-center gap-2 mt-2 mb-2">
    <button class="btn btn-sm btn-outline-primary flex-grow-1" @click="onExportProfile">⬇ Export Profile</button>
    <label class="btn btn-sm btn-outline-secondary flex-grow-1 mb-0" for="import-file">⬆ Import Profile</label>
    <input type="file" id="import-file" ref="importFileRef" accept=".json" class="d-none"
           @change="onImportProfile">
  </div>
  <p v-if="showImportStatus" :class="importStatusClass">{{ importStatusText }}</p>
</template>
