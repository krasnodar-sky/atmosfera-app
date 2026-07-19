/* ============================================================
   Атмосфера — TG Mini App прототип
   Данные: data/content.json (пишет отдельный агент).
   Фактическая схема content.json (сверено с файлом 20.07):

   {
     "meta": { "festName", "dates", "place", "tagline",
               "locationRevealAt": "2026-08-15T12:00:00+03:00" },
     "program": [ { "day", "note",
                    "blocks": [ { "time", "title", "place", "desc" } ] } ],
     "lineup":  [ { "name", "kind", "headliner": bool, "bio",
                    "links": [ "https://…" ] } ],
     "mapZones":[ { "id", "name", "desc", "icon" } ],   // без x/y —
                                                        // раскладка в ZONE_POS
     "checklist":[ { "category", "items": [ "…" ] } ],
     "food":    { "intro", "options": [ { "title", "desc" } ], "teaNote" },
     "surroundings":[ { "name", "distance", "desc", "tip" } ],
     "rules":   { "intro", "items": [ "…" ], "quietHours",
                  "sos": [ { "title", "desc" } ] },
     "info":    { "orgContact": "@artemiy_kar", "channelLink",
                  "howToGet", "roadNote" }
   }

   Рендеры также понимают упрощённые формы (плоский checklist,
   food-массив, sos-строка, зоны с x/y) — на них завязан FALLBACK.
   Каскад данных: fetch → localStorage-кэш → встроенный FALLBACK.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Telegram WebApp ---------- */
  var tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
  var isTG = false;
  try { isTG = !!(tg && tg.initData); } catch (e) { isTG = false; }
  if (isTG) {
    try { tg.ready(); tg.expand(); } catch (e) { /* noop */ }
  }

  function openLink(url) {
    if (!url) return;
    if (isTG && typeof tg.openLink === 'function') {
      try { tg.openLink(url); return; } catch (e) { /* fallthrough */ }
    }
    window.open(url, '_blank', 'noopener');
  }

  function openTelegramLink(url) {
    if (isTG && typeof tg.openTelegramLink === 'function') {
      try { tg.openTelegramLink(url); return; } catch (e) { /* fallthrough */ }
    }
    openLink(url);
  }

  /* ---------- утилиты ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text; // всегда textContent, никакого сырого innerHTML
    return node;
  }

  function store(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* noop */ }
  }
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  /* ---------- встроенный фолбэк-контент ---------- */
  var FALLBACK = {
    meta: {
      dates: '20–23 августа 2026',
      place: 'пос. Мезмай, Краснодарский край',
      locationRevealAt: '2026-08-15T00:00:00+03:00'
    },
    program: [
      { day: 'День 1 · четверг', date: '20 августа', blocks: [
        { time: '16:00', title: 'Заезд, заселение, приветственный чай', place: 'Поляна' },
        { time: '20:00', title: 'Открытие и вечер у костра', place: 'Главная сцена' }
      ] },
      { day: 'День 2 · пятница', date: '21 августа', blocks: [
        { time: '10:00', title: 'Утренняя практика и дыхание', place: 'Тихая зона' },
        { time: '19:00', title: 'Музыкальный вечер: первые имена лайнапа', place: 'Главная сцена' }
      ] },
      { day: 'День 3 · суббота', date: '22 августа', blocks: [
        { time: '12:00', title: 'Ярмарка, мастер-классы, фудтрак', place: 'Поляна' },
        { time: '20:00', title: 'Главный концертный вечер', place: 'Главная сцена' }
      ] },
      { day: 'День 4 · воскресенье', date: '23 августа', blocks: [
        { time: '11:00', title: 'Прощальный завтрак и круг благодарностей', place: 'Поляна' },
        { time: '14:00', title: 'Выезд', place: '—' }
      ] }
    ],
    lineup: [
      { name: 'Имя объявим скоро', kind: 'музыка', headliner: true,
        bio: 'Хедлайнер фестиваля. Имя откроем в канале ближе к датам — следите за анонсами ✨',
        links: [] },
      { name: 'Живая музыка у костра', kind: 'акустика', headliner: false,
        bio: 'Вечерние акустические сеты: гитара, голос и звёздное небо Мезмая.',
        links: [] },
      { name: 'Лекторий и практики', kind: 'лекторий', headliner: false,
        bio: 'Разговоры о горах, тишине и простых вещах. Расписание появится в программе.',
        links: [] }
    ],
    mapZones: [
      { id: 'main-stage', name: 'Главная сцена', icon: '🎵' },
      { id: 'cafe', name: 'Фудтрак', icon: '🍲' },
      { id: 'practice-1', name: 'Тихая зона', icon: '🌿' },
      { id: 'practice-2', name: 'Костровая', icon: '🔥' },
      { id: 'camping', name: 'Кемпинг', icon: '⛺' },
      { id: 'entrance', name: 'Вход', icon: '❤️' },
      { id: 'parking', name: 'Парковка', icon: '🚗' }
    ],
    checklist: [
      { category: 'Тепло и ночь', items: [
        'Палатка, спальник и коврик',
        'Тёплый слой на ночь — в горах свежо',
        'Плед для вечеров у костра'
      ] },
      { category: 'Личное', items: [
        'Фонарик или налобник',
        'Кружка и многоразовая бутылка',
        'Средство от комаров'
      ] }
    ],
    food: {
      intro: 'На поляне будет тёплая еда и чай — голодными не останетесь ❤️',
      options: [
        { title: 'Фудтрак «Лагонаки»', desc: 'Горячее, простое и честное — готовим тут же, на поляне.' },
        { title: 'Своя еда', desc: 'Можно привезти с собой — у костровой есть место для своих котелков.' }
      ],
      teaNote: 'В чайной — травяные чаи с местных трав, какао и что-нибудь сладкое к вечеру 🍵'
    },
    surroundings: [
      { name: 'Ущелье реки Курджипс', desc: 'Прогулка вдоль реки прямо из посёлка — вода холодная и очень чистая.' },
      { name: 'Гуамское ущелье', desc: 'Скалы, узкоколейка и виды — классика окрестностей Мезмая.' },
      { name: 'Лаго-Наки', desc: 'Плато с альпийскими лугами — если будет свободный день, съездить стоит.' }
    ],
    info: {
      howToGet: [
        'Доезжаете до посёлка Мезмай (Краснодарский край) — дальше совсем немного.',
        'Ближе к фесту пришлём точную точку и подробный маршрут в чат участников.'
      ],
      roadNote: 'Последний участок дороги грунтовый — обычная легковая проезжает, но после дождя лучше не спешить 🤍'
    },
    rules: {
      items: [
        'Бережно относимся к поляне: мусор уносим с собой или в наши мешки.',
        'Костры — только в костровой зоне и только с дежурным.',
        'Друг к другу — тепло. Фестиваль маленький, все свои.'
      ],
      quietHours: 'Тихие часы — с 23:00 до 09:00: ночью говорим шёпотом и слушаем горы 🤍',
      sos: [
        { title: 'Стало плохо', desc: 'Сразу скажи любому из команды фестиваля или напиши организатору @artemiy_kar — мы рядом и поможем.' },
        { title: 'Организатор', desc: 'Артём — @artemiy_kar. Потерялся, сломалось, непонятно — пиши смело.' }
      ]
    }
  };

  /* ---------- загрузка данных: fetch → кэш → фолбэк ---------- */
  var CACHE_KEY = 'atmos_content';

  function loadData() {
    return fetch('data/content.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (json) {
        store(CACHE_KEY, json);
        return json;
      })
      .catch(function () {
        var cached = read(CACHE_KEY, null);
        if (cached && typeof cached === 'object') return cached;
        return FALLBACK;
      });
  }

  /* ---------- табы ---------- */
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabs.forEach(function (b) { b.classList.toggle('active', b === btn); });
      document.querySelectorAll('.screen').forEach(function (s) {
        s.classList.toggle('active', s.id === 'screen-' + btn.dataset.tab);
      });
      window.scrollTo({ top: 0 });
    });
  });

  /* ============================================================
     ПРОГРАММА
     ============================================================ */
  var FAV_KEY = 'atmos_fav';
  var favs = read(FAV_KEY, []);
  var favFilterOn = false;

  var programList = document.getElementById('program-list');
  var programEmpty = document.getElementById('program-empty');
  var favFilterBtn = document.getElementById('fav-filter');

  favFilterBtn.addEventListener('click', function () {
    favFilterOn = !favFilterOn;
    updateFavBtn();
    renderProgram(lastData);
  });

  function updateFavBtn() {
    favFilterBtn.classList.toggle('on', favFilterOn);
    favFilterBtn.textContent = favFilterOn ? '❤️ Избранное' : '🤍 Избранное';
  }

  function renderProgram(data) {
    programList.textContent = '';
    var days = (data && data.program) || [];
    var shown = 0;

    days.forEach(function (day, di) {
      var blocks = (day && day.blocks) || [];
      var dayWrap = el('div', 'day-block');
      var titleText = day.day ? day.day : ('День ' + (di + 1) + (day.date ? ' · ' + day.date : ''));
      var dt = el('div', 'day-title');
      dt.appendChild(document.createTextNode(titleText));
      var badge = el('span', 'badge-pre', 'предварительно');
      dt.appendChild(badge);

      var anyInDay = false;
      blocks.forEach(function (b, bi) {
        var key = di + ':' + bi;
        var isFav = favs.indexOf(key) !== -1;
        if (favFilterOn && !isFav) return;

        anyInDay = true;
        shown++;

        var row = el('div', 'event');
        row.appendChild(el('div', 'event-time', b.time || '—'));
        var main = el('div', 'event-main');
        main.appendChild(el('div', 'event-title', b.title || ''));
        if (b.desc) main.appendChild(el('div', 'event-place', b.desc));
        if (b.place) main.appendChild(el('div', 'event-place', '📍 ' + b.place));
        row.appendChild(main);

        var star = el('button', 'star-btn' + (isFav ? ' on' : ''), '⭐');
        star.type = 'button';
        star.setAttribute('aria-label', 'В избранное');
        star.addEventListener('click', function () {
          var i = favs.indexOf(key);
          if (i === -1) favs.push(key); else favs.splice(i, 1);
          store(FAV_KEY, favs);
          renderProgram(lastData);
        });
        row.appendChild(star);

        if (!dayWrap._titled) {
          dayWrap.appendChild(dt);
          if (day.note) dayWrap.appendChild(el('div', 'day-note', day.note));
          dayWrap._titled = true;
        }
        dayWrap.appendChild(row);
      });

      if (anyInDay) programList.appendChild(dayWrap);
    });

    programEmpty.classList.toggle('hidden', shown > 0);
  }

  /* ============================================================
     ЛАЙНАП
     ============================================================ */
  /* подпись кнопки-ссылки по хосту (links в content.json — просто URL-строки) */
  function linkLabel(url) {
    try {
      var h = new URL(url).hostname.replace(/^www\./, '');
      if (h === 't.me' || h === 'telegram.me') return 'Telegram';
      if (h === 'soundcloud.com' || h === 'on.soundcloud.com') return 'SoundCloud';
      if (h === 'mixcloud.com') return 'Mixcloud';
      if (h === 'bandcamp.com' || h.endsWith('.bandcamp.com')) return 'Bandcamp';
      if (h === 'youtube.com' || h === 'youtu.be' || h.endsWith('.youtube.com')) return 'YouTube';
      if (h === 'instagram.com') return 'Instagram';
      if (h === 'spotify.com' || h.endsWith('.spotify.com')) return 'Spotify';
      if (h === 'music.yandex.ru' || h === 'music.yandex.com') return 'Яндекс Музыка';
      if (h === 'promodj.com') return 'PromoDJ';
      if (h === 'band.link') return 'band.link';
      return h;
    } catch (e) { return 'ссылка'; }
  }

  function renderLineup(data) {
    var wrap = document.getElementById('lineup-list');
    wrap.textContent = '';
    var items = (data && data.lineup) || [];

    items.forEach(function (a) {
      var card = el('div', 'artist');

      var top = el('div', 'artist-top');
      top.appendChild(el('div', 'artist-name', a.name || '—'));
      if (a.headliner) top.appendChild(el('span', 'headliner-star', '★'));
      if (a.kind) top.appendChild(el('span', 'chip', a.kind));
      card.appendChild(top);

      if (a.bio) {
        var toggle = el('button', 'artist-bio-toggle', 'о выступлении ▾');
        toggle.type = 'button';
        var bio = el('div', 'artist-bio', a.bio);
        toggle.addEventListener('click', function () {
          var open = bio.classList.toggle('open');
          toggle.textContent = open ? 'свернуть ▴' : 'о выступлении ▾';
        });
        card.appendChild(toggle);
        card.appendChild(bio);
      }

      var links = Array.isArray(a.links) ? a.links : [];
      if (links.length) {
        var linksWrap = el('div', 'artist-links');
        links.forEach(function (l) {
          // ссылка может быть строкой URL (реальная схема) или объектом {label,url} (фолбэк)
          var url = (typeof l === 'string') ? l : (l && l.url);
          if (!url) return;
          var label = (typeof l === 'string') ? linkLabel(l) : (l.label || linkLabel(url));
          var b = el('button', 'link-btn', label + ' ↗');
          b.type = 'button';
          b.addEventListener('click', function () { openLink(url); });
          linksWrap.appendChild(b);
        });
        card.appendChild(linksWrap);
      }

      wrap.appendChild(card);
    });
  }

  /* ============================================================
     КАРТА (SVG, viewBox-зум, пин палатки)
     ============================================================ */
  var svg = document.getElementById('map-svg');
  var SVGNS = 'http://www.w3.org/2000/svg';
  var VB0 = { x: 0, y: 0, w: 800, h: 500 };
  var vb = { x: 0, y: 0, w: 800, h: 500 };
  var tent = read('atmos_tent', null); // {x, y} | null
  var tentNode = null;

  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function svgText(x, y, str, size, fill, anchor) {
    var t = svgEl('text', {
      x: x, y: y, 'font-size': size || 13, fill: fill || '#8fa3d9',
      'text-anchor': anchor || 'middle',
      'font-family': '-apple-system, "Segoe UI", sans-serif'
    });
    t.textContent = str;
    return t;
  }

  function applyVB() {
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
  }

  function zoom(factor, cx, cy) {
    var nw = Math.min(800, Math.max(110, vb.w * factor));
    var nh = nw * (VB0.h / VB0.w);
    cx = (cx == null) ? vb.x + vb.w / 2 : cx;
    cy = (cy == null) ? vb.y + vb.h / 2 : cy;
    var rx = (cx - vb.x) / vb.w, ry = (cy - vb.y) / vb.h;
    vb.x = cx - nw * rx;
    vb.y = cy - nh * ry;
    vb.w = nw; vb.h = nh;
    clampVB();
    applyVB();
  }

  function clampVB() {
    if (vb.x < -100) vb.x = -100;
    if (vb.y < -100) vb.y = -100;
    if (vb.x + vb.w > 900) vb.x = 900 - vb.w;
    if (vb.y + vb.h > 600) vb.y = 600 - vb.h;
  }

  /* координаты зон: в content.json зоны приходят без x/y (id/name/desc/icon),
     поэтому раскладка по id живёт здесь; x/y из данных тоже поддерживаются */
  var ZONE_POS = {
    'main-stage':   { x: 400, y: 110 },
    'indoor-stage': { x: 580, y: 160 },
    'tea':          { x: 470, y: 240 },
    'cafe':         { x: 630, y: 280 },
    'practice-1':   { x: 170, y: 180 },
    'practice-2':   { x: 320, y: 310 },
    'practice-3':   { x: 150, y: 330 },
    'kids':         { x: 280, y: 220 },
    'camping':      { x: 620, y: 410 },
    'wash':         { x: 460, y: 430 },
    'parking':      { x: 240, y: 450 },
    'entrance':     { x: 110, y: 430 }
  };

  function zonePos(z, i, total) {
    if (typeof z.x === 'number' && typeof z.y === 'number') return { x: z.x, y: z.y };
    if (z.id && ZONE_POS[z.id]) return ZONE_POS[z.id];
    // неизвестная зона — раскладываем по кругу, чтобы не налезала на центр
    var ang = (i / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.round(400 + Math.cos(ang) * 300), y: Math.round(260 + Math.sin(ang) * 190) };
  }

  function drawMap(data) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // фон поляны
    svg.appendChild(svgEl('rect', { x: 0, y: 0, width: 800, height: 500, fill: '#0b1230', rx: 16 }));
    // лес по краям — приглушённые пятна
    var woods = [
      [60, 60, 90], [740, 70, 80], [70, 470, 85], [745, 460, 90],
      [400, 30, 70], [30, 260, 65], [770, 270, 70]
    ];
    woods.forEach(function (w) {
      svg.appendChild(svgEl('circle', { cx: w[0], cy: w[1], r: w[2], fill: 'rgba(90,140,110,.10)' }));
    });
    // тропинки: вход → практики → сцена; вход → кемпинг; сцена → чайная/кафе
    svg.appendChild(svgEl('path', {
      d: 'M110 430 C 140 380, 150 350, 150 330 S 170 240, 170 180 S 300 130, 400 110',
      fill: 'none', stroke: 'rgba(174,203,255,.28)', 'stroke-width': 3,
      'stroke-dasharray': '8 7', 'stroke-linecap': 'round'
    }));
    svg.appendChild(svgEl('path', {
      d: 'M110 430 C 160 440, 200 445, 240 450 M150 330 C 220 320, 270 315, 320 310 S 420 280, 470 240 S 560 270, 630 280',
      fill: 'none', stroke: 'rgba(174,203,255,.28)', 'stroke-width': 3,
      'stroke-dasharray': '8 7', 'stroke-linecap': 'round'
    }));
    svg.appendChild(svgEl('path', {
      d: 'M400 110 C 470 120, 540 135, 580 160 M320 310 C 400 380, 520 400, 620 410 M460 430 C 500 425, 560 418, 620 410',
      fill: 'none', stroke: 'rgba(174,203,255,.22)', 'stroke-width': 3,
      'stroke-dasharray': '8 7', 'stroke-linecap': 'round'
    }));

    // зоны из данных
    var zones = (data && data.mapZones) || [];
    zones.forEach(function (z, i) {
      var p = zonePos(z, i, zones.length);
      var g = svgEl('g', {});
      g.appendChild(svgEl('circle', {
        cx: p.x, cy: p.y, r: 26,
        fill: 'rgba(174,203,255,.10)', stroke: 'rgba(174,203,255,.35)', 'stroke-width': 1.5
      }));
      g.appendChild(svgText(p.x, p.y + 7, z.icon || '•', 20));
      g.appendChild(svgText(p.x, p.y + 46, z.name || '', 12));
      svg.appendChild(g);
    });

    // пин палатки
    tentNode = svgText(0, 0, '⛺', 30);
    tentNode.setAttribute('style', 'pointer-events:none; filter: drop-shadow(0 0 6px rgba(255,107,129,.6));');
    svg.appendChild(tentNode);
    updateTentPin();
  }

  function updateTentPin() {
    if (!tentNode) return;
    var hint = document.getElementById('tent-hint');
    if (tent && typeof tent.x === 'number') {
      tentNode.setAttribute('x', tent.x);
      tentNode.setAttribute('y', tent.y + 10);
      tentNode.style.display = '';
      hint.textContent = 'палатка отмечена ⛺ тап по карте — переставить, кнопка ⛺ — найти';
    } else {
      tentNode.style.display = 'none';
      hint.textContent = 'пин палатки сохранится на этом устройстве';
    }
  }

  function clientToSvg(clientX, clientY) {
    var rect = svg.getBoundingClientRect();
    return {
      x: vb.x + (clientX - rect.left) / rect.width * vb.w,
      y: vb.y + (clientY - rect.top) / rect.height * vb.h
    };
  }

  // жесты: pan одним пальцем, pinch двумя, тап — пин палатки
  var pointers = new Map();
  var gesture = null;

  svg.addEventListener('pointerdown', function (e) {
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      gesture = { mode: 'pan', sx: e.clientX, sy: e.clientY, vbx: vb.x, vby: vb.y, moved: false };
    } else if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      gesture = {
        mode: 'pinch',
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        vw: vb.w, moved: true
      };
    }
  });

  svg.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (gesture.mode === 'pan') {
      var dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
      if (Math.hypot(dx, dy) > 6) gesture.moved = true;
      if (gesture.moved) {
        var rect = svg.getBoundingClientRect();
        vb.x = gesture.vbx - dx / rect.width * vb.w;
        vb.y = gesture.vby - dy / rect.height * vb.h;
        clampVB();
        applyVB();
      }
    } else if (gesture.mode === 'pinch' && pointers.size >= 2) {
      var pts = Array.from(pointers.values());
      var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (dist > 0 && gesture.dist > 0) {
        var mid = clientToSvg((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
        var nw = Math.min(800, Math.max(110, gesture.vw * gesture.dist / dist));
        var factor = nw / vb.w;
        zoom(factor, mid.x, mid.y);
      }
    }
  });

  function endPointer(e) {
    var wasTap = gesture && gesture.mode === 'pan' && !gesture.moved && pointers.size === 1;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      if (wasTap) {
        var p = clientToSvg(e.clientX, e.clientY);
        if (p.x >= 0 && p.x <= 800 && p.y >= 0 && p.y <= 500) {
          tent = { x: Math.round(p.x), y: Math.round(p.y) };
          store('atmos_tent', tent);
          updateTentPin();
        }
      }
      gesture = null;
    } else if (pointers.size === 1) {
      var rest = Array.from(pointers.values())[0];
      gesture = { mode: 'pan', sx: rest.x, sy: rest.y, vbx: vb.x, vby: vb.y, moved: true };
    }
  }
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);

  document.getElementById('zoom-in').addEventListener('click', function () { zoom(0.75); });
  document.getElementById('zoom-out').addEventListener('click', function () { zoom(1.33); });
  document.getElementById('find-tent').addEventListener('click', function () {
    if (!tent || typeof tent.x !== 'number') {
      document.getElementById('tent-hint').textContent = 'сначала поставь пин тапом по карте 🤍';
      return;
    }
    vb.w = 260; vb.h = 260 * (VB0.h / VB0.w);
    vb.x = tent.x - vb.w / 2;
    vb.y = tent.y - vb.h / 2;
    clampVB();
    applyVB();
  });

  /* ============================================================
     ГИД
     ============================================================ */
  document.querySelectorAll('.acc-head').forEach(function (head) {
    head.addEventListener('click', function () {
      head.parentElement.classList.toggle('open');
    });
  });

  var CHECK_KEY = 'atmos_check';

  function normTextItem(item) {
    if (item == null) return '';
    if (typeof item === 'string') return item;
    return item.name || item.item || item.title || item.text || String(item);
  }

  function renderGuide(data) {
    // --- Что взять: может быть плоским списком строк или группами {category, items} ---
    var rawCheck = (data && data.checklist) || [];
    var groups = [];
    if (rawCheck.length && rawCheck[0] && Array.isArray(rawCheck[0].items)) {
      groups = rawCheck;
    } else if (rawCheck.length) {
      groups = [{ category: '', items: rawCheck }];
    }

    var state = read(CHECK_KEY, []);
    var list = document.getElementById('pack-list');
    list.textContent = '';
    var flatIndex = 0;
    var total = 0;

    groups.forEach(function (g) {
      if (g.category) list.appendChild(el('div', 'check-cat', g.category));
      (g.items || []).forEach(function (item) {
        var text = normTextItem(item);
        var i = flatIndex++;
        total++;
        var label = el('label', 'check-item' + (state[i] ? ' done' : ''));
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!state[i];
        cb.addEventListener('change', function () {
          state[i] = cb.checked;
          store(CHECK_KEY, state);
          label.classList.toggle('done', cb.checked);
          updatePackProgress(total, state);
        });
        label.appendChild(cb);
        label.appendChild(el('span', null, text));
        list.appendChild(label);
      });
    });
    updatePackProgress(total, state);

    // --- Еда: объект {intro, options, teaNote} (реальная схема) или массив (фолбэк) ---
    var foodWrap = document.getElementById('food-list');
    foodWrap.textContent = '';
    var food = data && data.food;
    if (food && !Array.isArray(food) && typeof food === 'object') {
      if (food.intro) foodWrap.appendChild(el('p', 'food-intro', food.intro));
      (food.options || []).forEach(function (f) {
        var card = el('div', 'mini-card');
        card.appendChild(el('h4', null, f.title || f.name || ''));
        if (f.desc) card.appendChild(el('p', null, f.desc));
        foodWrap.appendChild(card);
      });
      if (food.teaNote) foodWrap.appendChild(el('div', 'note', food.teaNote));
    } else if (Array.isArray(food)) {
      food.forEach(function (f) {
        var card = el('div', 'mini-card');
        if (typeof f === 'string') {
          card.appendChild(el('p', null, f));
        } else {
          card.appendChild(el('h4', null, f.name || f.title || ''));
          if (f.desc) card.appendChild(el('p', null, f.desc));
        }
        foodWrap.appendChild(card);
      });
    }

    // --- Окрестности: name / distance / desc / tip ---
    var arWrap = document.getElementById('around-list');
    arWrap.textContent = '';
    ((data && data.surroundings) || []).forEach(function (s) {
      var card = el('div', 'mini-card');
      if (typeof s === 'string') {
        card.appendChild(el('p', null, s));
      } else {
        var head = el('div', 'mini-card-head');
        head.appendChild(el('h4', null, s.name || ''));
        if (s.distance) head.appendChild(el('span', 'chip', s.distance));
        card.appendChild(head);
        if (s.desc) card.appendChild(el('p', null, s.desc));
        if (s.tip) card.appendChild(el('div', 'note', s.tip));
      }
      arWrap.appendChild(card);
    });

    // первый аккордеон открыт по умолчанию
    var first = document.getElementById('acc-pack');
    if (first && !first.classList.contains('open') && !first._touched) {
      first.classList.add('open');
      first._touched = true;
    }
  }

  function updatePackProgress(total, state) {
    var done = 0;
    for (var i = 0; i < total; i++) if (state[i]) done++;
    var pct = total ? Math.round(done / total * 100) : 0;
    document.getElementById('pack-progress').style.width = pct + '%';
    document.getElementById('pack-progress-label').textContent =
      total ? ('собрано ' + pct + '%') : '';
  }

  /* ============================================================
     ИНФО
     ============================================================ */
  function renderInfo(data) {
    var meta = (data && data.meta) || {};

    // шапка
    var sub = [meta.dates, meta.place].filter(Boolean).join(' · ');
    if (sub) document.getElementById('header-sub').textContent = sub;

    // Локация: замок до revealAt
    var locBody = document.getElementById('location-body');
    locBody.textContent = '';
    var revealAt = Date.parse(meta.locationRevealAt || '');
    var now = Date.now();

    if (!isNaN(revealAt) && now < revealAt) {
      var days = Math.ceil((revealAt - now) / 86400000);
      locBody.appendChild(el('p', null, '🔒 точное место откроем за несколько дней до феста — пока это секрет ✨'));
      var cd = el('span', 'countdown', days + ' ' + plural(days, 'день', 'дня', 'дней'));
      locBody.appendChild(cd);
      locBody.appendChild(el('p', null, 'осталось до раскрытия локации'));
    } else {
      locBody.appendChild(el('p', null, '📍 точку пришлют в чат участников'));
    }

    // Как добраться
    var howBody = document.getElementById('howto-body');
    howBody.textContent = '';
    var info = (data && data.info) || {};
    var how = info.howToGet;
    var paras = Array.isArray(how) ? how : (how ? [how] : []);
    paras.forEach(function (t) { howBody.appendChild(el('p', null, t)); });
    if (info.roadNote) howBody.appendChild(el('div', 'note', info.roadNote));

    // Правила
    var rulesBody = document.getElementById('rules-body');
    rulesBody.textContent = '';
    var rules = (data && data.rules) || {};
    if (rules.intro) rulesBody.appendChild(el('p', 'food-intro', rules.intro));
    var ul = el('ul', 'rules-list');
    (rules.items || []).forEach(function (t) {
      ul.appendChild(el('li', null, '🤍 ' + t));
    });
    rulesBody.appendChild(ul);
    if (rules.quietHours) rulesBody.appendChild(el('div', 'note', rules.quietHours));

    // SOS: список {title, desc} (реальная схема) или строка (фолбэк)
    var sosBody = document.getElementById('sos-body');
    sosBody.textContent = '';
    if (Array.isArray(rules.sos)) {
      rules.sos.forEach(function (s) {
        var card = el('div', 'mini-card');
        card.appendChild(el('h4', null, s.title || ''));
        if (s.desc) card.appendChild(el('p', null, s.desc));
        sosBody.appendChild(card);
      });
    } else {
      sosBody.appendChild(el('p', null, rules.sos || 'ищите организаторов — мы рядом 🤍'));
    }
  }

  function plural(n, one, few, many) {
    var m = Math.abs(n) % 100, d = m % 10;
    if (m > 10 && m < 20) return many;
    if (d > 1 && d < 5) return few;
    if (d === 1) return one;
    return many;
  }

  document.getElementById('btn-organizer').addEventListener('click', function () {
    var contact = (lastData && lastData.info && lastData.info.orgContact) || '@artemiy_kar';
    var handle = String(contact).replace(/^@/, '').trim();
    openTelegramLink('https://t.me/' + handle);
  });

  /* ============================================================
     ПОГОДА (Open-Meteo, Мезмай; кэш в localStorage на 30 минут)
     ============================================================ */
  var WEATHER_KEY = 'atmos_weather';
  var WEATHER_TTL = 30 * 60 * 1000;
  var WEATHER_URL = 'https://api.open-meteo.com/v1/forecast' +
    '?latitude=44.2067&longitude=39.9674' +
    '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&timezone=Europe%2FMoscow';

  function weatherIcon(code) {
    if (code === 0) return '☀️';
    if (code === 1 || code === 2) return '🌤';
    if (code === 3) return '☁️';
    if (code === 45 || code === 48) return '🌫';
    if (code >= 51 && code <= 57) return '🌦';
    if (code >= 61 && code <= 67) return '🌧';
    if (code >= 71 && code <= 77) return '🌨';
    if (code >= 80 && code <= 82) return '🌧';
    if (code >= 95) return '⛈';
    return '🌡';
  }

  function weatherTip(min) {
    if (min < 10) return 'ночью прохладно — тёплые носочки пригодятся 🧦';
    if (min < 15) return 'ночью свежо — флиска вечером не помешает';
    return 'ночи обещают тёплые — но плед у костра всегда хорошая идея';
  }

  function renderWeather(w) {
    var card = document.getElementById('weather-card');
    var body = document.getElementById('weather-body');
    if (!card || !body) return;

    var cur = (w && w.current) || {};
    var daily = (w && w.daily) || {};
    var t = cur.temperature_2m, feels = cur.apparent_temperature;
    if (typeof t !== 'number' || typeof feels !== 'number') { card.hidden = true; return; }

    var mins = daily.temperature_2m_min, maxs = daily.temperature_2m_max;
    var min = (mins && typeof mins[0] === 'number') ? Math.round(mins[0]) : null;
    var max = (maxs && typeof maxs[0] === 'number') ? Math.round(maxs[0]) : null;
    var probs = daily.precipitation_probability_max;
    var prob = (probs && typeof probs[0] === 'number') ? probs[0] : null;

    body.textContent = '';
    body.appendChild(el('p', null,
      weatherIcon(cur.weather_code) + ' сейчас ' + Math.round(t) + '° · ощущается как ' + Math.round(feels) + '°'));
    if (min !== null && max !== null) {
      body.appendChild(el('p', null, 'сегодня: днём до ' + max + '°, ночью около ' + min + '°'));
    }
    if (prob !== null) {
      body.appendChild(el('p', null, 'вероятность осадков — ' + prob + '%'));
    }
    if (min !== null) {
      body.appendChild(el('div', 'note', weatherTip(min)));
    }
    card.hidden = false;
  }

  function loadWeather() {
    var card = document.getElementById('weather-card');
    if (!card) return;
    var cached = read(WEATHER_KEY, null);
    var fresh = cached && cached.data && (Date.now() - cached.t) < WEATHER_TTL;
    if (fresh) { renderWeather(cached.data); return; }

    fetch(WEATHER_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (json) {
        store(WEATHER_KEY, { t: Date.now(), data: json });
        renderWeather(json);
      })
      .catch(function () {
        // офлайн: показываем старый кэш, если есть; иначе молча прячем карточку
        if (cached && cached.data) renderWeather(cached.data);
        else card.hidden = true;
      });
  }

  /* ---------- старт ---------- */
  var lastData = null;
  updateFavBtn();

  loadData().then(function (data) {
    lastData = data || FALLBACK;
    renderInfo(lastData);
    renderProgram(lastData);
    renderLineup(lastData);
    drawMap(lastData);
    renderGuide(lastData);
    loadWeather();
  });
})();
