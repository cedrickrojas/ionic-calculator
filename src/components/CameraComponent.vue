<template>
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :aria-label="label" :disabled="disabled" @click="emit('capture')">
      <ion-icon :icon="camera" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonFab, IonFabButton, IonIcon } from '@ionic/vue';
import { camera } from 'ionicons/icons';

/**
 * The shutter control. Deliberately owns no gallery state: `usePhotoGallery()`
 * builds fresh refs on every call, so a component that called it again would
 * capture into a gallery nobody is rendering. The page keeps the composable and
 * this component only reports the tap.
 */
withDefaults(
  defineProps<{
    /** Blocked while the saved gallery is still loading, to avoid a capture
        landing in a list that `loadSaved` is about to overwrite. */
    disabled?: boolean;
    label?: string;
  }>(),
  { disabled: false, label: 'Add photo' }
);

const emit = defineEmits<{ capture: [] }>();
</script>

<style scoped>
ion-fab {
  margin: 0 6px 6px 0;
}

ion-fab-button {
  --background: var(--app-accent);
  --background-activated: var(--app-accent-press);
  --background-hover: var(--app-accent-hover);
  --color: #ffffff;
  --border-radius: var(--app-radius-lg);
  --box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
  --size: 54px;
}
</style>
