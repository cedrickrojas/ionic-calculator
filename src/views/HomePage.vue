<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Photo Gallery</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Photo Gallery</ion-title>
        </ion-toolbar>
      </ion-header>

      <!-- Empty state: shown only once the saved photos have finished loading. -->
      <div v-if="!loading && photos.length === 0" class="empty-state">
        <ion-icon :icon="imagesOutline" class="empty-icon" />
        <h2>No photos yet</h2>
        <p>Tap the camera button below to take or choose your first photo.</p>
      </div>

      <!-- Responsive Ionic grid: 2 columns on phones, more on larger screens. -->
      <ion-grid v-else>
        <ion-row>
          <ion-col
            v-for="photo in photos"
            :key="photo.filepath"
            size="6"
            size-md="4"
            size-lg="3"
          >
            <ion-img
              :src="photo.webviewPath"
              class="gallery-photo"
              @click="confirmDelete(photo)"
            />
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button aria-label="Add photo" @click="addPhoto">
          <ion-icon :icon="camera" />
        </ion-fab-button>
      </ion-fab>

      <!-- Camera/storage problems are reported here instead of breaking the app. -->
      <ion-toast
        :is-open="!!error"
        :message="error ?? ''"
        :duration="3000"
        color="danger"
        @did-dismiss="error = null"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import {
  IonCol,
  IonContent,
  IonFab,
  IonFabButton,
  IonGrid,
  IonHeader,
  IonIcon,
  IonImg,
  IonPage,
  IonRow,
  IonTitle,
  IonToast,
  IonToolbar,
  actionSheetController,
} from '@ionic/vue';
import { camera, imagesOutline, trash, close } from 'ionicons/icons';
import { usePhotoGallery, type UserPhoto } from '@/composables/usePhotoGallery';

const { photos, loading, error, addPhoto, deletePhoto, loadSaved } = usePhotoGallery();

// Restore the gallery from the Filesystem every time the app starts.
onMounted(loadSaved);

/** Tapping a photo offers to remove it. */
async function confirmDelete(photo: UserPhoto) {
  const actionSheet = await actionSheetController.create({
    header: 'Photo',
    buttons: [
      { text: 'Delete', role: 'destructive', icon: trash, handler: () => { deletePhoto(photo); } },
      { text: 'Cancel', role: 'cancel', icon: close },
    ],
  });
  await actionSheet.present();
}
</script>

<style scoped>
.gallery-photo {
  aspect-ratio: 1 / 1;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: var(--ion-color-light);
  cursor: pointer;
}

.gallery-photo::part(image) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  padding: 0 32px;
  text-align: center;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 8px;
}

.empty-state h2 {
  margin: 0 0 8px;
  font-size: 20px;
  color: var(--ion-text-color);
}

.empty-state p {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
}
</style>
