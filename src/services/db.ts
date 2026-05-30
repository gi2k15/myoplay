// src/services/db.ts

export interface Playlist {
  id?: number;
  name: string;
  type: 'file' | 'url' | 'xtream';
  url?: string;
  username?: string;
  password?: string;
  epgUrl?: string;
  createdAt: number;
}

export interface IPTVChannel {
  id: string; // generated as `playlistId_index`
  playlistId: number;
  name: string;
  logo: string;
  streamUrl: string;
  category: string;
  type: 'live' | 'movie' | 'series';
  tvgId?: string;
  groupTitle?: string;
  // Xtream Codes extra info
  xtreamId?: number;
  rating?: string;
  plot?: string;
  duration?: string;
  year?: string;
  director?: string;
  genre?: string;
}

export interface EPGProgram {
  id: string; // generated as `tvgId_start`
  channelTvgId: string;
  start: number; // epoch timestamp ms
  stop: number;  // epoch timestamp ms
  title: string;
  desc?: string;
  category?: string;
}

export interface Favorite {
  id: string; // generated as `playlistId_channelId`
  playlistId: number;
  channelId: string;
}

export interface Setting {
  key: string;
  value: any;
}

class IPTVDatabase {
  private dbName = 'iptv_player_db';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;

  init(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = request.result;

        // Playlists Store
        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true });
        }

        // Channels Store
        if (!db.objectStoreNames.contains('channels')) {
          const channelStore = db.createObjectStore('channels', { keyPath: 'id' });
          channelStore.createIndex('playlistId', 'playlistId', { unique: false });
          channelStore.createIndex('type', 'type', { unique: false });
          channelStore.createIndex('playlist_type', ['playlistId', 'type'], { unique: false });
          channelStore.createIndex('playlist_category', ['playlistId', 'category'], { unique: false });
          channelStore.createIndex('tvgId', 'tvgId', { unique: false });
        }

        // EPG Store
        if (!db.objectStoreNames.contains('epg')) {
          const epgStore = db.createObjectStore('epg', { keyPath: 'id' });
          epgStore.createIndex('channelTvgId', 'channelTvgId', { unique: false });
          epgStore.createIndex('stop', 'stop', { unique: false });
        }

        // Favorites Store
        if (!db.objectStoreNames.contains('favorites')) {
          const favStore = db.createObjectStore('favorites', { keyPath: 'id' });
          favStore.createIndex('playlistId', 'playlistId', { unique: false });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // --- PLAYLISTS ---
  async addPlaylist(playlist: Omit<Playlist, 'id'>): Promise<number> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('playlists', 'readwrite');
      const store = tx.objectStore('playlists');
      const req = store.add(playlist);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  async getPlaylists(): Promise<Playlist[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('playlists', 'readonly');
      const store = tx.objectStore('playlists');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deletePlaylist(playlistId: number): Promise<void> {
    const db = await this.init();
    // Delete playlist record, then delete all its channels and favorites
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['playlists', 'channels', 'favorites'], 'readwrite');
      
      // 1. Delete playlist metadata
      tx.objectStore('playlists').delete(playlistId);

      // 2. Delete all channels associated with playlist
      const channelStore = tx.objectStore('channels');
      const playlistIndex = channelStore.index('playlistId');
      const channelReq = playlistIndex.openCursor(IDBKeyRange.only(playlistId));
      channelReq.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // 3. Delete favorites
      const favStore = tx.objectStore('favorites');
      const favIndex = favStore.index('playlistId');
      const favReq = favIndex.openCursor(IDBKeyRange.only(playlistId));
      favReq.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- CHANNELS ---
  async addChannelsBatch(channels: IPTVChannel[], onProgress?: (percent: number) => void): Promise<void> {
    const db = await this.init();
    return new Promise<void>((resolve, reject) => {
      // Use chunks to avoid hitting memory limits or locking the database for too long
      const CHUNK_SIZE = 5000;
      let index = 0;

      const writeNextChunk = () => {
        if (index >= channels.length) {
          resolve();
          return;
        }

        const percent = Math.min(100, Math.round((index / channels.length) * 100));
        onProgress?.(percent);

        const tx = db.transaction('channels', 'readwrite');
        const store = tx.objectStore('channels');
        const chunk = channels.slice(index, index + CHUNK_SIZE);
        
        for (const channel of chunk) {
          store.put(channel);
        }

        index += CHUNK_SIZE;
        tx.oncomplete = () => writeNextChunk();
        tx.onerror = () => reject(tx.error);
      };

      writeNextChunk();
    });
  }

  async getChannels(playlistId: number): Promise<IPTVChannel[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('channels', 'readonly');
      const store = tx.objectStore('channels');
      const index = store.index('playlistId');
      const req = index.getAll(IDBKeyRange.only(playlistId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getChannelsByType(playlistId: number, type: 'live' | 'movie' | 'series'): Promise<IPTVChannel[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('channels', 'readonly');
      const store = tx.objectStore('channels');
      const index = store.index('playlist_type');
      const req = index.getAll(IDBKeyRange.only([playlistId, type]));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getChannelCategories(playlistId: number, type: 'live' | 'movie' | 'series'): Promise<string[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('channels', 'readonly');
      const store = tx.objectStore('channels');
      const index = store.index('playlist_type');
      const req = index.openCursor(IDBKeyRange.only([playlistId, type]));
      const categoriesSet = new Set<string>();

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const category = cursor.value.category || 'Sem Categoria';
          categoriesSet.add(category);
          cursor.continue();
        } else {
          resolve(Array.from(categoriesSet).sort());
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- EPG ---
  async addEpgBatch(programs: EPGProgram[], onProgress?: (percent: number) => void): Promise<void> {
    const db = await this.init();
    return new Promise<void>((resolve, reject) => {
      const CHUNK_SIZE = 5000;
      let index = 0;

      const writeNextChunk = () => {
        if (index >= programs.length) {
          resolve();
          return;
        }

        const percent = Math.min(100, Math.round((index / programs.length) * 100));
        onProgress?.(percent);

        const tx = db.transaction('epg', 'readwrite');
        const store = tx.objectStore('epg');
        const chunk = programs.slice(index, index + CHUNK_SIZE);
        
        for (const prog of chunk) {
          store.put(prog);
        }

        index += CHUNK_SIZE;
        tx.oncomplete = () => writeNextChunk();
        tx.onerror = () => reject(tx.error);
      };

      writeNextChunk();
    });
  }

  async getEpgForChannel(tvgId: string): Promise<EPGProgram[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('epg', 'readonly');
      const store = tx.objectStore('epg');
      const index = store.index('channelTvgId');
      const req = index.getAll(IDBKeyRange.only(tvgId));
      req.onsuccess = () => {
        const results = req.result || [];
        // Sort by start time
        results.sort((a, b) => a.start - b.start);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getCurrentAndNextProgramme(tvgId: string): Promise<{ current?: EPGProgram; next?: EPGProgram }> {
    const programs = await this.getEpgForChannel(tvgId);
    const now = Date.now();
    let current: EPGProgram | undefined;
    let next: EPGProgram | undefined;

    for (let i = 0; i < programs.length; i++) {
      const prog = programs[i];
      if (now >= prog.start && now <= prog.stop) {
        current = prog;
        next = programs[i + 1];
        break;
      } else if (prog.start > now) {
        // If nothing is playing now, this is the upcoming one
        next = prog;
        break;
      }
    }

    return { current, next };
  }

  async clearEpg(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('epg', 'readwrite');
      const store = tx.objectStore('epg');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async cleanOldEpg(): Promise<number> {
    const db = await this.init();
    const now = Date.now();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('epg', 'readwrite');
      const store = tx.objectStore('epg');
      const index = store.index('stop');
      // Delete programs that ended more than 24 hours ago
      const cutoff = now - 24 * 60 * 60 * 1000;
      const range = IDBKeyRange.upperBound(cutoff);
      const req = index.openCursor(range);
      let count = 0;

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          count++;
          cursor.continue();
        } else {
          resolve(count);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- FAVORITES ---
  async addFavorite(playlistId: number, channelId: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('favorites', 'readwrite');
      const store = tx.objectStore('favorites');
      const id = `${playlistId}_${channelId}`;
      const req = store.put({ id, playlistId, channelId });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async removeFavorite(playlistId: number, channelId: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('favorites', 'readwrite');
      const store = tx.objectStore('favorites');
      const id = `${playlistId}_${channelId}`;
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getFavorites(playlistId: number): Promise<string[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('favorites', 'readonly');
      const store = tx.objectStore('favorites');
      const index = store.index('playlistId');
      const req = index.getAll(IDBKeyRange.only(playlistId));
      req.onsuccess = () => {
        const results = req.result || [];
        resolve(results.map(f => f.channelId));
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- SETTINGS ---
  async setSetting(key: string, value: any): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getSetting(key: string, defaultValue: any = null): Promise<any> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result.value);
        } else {
          resolve(defaultValue);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
}

export const db = new IPTVDatabase();
