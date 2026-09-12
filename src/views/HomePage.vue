<template>
  <ion-page>
    <ion-header class="app-header">
      <ion-toolbar>
        <ion-title>
          <span class="brand">Photo<span class="brand-accent">Gallery</span></span>
        </ion-title>
        <div slot="end" class="counter">
          <span class="counter-value">{{ String(photos.length).padStart(2, '0') }}</span>
          <span class="counter-label">{{ photos.length === 1 ? 'frame' : 'frames' }}</span>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Empty state: only after the saved photos have finished loading. -->
      <div v-if="!loading && photos.length === 0" class="empty">
        <div class="empty-frame">
          <ion-icon :icon="cameraOutline" />
        </div>
        <h2>No frames captured</h2>
        <p>Tap the shutter below to take a photo or pull one from your gallery.</p>
      </div>

      <!-- Responsive Ionic grid: 3 across on phones, up to 6 on desktop. -->
      <ion-grid v-else class="gallery">
        <ion-row>
          <ion-col
            v-for="(photo, i) in photos"
            :key="photo.filepath"
            size="4"
            size-md="3"
            size-lg="2"
          >
            <button class="tile" :aria-label="'Open photo ' + (i + 1)" @click="viewer = photo">
              <ion-img :src="photo.webviewPath" />
              <span class="tile-index">{{ String(i + 1).padStart(2, '0') }}</span>
            </button>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button aria-label="Add photo" @click="addPhoto">
          <ion-icon :icon="camera" />
        </ion-fab-button>
      </ion-fab>

      <!-- Camera/storage problems surface here instead of breaking the app. -->
      <ion-toast
        :is-open="!!error"
        :message="error ?? ''"
        :duration="3000"
        color="danger"
        @did-dismiss="error = null"
      />
    </ion-content>

    <!-- Full-screen viewer: tapping a tile opens the photo, not a bare menu. -->
    <ion-modal :is-open="viewer !== null" @did-dismiss="viewer = null">
      <ion-header class="app-header">
        <ion-toolbar>
          <ion-title>
            <span class="viewer-date">{{ viewer ? takenAt(viewer) : '' }}</span>
          </ion-title>
          <ion-buttons slot="end">
            <ion-button aria-label="Close" @click="viewer = null">
              <ion-icon slot="icon-only" :icon="close" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="viewer-body">
        <img v-if="viewer" :src="viewer.webviewPath" class="viewer-img" alt="" />
      </ion-content>

      <ion-footer class="viewer-footer">
        <ion-toolbar>
          <ion-button fill="clear" color="danger" expand="block" @click="removeViewed">
            <ion-icon slot="start" :icon="trash" />
            Delete frame
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonGrid,
  IonHeader,
  IonIcon,
  IonImg,
  IonModal,
  IonPage,
  IonRow,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/vue';
import { camera, cameraOutline, close, trash } from 'ionicons/icons';
import { usePhotoGallery, type UserPhoto } from '@/composables/usePhotoGallery';

const { photos, loading, error, addPhoto, deletePhoto, loadSaved } = usePhotoGallery();

/** The photo shown in the full-screen viewer, or null when it is closed. */
const viewer = ref<UserPhoto | null>(null);

// Restore the gallery from the Filesystem every time the app starts.
onMounted(loadSaved);

/** Files are named after their capture time, so the date needs no extra storage. */
function takenAt(photo: UserPhoto): string {
  const ts = Number(photo.filepath.split('.')[0]);
  if (!Number.isFinite(ts)) return 'Untitled frame';
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function removeViewed() {
  if (!viewer.value) return;
  const target = viewer.value;
  viewer.value = null;
  await deletePhoto(target);
}
</script>

<style scoped>
/* ---------- Header ---------- */
.app-header ion-toolbar {
  --background: var(--app-bg);
  --border-width: 0 0 1px 0;
  --border-color: var(--app-border);
  --min-height: 56px;
  --padding-start: 16px;
  --padding-end: 12px;
}

.app-header::after {
  display: none; /* kill Ionic's drop shadow; the hairline is the edge */
}

.brand {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-text);
}

.brand-accent {
  color: var(--app-accent);
}

.counter {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding-right: 4px;
}

.counter-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text);
}

.counter-label {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-text-faint);
}

/* ---------- Gallery grid ---------- */
.gallery {
  padding: 6px 5px 96px;
}

.tile {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 0;
  margin: 0;
  overflow: hidden;
  cursor: pointer;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  transition: border-color 140ms ease, transform 140ms ease;
}

.tile ion-img {
  width: 100%;
  height: 100%;
}

.tile ion-img::part(image) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Index sits in a corner notch — a quiet technical marker, not a badge. */
.tile-index {
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 3px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.06em;
  color: var(--app-text);
  background: rgba(11, 13, 16, 0.72);
  border-top-right-radius: var(--app-radius);
  opacity: 0;
  transition: opacity 140ms ease;
}

.tile:hover {
  border-color: var(--app-border-strong);
}

.tile:hover .tile-index {
  opacity: 1;
}

.tile:active {
  transform: scale(0.975);
  border-color: var(--app-accent);
}

.tile:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 2px;
}

/* ---------- Empty state ---------- */
.empty {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  padding: 0 40px;
  text-align: center;
}

.empty-frame {
  width: 76px;
  height: 76px;
  margin: 0 auto 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border-strong);
  border-radius: var(--app-radius-lg);
  background: var(--app-surface);
}

.empty-frame ion-icon {
  font-size: 32px;
  color: var(--app-accent);
}

.empty h2 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--app-text);
}

.empty p {
  max-width: 280px;
  margin: 0 auto;
  font-size: 13px;
  line-height: 1.6;
  color: var(--app-text-dim);
}

/* ---------- Shutter ---------- */
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

/* ---------- Viewer ---------- */
.viewer-date {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.05em;
  color: var(--app-text-dim);
  text-transform: uppercase;
}

.viewer-body {
  --background: #000000;
}

/* Fill the viewport and letterbox, so small images scale up instead of
   floating at their natural size in the middle of a black field. */
.viewer-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 12px;
  object-fit: contain;
}

.viewer-footer ion-toolbar {
  --background: var(--app-bg);
  --border-width: 1px 0 0 0;
  --border-color: var(--app-border);
  --padding-top: 4px;
  --padding-bottom: 4px;
}

.viewer-footer ion-button {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>
