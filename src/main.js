import './styles.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <canvas id="game" aria-label="Neon table tennis game"></canvas>
  <div class="hud">
    <div class="scoreboard"><div class="player">Player</div><div id="playerScore" class="score">0</div><div class="divider">|</div><div id="aiScore" class="score">0</div><div class="ai">Rival AI</div></div>
    <div id="message" class="message show">Click to Serve</div>
    <div class="instructions"><strong>Neon Table Tennis Championship</strong> · Move with your mouse or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> · Click / <kbd>Space</kbd> to serve · First to 7 wins.</div>
  </div>`;

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const playerScoreEl = document.querySelector('#playerScore');
const aiScoreEl = document.querySelector('#aiScore');
const messageEl = document.querySelector('#message');

const world = { width: 820, height: 1280, horizon: 120 };
const player = { x: 0, y: 510, w: 170, h: 34, score: 0 };
const ai = { x: 0, y: -510, w: 155, h: 30, score: 0 };
const ball = { x: 0, y: 260, z: 60, r: 17, vx: 0, vy: -8, vz: 3, trail: [] };
const input = { x: 0, y: player.y, keys: new Set() };
let running = false;
let gameOver = false;
let last = 0;

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const project = (x, y, z = 0) => {
  const depth = (y + world.height / 2) / world.height;
  const scale = lerp(1.18, 0.34, depth) * (1 + z / 900);
  return { x: innerWidth / 2 + x * scale, y: innerHeight * 0.14 + depth * innerHeight * 0.78 - z * scale, scale };
};

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.toggle('show', Boolean(text));
}

function updateScore() {
  playerScoreEl.textContent = player.score;
  aiScoreEl.textContent = ai.score;
}

function resetBall(towardAi = true) {
  running = false;
  ball.x = 0; ball.y = towardAi ? 250 : -250; ball.z = 70;
  ball.vx = (Math.random() - 0.5) * 4;
  ball.vy = towardAi ? -8.2 : 8.2;
  ball.vz = 3.8;
  ball.trail.length = 0;
  showMessage(gameOver ? 'Game Over' : 'Click to Serve');
}

function serve() {
  if (gameOver) {
    player.score = 0; ai.score = 0; gameOver = false; updateScore();
  }
  running = true;
  showMessage('');
}

function point(side) {
  side.score += 1;
  updateScore();
  if (side.score >= 7) {
    gameOver = true;
    showMessage(side === player ? 'Player Wins' : 'Rival AI Wins');
  }
  resetBall(side === ai);
}

function update(dt) {
  const speed = dt / 16.67;
  if (input.keys.has('KeyA')) input.x -= 12 * speed;
  if (input.keys.has('KeyD')) input.x += 12 * speed;
  if (input.keys.has('KeyW')) input.y -= 12 * speed;
  if (input.keys.has('KeyS')) input.y += 12 * speed;
  input.x = clamp(input.x, -world.width / 2 + 95, world.width / 2 - 95);
  input.y = clamp(input.y, 270, 570);
  player.x = lerp(player.x, input.x, 0.28);
  player.y = lerp(player.y, input.y, 0.22);
  ai.x = lerp(ai.x, clamp(ball.x + Math.sin(performance.now() / 290) * 58, -320, 320), 0.055);

  if (!running) return;
  ball.trail.unshift({ x: ball.x, y: ball.y, z: ball.z });
  if (ball.trail.length > 18) ball.trail.pop();
  ball.x += ball.vx * speed;
  ball.y += ball.vy * speed;
  ball.z += ball.vz * speed;
  ball.vz -= 0.27 * speed;

  if (Math.abs(ball.x) > world.width / 2 - 34) {
    ball.x = Math.sign(ball.x) * (world.width / 2 - 34);
    ball.vx *= -0.9;
  }
  if (ball.z < 19) {
    ball.z = 19;
    ball.vz = Math.abs(ball.vz) * 0.76;
  }
  hitPaddle(player, -1);
  hitPaddle(ai, 1);
  if (ball.y > world.height / 2 + 90) point(ai);
  if (ball.y < -world.height / 2 - 90) point(player);
}

function hitPaddle(paddle, direction) {
  const approaching = Math.sign(ball.vy) !== direction;
  const distanceX = Math.abs(ball.x - paddle.x);
  const distanceY = Math.abs(ball.y - paddle.y);
  if (approaching && distanceX < paddle.w * 0.58 && distanceY < 45 && ball.z < 95) {
    const offset = (ball.x - paddle.x) / (paddle.w * 0.5);
    ball.vy = direction * (8.8 + (player.score + ai.score) * 0.18);
    ball.vx = offset * 5.8;
    ball.vz = 5.6 + Math.abs(offset) * 1.7;
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, innerHeight);
  sky.addColorStop(0, '#05091d'); sky.addColorStop(0.5, '#071531'); sky.addColorStop(1, '#02030b');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    ctx.strokeStyle = `hsla(${190 + i * 18}, 95%, 62%, .${i % 2 ? 10 : 16})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(innerWidth / 2, innerHeight * 0.58, 150 + i * 90, 34 + i * 24, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTable() {
  const corners = [project(-410, -640), project(410, -640), project(410, 640), project(-410, 640)];
  const gradient = ctx.createLinearGradient(0, corners[0].y, 0, corners[2].y);
  gradient.addColorStop(0, '#113f9b'); gradient.addColorStop(0.45, '#0f947c'); gradient.addColorStop(1, '#12206a');
  ctx.beginPath(); corners.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
  ctx.fillStyle = gradient; ctx.shadowColor = '#16d9ff'; ctx.shadowBlur = 28; ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(236,252,255,.92)'; ctx.lineWidth = 4; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.76)'; ctx.lineWidth = 3;
  const a = project(0, -640), b = project(0, 640); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  const n1 = project(-430, 0, 34), n2 = project(430, 0, 34);
  ctx.strokeStyle = '#f8fbff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.stroke();
  ctx.strokeStyle = 'rgba(112,226,255,.35)'; ctx.lineWidth = 28; ctx.stroke();
}

function drawPaddle(paddle, color, glow) {
  const p = project(paddle.x, paddle.y, 34);
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.scale, p.scale * 0.58);
  ctx.shadowColor = glow; ctx.shadowBlur = 28;
  const g = ctx.createRadialGradient(-18, -14, 8, 0, 0, 86);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.15, color); g.addColorStop(1, '#270719');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, paddle.w / 2, 62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#6b3517'; ctx.fillRect(-16, 50, 32, 95);
  ctx.restore();
}

function drawBall() {
  ball.trail.forEach((t, i) => {
    const p = project(t.x, t.y, t.z);
    ctx.globalAlpha = 0.24 * (1 - i / ball.trail.length);
    ctx.fillStyle = '#ff9a4b'; ctx.beginPath(); ctx.arc(p.x, p.y, ball.r * p.scale * (1 - i / 28), 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  const p = project(ball.x, ball.y, ball.z);
  ctx.shadowColor = '#ffcf6d'; ctx.shadowBlur = 28;
  const g = ctx.createRadialGradient(p.x - 7 * p.scale, p.y - 8 * p.scale, 2, p.x, p.y, ball.r * p.scale * 1.6);
  g.addColorStop(0, '#fffef2'); g.addColorStop(0.55, '#ffd179'); g.addColorStop(1, '#ff612f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, ball.r * p.scale, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
}

function render(time = 0) {
  const dt = Math.min(time - last || 16, 32); last = time;
  update(dt); drawBackground(); drawTable();
  const drawables = [player, ai].sort((a, b) => a.y - b.y);
  drawPaddle(drawables[0], drawables[0] === player ? '#ff2a68' : '#24d8ff', drawables[0] === player ? '#ff2a68' : '#24d8ff');
  drawBall();
  drawPaddle(drawables[1], drawables[1] === player ? '#ff2a68' : '#24d8ff', drawables[1] === player ? '#ff2a68' : '#24d8ff');
  requestAnimationFrame(render);
}

resize(); resetBall(true); render();
addEventListener('resize', resize);
addEventListener('pointermove', (event) => {
  input.x = (event.clientX / innerWidth - 0.5) * world.width;
  input.y = 300 + (event.clientY / innerHeight) * 300;
});
addEventListener('click', serve);
addEventListener('keydown', (event) => { input.keys.add(event.code); if (event.code === 'Space') serve(); });
addEventListener('keyup', (event) => input.keys.delete(event.code));
