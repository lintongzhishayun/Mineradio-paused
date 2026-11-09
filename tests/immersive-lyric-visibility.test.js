'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(appRoot, 'public/js/modules/07-fx/07-bindings-shelf-immersive.js'),
  'utf8',
);

function extractSetImmersiveMode() {
  const start = source.indexOf('function setImmersiveMode(on) {');
  const end = source.indexOf('\nfunction toggleImmersiveMode()', start);
  assert.notEqual(start, -1, 'setImmersiveMode() must exist');
  assert.notEqual(end, -1, 'setImmersiveMode() must have a closing boundary');
  return source.slice(start, end);
}

function createImmersiveContext(initialLyrics) {
  const calls = [];
  const bottomBar = {
    classList: {
      contains(name) { return name === 'visible'; },
      add(name) { calls.push(`bottomBar.add:${name}`); },
      remove(name) { calls.push(`bottomBar.remove:${name}`); },
    },
  };
  const context = {
    fx: { particleLyrics: initialLyrics, shelf: 'stage' },
    immersiveMode: false,
    immersiveState: {},
    shelfPinnedOpen: false,
    controlsAutoHide: false,
    controlsHovering: false,
    lyricsVisible: initialLyrics,
    document: {
      body: {
        classList: {
          add(name) { calls.push(`body.add:${name}`); },
          remove(name) { calls.push(`body.remove:${name}`); },
        },
      },
      getElementById(id) {
        return id === 'bottom-bar' ? bottomBar : null;
      },
    },
    closeImmersiveInterference() { calls.push('closeImmersiveInterference'); },
    syncControlsAutoHideButton() {},
    updateImmersiveButton() {},
    syncCursorAutoHideMode() {},
    revealBottomControls() {},
    setControlsHidden() {},
    closeMiniQueue() {},
    setShelfMode() {},
    setShelfPinnedOpen() {},
    showToast() {},
    setTimeout() {},
  };
  context.setParticleLyricsSilently = function (on) {
    calls.push(`setParticleLyricsSilently:${!!on}`);
    context.fx.particleLyrics = !!on;
    context.lyricsVisible = context.fx.particleLyrics;
  };
  vm.createContext(context);
  vm.runInContext(extractSetImmersiveMode(), context, {
    filename: '07-bindings-shelf-immersive.js',
  });
  return { context, calls };
}

test('entering immersive mode preserves a hidden-lyrics preference', () => {
  const { context, calls } = createImmersiveContext(false);
  context.setImmersiveMode(true);
  assert.equal(context.immersiveMode, true);
  assert.equal(context.immersiveState.lyrics, false);
  assert.equal(context.fx.particleLyrics, false);
  assert.equal(
    calls.some(call => call === 'setParticleLyricsSilently:true'),
    false,
    'immersive mode must not silently turn lyrics on',
  );
  context.fx.particleLyrics = true;
  context.setImmersiveMode(false);
  assert.equal(context.fx.particleLyrics, false);
  assert.ok(calls.includes('setParticleLyricsSilently:false'));
});

test('entering immersive mode leaves already-visible lyrics visible', () => {
  const { context, calls } = createImmersiveContext(true);
  context.setImmersiveMode(true);
  assert.equal(context.immersiveMode, true);
  assert.equal(context.immersiveState.lyrics, true);
  assert.equal(context.fx.particleLyrics, true);
  assert.equal(
    calls.some(call => call.startsWith('setParticleLyricsSilently:')),
    false,
    'entering immersive mode must not overwrite the existing lyric setting',
  );
});
