// src/services/xtreamClient.ts
import type { IPTVChannel } from './db';

export interface XtreamServerInfo {
  url: string;
  username: string;
  password: string;
  corsProxy?: string;
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
}

export interface XtreamEpisode {
  id: string;
  title: string;
  episodeNum: number;
  seasonNum: number;
  logo: string;
  streamUrl: string;
  duration?: string;
  plot?: string;
}

export class XtreamClient {
  private url: string;
  private username: string;
  private password: string;
  private corsProxy: string;

  constructor(server: XtreamServerInfo) {
    // Normalize URL
    let baseUrl = server.url.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }
    // Remove trailing slash
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    this.url = baseUrl;
    this.username = server.username.trim();
    this.password = server.password.trim();
    this.corsProxy = server.corsProxy || '';
  }

  private buildUrl(action?: string, extraParams: Record<string, string> = {}): string {
    const params = new URLSearchParams({
      username: this.username,
      password: this.password,
      ...extraParams
    });

    if (action) {
      params.append('action', action);
    }

    const fullUrl = `${this.url}/player_api.php?${params.toString()}`;
    
    if (this.corsProxy) {
      return `${this.corsProxy}${encodeURIComponent(fullUrl)}`;
    }
    return fullUrl;
  }

  async authenticate(): Promise<{ success: boolean; message: string; expDate?: string }> {
    try {
      const fetchUrl = this.buildUrl();
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        return { success: false, message: `Erro do servidor: Código HTTP ${res.status}` };
      }

      const data = await res.json();
      if (data?.user_info?.auth === 1) {
        const exp = data.user_info.exp_date;
        let expDateStr = 'Ilimitado';
        if (exp && exp !== 'null' && exp !== '') {
          const d = new Date(parseInt(exp) * 1000);
          expDateStr = d.toLocaleDateString();
        }
        return { 
          success: true, 
          message: `Conectado com sucesso! Status: ${data.user_info.status}. Expira em: ${expDateStr}`,
          expDate: expDateStr
        };
      } else {
        return { success: false, message: 'Falha na autenticação. Usuário ou senha incorretos.' };
      }
    } catch (err: any) {
      console.error(err);
      return { success: false, message: `Não foi possível conectar ao servidor: ${err.message || err}` };
    }
  }

  private async fetchCategories(action: 'get_live_categories' | 'get_vod_categories' | 'get_series_categories'): Promise<Record<string, string>> {
    try {
      const fetchUrl = this.buildUrl(action);
      const res = await fetch(fetchUrl);
      if (!res.ok) return {};
      const data: XtreamCategory[] = await res.json();
      
      const categories: Record<string, string> = {};
      if (Array.isArray(data)) {
        for (const cat of data) {
          categories[cat.category_id] = cat.category_name;
        }
      }
      return categories;
    } catch (err) {
      console.error(err);
      return {};
    }
  }

  async fetchAllData(playlistId: number, onProgress?: (msg: string, percent?: number) => void): Promise<IPTVChannel[]> {
    const channels: IPTVChannel[] = [];

    // 1. Fetch categories in parallel
    onProgress?.('Carregando categorias do servidor...', 10);
    const [liveCats, vodCats, seriesCats] = await Promise.all([
      this.fetchCategories('get_live_categories'),
      this.fetchCategories('get_vod_categories'),
      this.fetchCategories('get_series_categories')
    ]);

    // 2. Fetch Live Streams
    try {
      onProgress?.('Buscando canais ao vivo...', 30);
      const liveRes = await fetch(this.buildUrl('get_live_streams'));
      if (liveRes.ok) {
        const liveStreams = await liveRes.json();
        if (Array.isArray(liveStreams)) {
          for (let i = 0; i < liveStreams.length; i++) {
            const stream = liveStreams[i];
            const catName = liveCats[stream.category_id] || 'Canais ao Vivo';
            // Live stream url: http://host:port/live/username/password/stream_id.ts
            const streamUrl = `${this.url}/live/${this.username}/${this.password}/${stream.stream_id}.ts`;
            channels.push({
              id: `${playlistId}_live_${stream.stream_id}`,
              playlistId,
              name: stream.name || 'Canal sem nome',
              logo: stream.stream_icon || '',
              streamUrl,
              category: catName,
              type: 'live',
              tvgId: stream.epg_channel_id || '',
              groupTitle: catName,
              xtreamId: stream.stream_id
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching live streams', err);
    }

    // 3. Fetch VOD Movies
    try {
      onProgress?.('Buscando filmes sob demanda (VOD)...', 60);
      const vodRes = await fetch(this.buildUrl('get_vod_streams'));
      if (vodRes.ok) {
        const vodStreams = await vodRes.json();
        if (Array.isArray(vodStreams)) {
          for (let i = 0; i < vodStreams.length; i++) {
            const stream = vodStreams[i];
            const catName = vodCats[stream.category_id] || 'Filmes VOD';
            const ext = stream.container_extension || 'mp4';
            const streamUrl = `${this.url}/movie/${this.username}/${this.password}/${stream.stream_id}.${ext}`;
            channels.push({
              id: `${playlistId}_movie_${stream.stream_id}`,
              playlistId,
              name: stream.name || 'Filme sem nome',
              logo: stream.stream_icon || '',
              streamUrl,
              category: catName,
              type: 'movie',
              groupTitle: catName,
              xtreamId: stream.stream_id,
              rating: stream.rating || undefined,
              plot: stream.plot || undefined,
              duration: stream.duration || undefined,
              year: stream.year || undefined,
              added: stream.added ? String(stream.added) : undefined
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching VOD streams', err);
    }

    // 4. Fetch Series metadata lists
    try {
      onProgress?.('Buscando séries...', 85);
      const seriesRes = await fetch(this.buildUrl('get_series'));
      if (seriesRes.ok) {
        const seriesList = await seriesRes.json();
        if (Array.isArray(seriesList)) {
          for (let i = 0; i < seriesList.length; i++) {
            const series = seriesList[i];
            const catName = seriesCats[series.category_id] || 'Séries TV';
            // We save the series as a "channel" in channels DB so that the UI can browse it.
            // The streaming URL for a series will point to series info (we will fetch episodes details dynamically)
            channels.push({
              id: `${playlistId}_series_${series.series_id}`,
              playlistId,
              name: series.name || 'Série sem nome',
              logo: series.cover || '',
              streamUrl: `series_info://${series.series_id}`, // Special internal protocol to denote series info
              category: catName,
              type: 'series',
              groupTitle: catName,
              xtreamId: series.series_id,
              rating: series.rating || undefined,
              plot: series.plot || undefined,
              year: series.releaseDate || undefined,
              added: series.last_modified ? String(series.last_modified) : undefined
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching series list', err);
    }

    onProgress?.('Concluindo carregamento...', 95);
    return channels;
  }

  // Fetch episodes details for a given series
  async fetchSeriesEpisodes(seriesId: number): Promise<Record<number, XtreamEpisode[]>> {
    try {
      const fetchUrl = this.buildUrl('get_series_info', { series_id: String(seriesId) });
      const res = await fetch(fetchUrl);
      if (!res.ok) return {};

      const data = await res.json();
      const episodesData = data?.episodes;
      const parsedSeasons: Record<number, XtreamEpisode[]> = {};

      if (episodesData && typeof episodesData === 'object') {
        for (const seasonKey of Object.keys(episodesData)) {
          const seasonNum = parseInt(seasonKey);
          const episodesList = episodesData[seasonKey];
          
          if (Array.isArray(episodesList)) {
            parsedSeasons[seasonNum] = episodesList.map((ep: any) => {
              const ext = ep.container_extension || 'mp4';
              const streamUrl = `${this.url}/series/${this.username}/${this.password}/${ep.id}.${ext}`;
              return {
                id: String(ep.id),
                title: ep.title || `Episódio ${ep.episode_num}`,
                episodeNum: parseInt(ep.episode_num) || 0,
                seasonNum,
                logo: ep.info?.movie_image || '',
                streamUrl,
                duration: ep.info?.duration || undefined,
                plot: ep.info?.plot || undefined
              };
            });
            
            // Sort episodes by episode number
            parsedSeasons[seasonNum].sort((a, b) => a.episodeNum - b.episodeNum);
          }
        }
      }

      return parsedSeasons;
    } catch (err) {
      console.error('Error fetching series episodes', err);
      return {};
    }
  }
}
