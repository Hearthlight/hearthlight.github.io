import { Game } from './game.js';

const boot = document.getElementById('boot');

function fail(err) {
  console.error(err);
  if (boot) boot.textContent = 'Something went wrong: ' + (err && err.message ? err.message : err);
}

try {
  const game = new Game();
  window.game = game;
  game.start().then(() => boot && boot.remove(), fail);
} catch (err) {
  fail(err);
}
