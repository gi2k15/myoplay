// src/services/playlistUpdater.ts
import { db, type Playlist } from './db';
import { parseM3U } from './m3uParser';
import { parseEPG } from './epgParser';
import { XtreamClient } from './xtreamClient';

export class PlaylistUpdater {
  // Silent background update check
  static async checkAndRunAutoUpdates(): Promise<void> {
    try {
      const interval = await db.getSetting('playlist_update_interval', 24);
      if (interval === 'never' || interval === 0 || interval === '0') {
        console.log('[PlaylistUpdater] Auto-update is disabled.');
        return;
      }

      const intervalHours = Number(interval);
      if (isNaN(intervalHours) || intervalHours <= 0) {
        console.warn('[PlaylistUpdater] Invalid update interval:', interval);
        return;
      }

      const intervalMs = intervalHours * 60 * 60 * 1000;
      const playlists = await db.getPlaylists();
      const now = Date.now();

      for (const pl of playlists) {
        if (pl.type === 'file') continue; // cannot auto-update uploaded files

        const lastUpdated = pl.lastUpdatedAt || pl.createdAt;
        const elapsed = now - lastUpdated;

        if (elapsed > intervalMs) {
          console.log(`[PlaylistUpdater] Playlist "${pl.name}" needs update (elapsed: ${(elapsed / 3600000).toFixed(1)}h > ${intervalHours}h)`);
          try {
            await this.updatePlaylist(pl);
            console.log(`[PlaylistUpdater] Successfully updated playlist: "${pl.name}"`);
          } catch (err) {
            console.error(`[PlaylistUpdater] Failed to update playlist "${pl.name}":`, err);
          }
        }
      }
    } catch (err) {
      console.error('[PlaylistUpdater] Error during auto-update check:', err);
    }
  }

  // Update a specific playlist
  static async updatePlaylist(pl: Playlist, onProgress?: (msg: string, percent?: number) => void): Promise<void> {
    if (!pl.id) return;

    if (pl.type === 'url') {
      if (!pl.url) throw new Error('Playlist has no URL');
      onProgress?.('Baixando arquivo M3U...', 0);
      
      const proxy = await db.getSetting('cors_proxy_url', 'http://localhost:8088/?url=');
      const fetchUrl = proxy ? `${proxy}${encodeURIComponent(pl.url)}` : pl.url;

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`Erro de rede HTTP ${res.status}`);
      }
      const text = await res.text();

      onProgress?.('Analisando lista M3U...', 50);
      const { channels, epgUrl: autoEpg } = parseM3U(text, pl.id);

      if (channels.length === 0) {
        throw new Error('Nenhum canal encontrado na lista');
      }

      onProgress?.('Limpando canais antigos...', 70);
      await db.clearPlaylistChannels(pl.id);

      onProgress?.('Salvando novos canais...', 80);
      const mappedChannels = channels.map(c => ({
        ...c,
        id: c.id.includes('_') ? `${pl.id}_${c.id.split('_').slice(1).join('_')}` : `${pl.id}_${c.id}`,
        playlistId: pl.id as number
      }));
      await db.addChannelsBatch(mappedChannels);

      // Auto update EPG if epgUrl exists
      const finalEpgUrl = pl.epgUrl || autoEpg;
      if (finalEpgUrl) {
        onProgress?.('Atualizando guia EPG...', 90);
        try {
          await this.updateEpg(finalEpgUrl);
          if (autoEpg && autoEpg !== pl.epgUrl) {
            pl.epgUrl = autoEpg;
          }
        } catch (e) {
          console.warn('Erro ao atualizar EPG durante update da lista:', e);
        }
      }

      pl.lastUpdatedAt = Date.now();
      await db.updatePlaylist(pl);

      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('playlist-updated', { detail: { playlistId: pl.id } }));

    } else if (pl.type === 'xtream') {
      if (!pl.url || !pl.username || !pl.password) throw new Error('Credenciais do Xtream incompletas');
      onProgress?.('Conectando ao servidor Xtream...', 10);

      const proxy = await db.getSetting('cors_proxy_url', 'http://localhost:8088/?url=');
      const client = new XtreamClient({
        url: pl.url,
        username: pl.username,
        password: pl.password,
        corsProxy: proxy
      });

      const auth = await client.authenticate();
      if (!auth.success) {
        throw new Error(`Autenticação Xtream falhou: ${auth.message}`);
      }

      onProgress?.('Baixando dados do Xtream...', 30);
      const channels = await client.fetchAllData(pl.id, (msg, percent) => {
        onProgress?.(`Baixando dados Xtream: ${msg}`, percent);
      });

      if (channels.length === 0) {
        throw new Error('Nenhum canal encontrado no Xtream');
      }

      onProgress?.('Limpando canais antigos...', 70);
      await db.clearPlaylistChannels(pl.id);

      onProgress?.('Salvando novos canais...', 80);
      const mappedChannels = channels.map(c => ({
        ...c,
        id: c.id.includes('_') ? `${pl.id}_${c.id.split('_').slice(1).join('_')}` : `${pl.id}_${c.id}`,
        playlistId: pl.id as number
      }));
      await db.addChannelsBatch(mappedChannels);

      // Xtream standard EPG url
      let baseUrl = pl.url.trim();
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'http://' + baseUrl;
      }
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      const autoEpg = `${baseUrl}/xmltv.php?username=${pl.username.trim()}&password=${pl.password.trim()}`;
      
      onProgress?.('Atualizando guia EPG...', 90);
      try {
        await this.updateEpg(autoEpg);
        pl.epgUrl = autoEpg;
      } catch (e) {
        console.warn('Erro ao atualizar EPG do Xtream:', e);
      }

      pl.lastUpdatedAt = Date.now();
      await db.updatePlaylist(pl);

      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('playlist-updated', { detail: { playlistId: pl.id } }));
    }
  }

  // Helper to fetch and parse EPG
  private static async updateEpg(epgUrl: string): Promise<void> {
    const proxy = await db.getSetting('cors_proxy_url', 'http://localhost:8088/?url=');
    const fetchUrl = proxy ? `${proxy}${encodeURIComponent(epgUrl)}` : epgUrl;

    const res = await fetch(fetchUrl);
    if (!res.ok) {
      throw new Error(`Erro de rede EPG HTTP ${res.status}`);
    }
    const text = await res.text();
    const programs = parseEPG(text);
    if (programs.length > 0) {
      await db.addEpgBatch(programs);
    }
  }
}
