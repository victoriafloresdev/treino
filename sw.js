// Service worker: guarda o app em cache para funcionar offline.
// Sempre que mudar qualquer arquivo do app, aumente o número da versão abaixo.
const CACHE = 'treino-v7';
const ASSETS = [
  './',
  './css/app.css',
  './css/comida.css',
  './fonts/archivo.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './img/ex/Ab_Crunch_Machine-0.jpg',
  './img/ex/Ab_Crunch_Machine-1.jpg',
  './img/ex/Barbell_Hip_Thrust-0.jpg',
  './img/ex/Barbell_Hip_Thrust-1.jpg',
  './img/ex/Cable_Hammer_Curls_-_Rope_Attachment-0.jpg',
  './img/ex/Cable_Hammer_Curls_-_Rope_Attachment-1.jpg',
  './img/ex/Close-Grip_Front_Lat_Pulldown-0.jpg',
  './img/ex/Close-Grip_Front_Lat_Pulldown-1.jpg',
  './img/ex/Face_Pull-0.jpg',
  './img/ex/Face_Pull-1.jpg',
  './img/ex/Leg_Extensions-0.jpg',
  './img/ex/Leg_Extensions-1.jpg',
  './img/ex/Leg_Press-0.jpg',
  './img/ex/Leg_Press-1.jpg',
  './img/ex/Leverage_Incline_Chest_Press-0.jpg',
  './img/ex/Leverage_Incline_Chest_Press-1.jpg',
  './img/ex/Leverage_Iso_Row-0.jpg',
  './img/ex/Leverage_Iso_Row-1.jpg',
  './img/ex/Leverage_Shoulder_Press-0.jpg',
  './img/ex/Leverage_Shoulder_Press-1.jpg',
  './img/ex/Lying_Leg_Curls-0.jpg',
  './img/ex/Lying_Leg_Curls-1.jpg',
  './img/ex/Machine_Bench_Press-0.jpg',
  './img/ex/Machine_Bench_Press-1.jpg',
  './img/ex/Plank-0.jpg',
  './img/ex/Plank-1.jpg',
  './img/ex/Reverse_Machine_Flyes-0.jpg',
  './img/ex/Reverse_Machine_Flyes-1.jpg',
  './img/ex/Seated_Cable_Rows-0.jpg',
  './img/ex/Seated_Cable_Rows-1.jpg',
  './img/ex/Seated_Calf_Raise-0.jpg',
  './img/ex/Seated_Calf_Raise-1.jpg',
  './img/ex/Seated_Leg_Curl-0.jpg',
  './img/ex/Seated_Leg_Curl-1.jpg',
  './img/ex/Side_Lateral_Raise-0.jpg',
  './img/ex/Side_Lateral_Raise-1.jpg',
  './img/ex/Standing_Biceps_Cable_Curl-0.jpg',
  './img/ex/Standing_Biceps_Cable_Curl-1.jpg',
  './img/ex/Standing_Calf_Raises-0.jpg',
  './img/ex/Standing_Calf_Raises-1.jpg',
  './img/ex/Thigh_Abductor-0.jpg',
  './img/ex/Thigh_Abductor-1.jpg',
  './img/ex/Thigh_Adductor-0.jpg',
  './img/ex/Thigh_Adductor-1.jpg',
  './img/ex/Triceps_Pushdown_-_Rope_Attachment-0.jpg',
  './img/ex/Triceps_Pushdown_-_Rope_Attachment-1.jpg',
  './img/ex/Triceps_Pushdown_-_V-Bar_Attachment-0.jpg',
  './img/ex/Triceps_Pushdown_-_V-Bar_Attachment-1.jpg',
  './img/ex/Wide-Grip_Lat_Pulldown-0.jpg',
  './img/ex/Wide-Grip_Lat_Pulldown-1.jpg',
  './index.html',
  './js/app.js',
  './js/data/nutricao.js',
  './js/days.js',
  './js/daytype.js',
  './js/habitos.js',
  './js/nutri.js',
  './js/ui/plate.js',
  './js/bodymap.js',
  './js/db.js',
  './js/plan.js',
  './js/training.js',
  './js/ui.js',
  './js/util.js',
  './js/views/comida.js',
  './js/views/corpo.js',
  './js/views/hoje.js',
  './js/views/mais.js',
  './js/views/progresso.js',
  './js/views/sessao.js',
  './js/views/treino.js',
  './manifest.webmanifest',
  './vendor/chart.umd.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(r => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
