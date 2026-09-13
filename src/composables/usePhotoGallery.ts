import { ref } from 'vue';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, type Photo } from '@capacitor/camera';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

/** Preferences key holding the index (list) of saved photos. */
const PHOTO_STORAGE = 'photos';

export interface UserPhoto {
  /** File name inside the app's Filesystem data directory. */
  filepath: string;
  /** Image format, used to rebuild a data URL when displaying in the browser. */
  format: string;
  /** Source the <ion-img> can actually render. Rebuilt on every launch. */
  webviewPath?: string;
}

/** True on Android/iOS, false when running through `ionic serve`. */
const isNative = Capacitor.isNativePlatform();

/** Turns a blob/file URL into raw base64 (no `data:` prefix). Browser path only. */
async function base64FromPath(path: string): Promise<string> {
  const response = await fetch(path);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected image data.'));
        return;
      }
      resolve(stripDataUrlPrefix(result));
    };
    reader.readAsDataURL(blob);
  });
}

/** `data:image/jpeg;base64,AAAA` -> `AAAA` */
function stripDataUrlPrefix(value: string): string {
  const comma = value.indexOf(',');
  return comma >= 0 ? value.slice(comma + 1) : value;
}

/** Filesystem returns a string on native and may return a Blob on the web. */
async function toBase64(data: string | Blob): Promise<string> {
  if (typeof data === 'string') return stripDataUrlPrefix(data);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the stored image.'));
    reader.onload = () => resolve(stripDataUrlPrefix(String(reader.result)));
    reader.readAsDataURL(data);
  });
}

/**
 * True only when the Filesystem is certain the file is gone. Any other failure
 * (a locked database, a plugin that is not ready yet) is transient, and pruning
 * on one would throw away a photo whose bytes are still on disk.
 */
function isMissingFile(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return /nots*exist|nos*suchs*file|nots*found/i.test(message);
}

export function usePhotoGallery() {
  const photos = ref<UserPhoto[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  /** Persists only the metadata; the image bytes live in the Filesystem. */
  async function cachePhotoIndex() {
    await Preferences.set({
      key: PHOTO_STORAGE,
      value: JSON.stringify(
        photos.value.map(({ filepath, format }) => ({ filepath, format }))
      ),
    });
  }

  /** Builds a renderable src for a photo that is already on disk. */
  async function resolveWebviewPath(photo: UserPhoto): Promise<string> {
    if (isNative) {
      // Native WebViews cannot read `file://` directly; Capacitor proxies it.
      const { uri } = await Filesystem.getUri({
        path: photo.filepath,
        directory: Directory.Data,
      });
      return Capacitor.convertFileSrc(uri);
    }

    // On the web the file lives in IndexedDB, so read it back as a data URL.
    const file = await Filesystem.readFile({
      path: photo.filepath,
      directory: Directory.Data,
    });
    return `data:image/${photo.format};base64,${await toBase64(file.data)}`;
  }

  /** Writes the captured image to the Filesystem and returns its gallery entry. */
  async function savePicture(photo: Photo): Promise<UserPhoto> {
    const format = photo.format || 'jpeg';
    const fileName = `${Date.now()}.${format}`;

    // Native gives us a real file path; the browser gives us a blob URL.
    let base64Data: string;
    if (isNative && photo.path) {
      const file = await Filesystem.readFile({ path: photo.path });
      base64Data = await toBase64(file.data);
    } else if (photo.webPath) {
      base64Data = await base64FromPath(photo.webPath);
    } else {
      throw new Error('The camera did not return any image data.');
    }

    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });

    const saved: UserPhoto = { filepath: fileName, format };
    saved.webviewPath = isNative
      ? await resolveWebviewPath(saved)
      : `data:image/${format};base64,${base64Data}`;

    return saved;
  }

  /**
   * Opens the camera and adds the captured photo to the gallery.
   * Cancellation and camera errors are surfaced as messages, never as a crash.
   */
  async function addPhoto() {
    error.value = null;
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        // Camera only — no gallery picking. In the browser this is the
        // <pwa-camera-modal> registered in main.ts.
        source: CameraSource.Camera,
      });

      const newPhoto = await savePicture(photo);
      photos.value = [newPhoto, ...photos.value];
      await cachePhotoIndex();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // A cancelled picker is a normal outcome, not something worth reporting.
      if (/cancel/i.test(message)) return;
      error.value = message || 'Could not add the photo.';
    }
  }

  /** Removes the file from disk and drops it from the saved index. */
  async function deletePhoto(photo: UserPhoto) {
    photos.value = photos.value.filter((p) => p.filepath !== photo.filepath);
    await cachePhotoIndex();
    try {
      await Filesystem.deleteFile({ path: photo.filepath, directory: Directory.Data });
    } catch {
      // The entry is already gone from the gallery; a missing file is harmless.
    }
  }

  /** Restores the gallery on launch: read the index, then re-link each file. */
  async function loadSaved() {
    loading.value = true;
    error.value = null;
    try {
      const { value } = await Preferences.get({ key: PHOTO_STORAGE });
      const stored: UserPhoto[] = value ? JSON.parse(value) : [];

      const restored: UserPhoto[] = [];
      let pruned = false;
      for (const photo of stored) {
        try {
          restored.push({ ...photo, webviewPath: await resolveWebviewPath(photo) });
        } catch (e) {
          if (isMissingFile(e)) {
            // The file is really gone, so the index entry is dead weight.
            pruned = true;
            continue;
          }
          // Transient failure: keep the entry, unrendered, so the next launch
          // can resolve it again instead of losing the photo for good.
          restored.push({ ...photo, webviewPath: undefined });
        }
      }

      photos.value = restored;
      // Rewrite the index only when an entry was genuinely dropped.
      if (pruned) await cachePhotoIndex();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load saved photos.';
      photos.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { photos, loading, error, addPhoto, deletePhoto, loadSaved };
}
