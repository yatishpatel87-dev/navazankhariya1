/**
 * Permanent Student Profile & Photo Storage Service
 * Uses IndexedDB + LocalStorage dual-persistence so that any student profile
 * (Name, Roll No, Standard, Category, Gender, Phone, Photo, newly added children)
 * added or modified by a teacher NEVER changes, reverts, gets lost, or expires.
 */
import { Student } from '../types';

const DB_NAME = 'nzps_school_db_v2';
const DB_VERSION = 2;
const STORE_PHOTOS = 'student_photos';
const STORE_PROFILES = 'student_profiles';
const LOCAL_STORAGE_PHOTOS = 'nzps_permanent_photos_v1';
const LOCAL_STORAGE_PROFILES = 'nzps_permanent_profiles_v2';
const LOCAL_STORAGE_LOCKED = 'nzps_locked_students_v1';

class PermanentStudentStorageService {
  private photoCache: Record<string, string> = {};
  private profileCache: Record<string, Student> = {};
  private lockedIds: Set<string> = new Set();
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isHydrated = false;

  constructor() {
    this.loadFromLocalStorage();
    this.initIndexedDB();
  }

  /**
   * Fast synchronous read from memory / LocalStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const rawPhotos = localStorage.getItem(LOCAL_STORAGE_PHOTOS);
      if (rawPhotos) {
        const parsed = JSON.parse(rawPhotos);
        if (typeof parsed === 'object' && parsed !== null) {
          this.photoCache = { ...this.photoCache, ...parsed };
        }
      }

      const rawProfiles = localStorage.getItem(LOCAL_STORAGE_PROFILES);
      if (rawProfiles) {
        const parsedProfiles = JSON.parse(rawProfiles);
        if (typeof parsedProfiles === 'object' && parsedProfiles !== null) {
          this.profileCache = { ...this.profileCache, ...parsedProfiles };
        }
      }

      const rawLocked = localStorage.getItem(LOCAL_STORAGE_LOCKED);
      if (rawLocked) {
        const parsedLocked = JSON.parse(rawLocked);
        if (Array.isArray(parsedLocked)) {
          this.lockedIds = new Set(parsedLocked);
        }
      }
    } catch (e) {
      console.warn('Could not read profiles/photos from localStorage cache', e);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_PHOTOS, JSON.stringify(this.photoCache));
      localStorage.setItem(LOCAL_STORAGE_PROFILES, JSON.stringify(this.profileCache));
      localStorage.setItem(LOCAL_STORAGE_LOCKED, JSON.stringify(Array.from(this.lockedIds)));
    } catch (e) {
      console.warn('LocalStorage quota limit reached, relying on IndexedDB for permanent storage', e);
    }
  }

  /**
   * Initialize IndexedDB database connection
   */
  private initIndexedDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
          db.createObjectStore(STORE_PHOTOS, { keyPath: 'studentId' });
        }
        if (!db.objectStoreNames.contains(STORE_PROFILES)) {
          db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        resolve(db);
        // Hydrate memory cache from IndexedDB in the background
        this.hydrateFromIndexedDB(db);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async hydrateFromIndexedDB(db: IDBDatabase): Promise<void> {
    try {
      // 1. Hydrate Photos
      const tx = db.transaction([STORE_PHOTOS, STORE_PROFILES], 'readonly');
      const photoStore = tx.objectStore(STORE_PHOTOS);
      const photoReq = photoStore.getAll();

      photoReq.onsuccess = () => {
        const items: { studentId: string; photoUrl: string }[] = photoReq.result || [];
        items.forEach((item) => {
          if (item.studentId && item.photoUrl) {
            this.photoCache[item.studentId] = item.photoUrl;
          }
        });
      };

      // 2. Hydrate Profiles
      const profileStore = tx.objectStore(STORE_PROFILES);
      const profileReq = profileStore.getAll();

      profileReq.onsuccess = () => {
        const profiles: Student[] = profileReq.result || [];
        profiles.forEach((p) => {
          if (p.id) {
            this.profileCache[p.id] = {
              ...p,
              photoUrl: this.photoCache[p.id] || p.photoUrl,
            };
          }
        });
        this.saveToLocalStorage();
        this.isHydrated = true;
      };
    } catch (e) {
      console.error('Error hydrating from IndexedDB', e);
    }
  }

  // ==================== PROFILE PERSISTENCE ====================

  /**
   * Permanently save or update a student's profile.
   * This guarantees that whatever is added/edited in child profile is NEVER lost.
   */
  async saveStudentProfile(student: Student): Promise<void> {
    if (!student || !student.id) return;

    // Lock this student so it can only be modified through the explicit Edit flow
    this.lockedIds.add(student.id);

    // Preserve photo
    const finalPhoto = student.photoUrl || this.photoCache[student.id];
    const fullStudent: Student = {
      ...student,
      photoUrl: finalPhoto,
    };

    // 1. Update memory
    this.profileCache[student.id] = fullStudent;
    if (finalPhoto) {
      this.photoCache[student.id] = finalPhoto;
    }

    // 2. LocalStorage cache
    this.saveToLocalStorage();

    // 3. Permanent IndexedDB
    try {
      const db = await this.initIndexedDB();
      const tx = db.transaction([STORE_PROFILES, STORE_PHOTOS], 'readwrite');
      const profileStore = tx.objectStore(STORE_PROFILES);
      profileStore.put(fullStudent);

      if (finalPhoto) {
        const photoStore = tx.objectStore(STORE_PHOTOS);
        photoStore.put({
          studentId: student.id,
          photoUrl: finalPhoto,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('IndexedDB write error for student profile:', e);
    }
  }

  /**
   * Check if a student profile has been locked (customized/added by teacher).
   * Once locked, it can ONLY be changed via the explicit Edit modal.
   */
  isStudentLocked(studentId: string): boolean {
    return this.lockedIds.has(studentId) || (studentId.startsWith('std_') && !studentId.startsWith('std7-'));
  }

  markStudentLocked(studentId: string): void {
    this.lockedIds.add(studentId);
    this.saveToLocalStorage();
  }

  unmarkStudentLocked(studentId: string): void {
    this.lockedIds.delete(studentId);
    this.saveToLocalStorage();
  }

  /**
   * Save all students permanently
   */
  async saveAllStudentProfiles(students: Student[]): Promise<void> {
    if (!Array.isArray(students)) return;

    const newProfileCache: Record<string, Student> = {};
    students.forEach((st) => {
      const photo = st.photoUrl || this.photoCache[st.id];
      const full: Student = { ...st, photoUrl: photo };
      newProfileCache[st.id] = full;
      if (photo) {
        this.photoCache[st.id] = photo;
      }
    });

    this.profileCache = newProfileCache;
    this.saveToLocalStorage();

    try {
      const db = await this.initIndexedDB();
      const tx = db.transaction([STORE_PROFILES, STORE_PHOTOS], 'readwrite');
      const profileStore = tx.objectStore(STORE_PROFILES);
      const photoStore = tx.objectStore(STORE_PHOTOS);

      // Clear & put to keep synced
      profileStore.clear();
      students.forEach((st) => {
        const photo = st.photoUrl || this.photoCache[st.id];
        profileStore.put({ ...st, photoUrl: photo });
        if (photo) {
          photoStore.put({
            studentId: st.id,
            photoUrl: photo,
            updatedAt: new Date().toISOString(),
          });
        }
      });
    } catch (e) {
      console.warn('IndexedDB write all error:', e);
    }
  }

  /**
   * Delete a student profile permanently
   */
  async deleteStudentProfile(studentId: string): Promise<void> {
    delete this.profileCache[studentId];
    delete this.photoCache[studentId];
    this.lockedIds.delete(studentId);
    this.saveToLocalStorage();

    try {
      const db = await this.initIndexedDB();
      const tx = db.transaction([STORE_PROFILES, STORE_PHOTOS], 'readwrite');
      tx.objectStore(STORE_PROFILES).delete(studentId);
      tx.objectStore(STORE_PHOTOS).delete(studentId);
    } catch (e) {
      console.warn('IndexedDB delete student error:', e);
    }
  }

  /**
   * Synchronously retrieve student profile from memory/cache
   */
  getStudentProfileSync(studentId: string): Student | undefined {
    const prof = this.profileCache[studentId];
    if (prof) {
      return {
        ...prof,
        photoUrl: this.photoCache[studentId] || prof.photoUrl,
      };
    }
    return undefined;
  }

  /**
   * Synchronously get all student profiles
   */
  getAllStudentProfilesSync(): Student[] {
    return Object.values(this.profileCache).map((st) => ({
      ...st,
      photoUrl: this.photoCache[st.id] || st.photoUrl,
    }));
  }

  /**
   * Asynchronously get all student profiles from IndexedDB
   */
  async getAllStudentProfilesFromIndexedDB(): Promise<Student[]> {
    try {
      const db = await this.initIndexedDB();
      return new Promise((resolve) => {
        const tx = db.transaction([STORE_PROFILES, STORE_PHOTOS], 'readonly');
        const profileStore = tx.objectStore(STORE_PROFILES);
        const photoStore = tx.objectStore(STORE_PHOTOS);

        const photoReq = photoStore.getAll();
        photoReq.onsuccess = () => {
          const photoItems: { studentId: string; photoUrl: string }[] = photoReq.result || [];
          photoItems.forEach((p) => {
            if (p.studentId && p.photoUrl) {
              this.photoCache[p.studentId] = p.photoUrl;
            }
          });

          const profileReq = profileStore.getAll();
          profileReq.onsuccess = () => {
            const list: Student[] = profileReq.result || [];
            if (list.length > 0) {
              const fullList = list.map((st) => ({
                ...st,
                photoUrl: this.photoCache[st.id] || st.photoUrl,
              }));
              fullList.forEach((st) => {
                this.profileCache[st.id] = st;
              });
              this.saveToLocalStorage();
              resolve(fullList);
            } else {
              resolve(this.getAllStudentProfilesSync());
            }
          };
          profileReq.onerror = () => resolve(this.getAllStudentProfilesSync());
        };
        photoReq.onerror = () => resolve(this.getAllStudentProfilesSync());
      });
    } catch {
      return this.getAllStudentProfilesSync();
    }
  }

  // ==================== PHOTO PERSISTENCE ====================

  async savePhoto(studentId: string, photoUrl: string): Promise<void> {
    if (!studentId) return;

    this.photoCache[studentId] = photoUrl;
    if (this.profileCache[studentId]) {
      this.profileCache[studentId].photoUrl = photoUrl;
    }
    this.saveToLocalStorage();

    try {
      const db = await this.initIndexedDB();
      const tx = db.transaction([STORE_PHOTOS, STORE_PROFILES], 'readwrite');
      tx.objectStore(STORE_PHOTOS).put({
        studentId,
        photoUrl,
        updatedAt: new Date().toISOString(),
      });
      if (this.profileCache[studentId]) {
        tx.objectStore(STORE_PROFILES).put(this.profileCache[studentId]);
      }
    } catch (e) {
      console.warn('IndexedDB write photo error:', e);
    }
  }

  async removePhoto(studentId: string): Promise<void> {
    delete this.photoCache[studentId];
    if (this.profileCache[studentId]) {
      delete this.profileCache[studentId].photoUrl;
    }
    this.saveToLocalStorage();

    try {
      const db = await this.initIndexedDB();
      const tx = db.transaction(STORE_PHOTOS, 'readwrite');
      tx.objectStore(STORE_PHOTOS).delete(studentId);
    } catch (e) {
      console.warn('IndexedDB delete photo error:', e);
    }
  }

  getPhotoSync(studentId: string): string | undefined {
    return this.photoCache[studentId];
  }

  getAllPhotosSync(): Record<string, string> {
    return { ...this.photoCache };
  }

  async getAllPhotos(): Promise<Record<string, string>> {
    await this.getAllStudentProfilesFromIndexedDB();
    return { ...this.photoCache };
  }
}

export const PhotoStorage = new PermanentStudentStorageService();
export const PermanentStudentStorage = PhotoStorage;
