// src/services/epgParser.ts
import type { EPGProgram } from './db';

// Helper to parse XMLTV dates (e.g., "20260530080000 +0000" or "20260530080000")
export function parseXmltvDate(dateStr: string): number {
  if (!dateStr) return 0;
  
  // Regex to match: YYYYMMDDHHmmss [+/-HHMM]
  const match = dateStr.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s+([+-]\d{4}))?/);
  if (!match) return 0;

  const [_, year, month, day, hour, minute, second, offset] = match;
  
  let timestamp: number;

  if (offset) {
    // Construct date as UTC first, then apply offset
    const utcDate = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1, // 0-indexed month
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    ));
    timestamp = utcDate.getTime();

    const sign = offset[0] === '+' ? -1 : 1; // if ahead (+), subtract offset to reach UTC; if behind (-), add
    const hours = parseInt(offset.substring(1, 3));
    const minutes = parseInt(offset.substring(3, 5));
    const offsetMs = (hours * 60 + minutes) * 60 * 1000;
    timestamp += sign * offsetMs;
  } else {
    // If no offset is supplied, parse as local system time
    const localDate = new Date(
      parseInt(year),
      parseInt(month) - 1, // 0-indexed month
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
    timestamp = localDate.getTime();
  }

  return timestamp;
}

export function parseEPG(xmlText: string): EPGProgram[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
  
  // Check for parse errors
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('Erro ao analisar XML do EPG: Formato XML inválido.');
  }

  const programs: EPGProgram[] = [];
  const programmeNodes = xmlDoc.getElementsByTagName('programme');

  for (let i = 0; i < programmeNodes.length; i++) {
    const node = programmeNodes[i];
    const channelTvgId = node.getAttribute('channel');
    const startStr = node.getAttribute('start');
    const stopStr = node.getAttribute('stop');

    if (!channelTvgId || !startStr || !stopStr) continue;

    const start = parseXmltvDate(startStr);
    const stop = parseXmltvDate(stopStr);

    if (start === 0 || stop === 0) continue;

    // Get Title
    const titleNode = node.getElementsByTagName('title')[0];
    const title = titleNode ? titleNode.textContent || 'Sem Título' : 'Sem Título';

    // Get Description (optional)
    const descNode = node.getElementsByTagName('desc')[0];
    const desc = descNode ? descNode.textContent || '' : '';

    // Get Category (optional)
    const catNode = node.getElementsByTagName('category')[0];
    const category = catNode ? catNode.textContent || '' : '';

    programs.push({
      id: `${channelTvgId}_${start}`,
      channelTvgId,
      start,
      stop,
      title,
      desc,
      category
    });
  }

  return programs;
}
