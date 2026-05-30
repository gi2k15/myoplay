// src/services/m3uParser.ts
import type { IPTVChannel } from './db';

interface ParsedPlaylist {
  channels: IPTVChannel[];
  epgUrl?: string;
}

export function parseM3U(m3uText: string, playlistId: number): ParsedPlaylist {
  const channels: IPTVChannel[] = [];
  let epgUrl: string | undefined;

  // Split by line breaks (support \r\n and \n)
  const lines = m3uText.split(/\r?\n/);
  
  let currentChannel: Partial<IPTVChannel> = {};
  let channelIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    // Header check
    if (line.startsWith('#EXTM3U')) {
      // Look for url-tvg or x-tvg-url inside the header
      const tvgUrlMatch = line.match(/(?:url-tvg|x-tvg-url)="([^"]+)"/i);
      if (tvgUrlMatch) {
        epgUrl = tvgUrlMatch[1];
      }
      continue;
    }

    // #EXTINF info line
    if (line.startsWith('#EXTINF:')) {
      // Reset current channel for safety
      currentChannel = {};

      // Parse metadata from EXTINF
      // Syntax: #EXTINF:<duration> tvg-id="..." tvg-logo="..." group-title="..." ,<channel name>
      const infoPart = line.substring(8);
      const commaIndex = infoPart.lastIndexOf(',');
      
      let attrsPart = infoPart;
      let name = '';

      if (commaIndex !== -1) {
        attrsPart = infoPart.substring(0, commaIndex);
        name = infoPart.substring(commaIndex + 1).trim();
      } else {
        name = infoPart.trim();
      }

      currentChannel.name = name;

      // Extract attributes
      const tvgIdMatch = attrsPart.match(/tvg-id="([^"]*)"/i);
      const logoMatch = attrsPart.match(/(?:tvg-logo|logo)="([^"]*)"/i);
      const groupMatch = attrsPart.match(/(?:group-title)="([^"]*)"/i);

      if (tvgIdMatch) currentChannel.tvgId = tvgIdMatch[1];
      if (logoMatch) currentChannel.logo = logoMatch[1];
      if (groupMatch) currentChannel.groupTitle = groupMatch[1];

      continue;
    }

    // #EXTGRP line (some playlists define group here instead)
    if (line.startsWith('#EXTGRP:')) {
      currentChannel.groupTitle = line.substring(8).trim();
      continue;
    }

    // Direct stream link (anything that doesn't start with '#' is treated as a URL)
    if (!line.startsWith('#')) {
      const streamUrl = line;
      
      if (currentChannel.name) {
        const group = currentChannel.groupTitle || 'Sem Grupo';
        
        // Categorize based on group title and name heuristics
        let type: 'live' | 'movie' | 'series' = 'live';
        const groupLower = group.toLowerCase();
        const nameLower = currentChannel.name.toLowerCase();

        if (
          groupLower.includes('filme') || 
          groupLower.includes('movie') || 
          groupLower.includes('vod') || 
          groupLower.includes('cinema') ||
          (groupLower.includes('filmes') && !groupLower.includes('canais'))
        ) {
          type = 'movie';
        } else if (
          groupLower.includes('serie') || 
          groupLower.includes('série') || 
          groupLower.includes('show') ||
          groupLower.includes('temporada') ||
          groupLower.includes('ep.') ||
          nameLower.includes('s01') || 
          nameLower.includes('s02') || 
          nameLower.includes('s03')
        ) {
          type = 'series';
        }

        channels.push({
          id: `${playlistId}_${channelIndex++}`,
          playlistId,
          name: currentChannel.name,
          logo: currentChannel.logo || '',
          streamUrl,
          category: group,
          type,
          tvgId: currentChannel.tvgId || '',
          groupTitle: group
        });
      }

      currentChannel = {}; // Reset for the next record
    }
  }

  return { channels, epgUrl };
}
