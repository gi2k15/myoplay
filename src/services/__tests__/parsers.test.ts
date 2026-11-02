import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseM3U } from '../m3uParser.ts';
import { parseXmltvDate } from '../epgParser.ts';

test('M3U names keep their commas, quoted attributes too', () => {
  const { channels } = parseM3U('#EXTM3U\n#EXTINF:-1 group-title="Filmes, Ação",Matrix, The (1999)\nhttp://a/1.mp4', 1);
  assert.equal(channels[0].name, 'Matrix, The (1999)');
  assert.equal(channels[0].groupTitle, 'Filmes, Ação');
  assert.equal(channels[0].type, 'movie');
});

test('M3U ids survive reordering and repeated URLs stay unique', () => {
  const a = parseM3U('#EXTINF:-1,A\nhttp://a/1\n#EXTINF:-1,B\nhttp://a/2\n#EXTINF:-1,B2\nhttp://a/2', 1).channels;
  const b = parseM3U('#EXTINF:-1,B\nhttp://a/2\n#EXTINF:-1,A\nhttp://a/1', 1).channels;
  assert.equal(a[0].id, b[1].id);
  assert.notEqual(a[1].id, a[2].id);
  assert.deepEqual(a.map(c => c.index), [0, 1, 2]);
});

test('M3U empty input gives no channels', () => {
  assert.deepEqual(parseM3U('', 1).channels, []);
});

test('XMLTV dates apply the offset', () => {
  const utc = Date.UTC(2026, 4, 30, 5, 0, 0);
  assert.equal(parseXmltvDate('20260530080000 +0300'), utc);
  assert.equal(parseXmltvDate('20260530080000 +03:00'), utc);
  assert.equal(parseXmltvDate('20260530050000 Z'), utc);
  assert.equal(parseXmltvDate('20260530020000 -0300'), utc);
  assert.equal(parseXmltvDate('garbage'), 0);
});
