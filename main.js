/* 모바일 청첩장 동작부. 내용은 config.js 에서만 고치세요. */
(function () {
  'use strict';

  var C = window.CONFIG;
  if (!C) { return; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var ENDOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  var g = C.groom, b = C.bride, V = C.venue;
  var parts = C.date.split('-').map(Number);
  var Y = parts[0], M = parts[1], D = parts[2];
  var H = C.time.h, MIN = C.time.m;
  var dow = new Date(Y, M - 1, D).getDay();
  var g1 = g.name.slice(1), b1 = b.name.slice(1);   // 이름에서 성을 뗀 부분
  var timeLabel = (H >= 12 ? '오후 ' : '오전 ') + (H > 12 ? H - 12 : H) + '시' + (MIN ? ' ' + MIN + '분' : '');
  var dateLabel = Y + '년 ' + M + '월 ' + D + '일 ' + DOW[dow] + '요일';
  var stampText = '’' + String(Y).slice(2) + ' ' + M + ' ' + D;
  var placeLabel = V.name + (V.hall ? ' ' + V.hall : '');
  var hasCoords = typeof V.lat === 'number' && typeof V.lng === 'number';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var inApp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent);

  /* ---------- 공통: 토스트 · 복사 ---------- */
  var tt;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(function () { el.classList.remove('show'); }, 1900);
  }
  function copy(text, msg) {
    var settled = false;
    var done = function (ok) {
      if (settled) { return; }
      settled = true;
      toast(ok ? msg : '복사가 막혀 있습니다. 글자를 길게 눌러 직접 복사해 주세요');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { legacy(); });
      /* 인앱 브라우저에서 응답이 영영 안 오는 경우가 있어 2초면 예전 방식으로 넘어갑니다 */
      setTimeout(function () { if (!settled) { legacy(); } }, 2000);
    } else { legacy(); }
    function legacy() {
      if (settled) { return; }
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      done(ok);
    }
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]');
    if (c) { copy(c.getAttribute('data-copy'), c.getAttribute('data-msg') || '복사했습니다'); }
  });

  /* 앱 스킴을 열고, 1.5초 안에 앱이 안 열리면 웹 주소로 넘깁니다.
     (카카오톡 인앱 브라우저에서 앱 스킴이 막히는 경우 대비) */
  function openApp(scheme, web) {
    var left = false;
    var mark = function () { left = true; };
    document.addEventListener('visibilitychange', mark);
    window.addEventListener('pagehide', mark);
    window.addEventListener('blur', mark);
    try { window.location.href = scheme; } catch (e) { left = false; }
    setTimeout(function () {
      document.removeEventListener('visibilitychange', mark);
      window.removeEventListener('pagehide', mark);
      window.removeEventListener('blur', mark);
      if (!left && !document.hidden) { window.open(web, '_blank', 'noopener'); }
    }, 1500);
  }

  /* ---------- 미리보기 문구 동기화 ----------
     카카오 크롤러는 JS를 실행하지 않으므로 index.html 의 정적 OG 태그가 실제로 쓰입니다.
     여기서는 브라우저 안에서 보이는 값만 config.js 와 맞춰 두고, 어긋나면 콘솔로 알립니다. */
  (function syncMeta() {
    if (!C.meta) { return; }
    if (C.meta.title) { document.title = C.meta.title; }
    var absOg = '';
    try { absOg = new URL(C.meta.ogImage || 'assets/og.jpg', C.siteUrl).href; } catch (e) {}
    var pairs = [
      ['meta[property="og:title"]', C.meta.title],
      ['meta[property="og:description"]', C.meta.description],
      ['meta[name="description"]', C.meta.description],
      ['meta[property="og:url"]', C.siteUrl],
      ['meta[property="og:image"]', absOg]
    ];
    pairs.forEach(function (p) {
      var el = $(p[0]);
      if (!el || !p[1]) { return; }
      if (el.getAttribute('content') !== p[1]) {
        if (window.console) {
          console.warn('[청첩장] index.html 의 ' + p[0] + ' 가 config.js 와 다릅니다. 카카오톡 미리보기는 index.html 값을 씁니다.\n  index.html: ' + el.getAttribute('content') + '\n  config.js : ' + p[1]);
        }
        el.setAttribute('content', p[1]);
      }
    });
  })();

  /* ---------- 사진 자리 표시 ---------- */
  function photo(src, i, alt, label, lazy) {
    if (src) {
      return '<img src="' + esc(src) + '" alt="' + esc(alt) + '"' +
        (lazy ? ' loading="lazy" decoding="async"' : '') + ' draggable="false">';
    }
    return '<span class="ph" style="--h:' + ((i * 47 + 190) % 360) + '"><span>' + (label || '사진을<br>넣어주세요') + '</span></span>';
  }

  /* ---------- 1. 커버 ---------- */
  $('#coverPhoto').innerHTML = photo(C.cover, 0, g1 + '와 ' + b1 + '의 사진', '대표 사진을<br>넣어주세요');
  $('#stampline').textContent = stampText + '  ' + ENDOW[dow];
  $('#names').innerHTML = esc(g1) + '<span>&amp;</span>' + esc(b1);
  $('#subline').textContent = dateLabel + ' ' + timeLabel + ', ' + placeLabel;

  /* ---------- 2. 인사말 ---------- */
  $('#greet').textContent = C.greeting;
  function parentLine(label, p) {
    return '<p><em>' + label + '</em><strong>' + esc(p.father.name) + ' · ' + esc(p.mother.name) + '</strong>' +
      '<span class="of">의 ' + esc(p.rank) + ' <strong>' + esc(p.name.slice(1)) + '</strong></span></p>';
  }
  $('#parents').innerHTML = parentLine('신랑측', g) + parentLine('신부측', b);

  /* ---------- 3. 연락하기 ---------- */
  var people = [
    { role: '신랑', p: g }, { role: '신부', p: b },
    { role: '신랑 아버지', p: g.father }, { role: '신랑 어머니', p: g.mother },
    { role: '신부 아버지', p: b.father }, { role: '신부 어머니', p: b.mother }
  ].filter(function (x) { return x.p && x.p.tel; });

  if (!people.length) {
    $('#contacts').closest('.sec').hidden = true;
  } else {
    $('#contacts').innerHTML = people.map(function (x) {
      var tel = String(x.p.tel).replace(/[^0-9+]/g, '');
      return '<li><span class="who"><small>' + esc(x.role) + '</small><b>' + esc(x.p.name) + '</b></span>' +
        '<a class="icon" href="tel:' + esc(tel) + '" aria-label="' + esc(x.role + ' ' + x.p.name) + '에게 전화">전화</a>' +
        '<a class="icon" href="sms:' + esc(tel) + '" aria-label="' + esc(x.role + ' ' + x.p.name) + '에게 문자">문자</a></li>';
    }).join('');
  }

  /* ---------- 4. 예식 일시 ---------- */
  $('#ticketInfo').innerHTML =
    '<div><dt>DATE</dt><dd>' + dateLabel + '</dd></div>' +
    '<div><dt>TIME</dt><dd>' + timeLabel + '</dd></div>' +
    '<div><dt>PLACE</dt><dd>' + esc(V.name) + (V.hall ? '<small>' + esc(V.hall) + '</small>' : '') + '</dd></div>';

  var today = new Date();
  var t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var diff = Math.round((new Date(Y, M - 1, D) - t0) / 86400000);
  $('#dday').innerHTML = diff > 0 ? '결혼식까지 <b>' + diff + '</b>일 남았습니다'
    : diff === 0 ? '<b>오늘</b>이 결혼식입니다'
    : '결혼한 지 <b>' + (-diff) + '</b>일 되었습니다';
  $('#stubDay').textContent = diff > 0 ? 'D-' + diff : diff === 0 ? 'D-DAY' : 'D+' + (-diff);

  var first = new Date(Y, M - 1, 1).getDay();
  var days = new Date(Y, M, 0).getDate();
  var cal = '<div class="mo">' + Y + '년 ' + M + '월</div>';
  cal += DOW.map(function (d, i) { return '<div class="dw' + (i === 0 ? ' sun' : '') + '">' + d + '</div>'; }).join('');
  for (var i = 0; i < first; i++) { cal += '<div></div>'; }
  for (var d = 1; d <= days; d++) {
    var wd = (first + d - 1) % 7;
    cal += '<div class="d' + (d === D ? ' hit' : '') + (wd === 0 && d !== D ? ' sun' : '') + '">' + d + '</div>';
  }
  $('#cal').innerHTML = cal;

  /* 캘린더: 한국 시간(UTC+9)을 UTC 로 바꿔서 넣습니다 */
  var hours = C.durationHours || 2;
  var startUtc = new Date(Date.UTC(Y, M - 1, D, H - 9, MIN));
  var endUtc = new Date(startUtc.getTime() + hours * 3600000);
  var ufmt = function (dt) { return dt.toISOString().replace(/[-:]|\.\d{3}/g, ''); };
  var eventTitle = g1 + ' ♥ ' + b1 + ' 결혼식';
  var eventPlace = placeLabel + ' (' + V.address + ')';

  $('#gcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(eventTitle) +
    '&dates=' + ufmt(startUtc) + '/' + ufmt(endUtc) +
    '&location=' + encodeURIComponent(eventPlace) +
    '&details=' + encodeURIComponent(C.siteUrl || '');

  $('#icsBtn').onclick = function () {
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//wedding-invite//KO', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:' + ufmt(startUtc) + '-wedding@invite',
      'DTSTAMP:' + ufmt(new Date()),
      'DTSTART:' + ufmt(startUtc),
      'DTEND:' + ufmt(endUtc),
      'SUMMARY:' + eventTitle,
      'LOCATION:' + eventPlace.replace(/,/g, '\\,'),
      'DESCRIPTION:' + (C.siteUrl || ''),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + eventTitle, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    if (inApp) {
      toast('카카오톡 안에서는 저장이 막힙니다. 구글 캘린더 버튼을 눌러 주세요');
      return;
    }
    try {
      /* 앞에 BOM 을 붙여야 윈도우 아웃룩이 한글을 깨지 않고 읽습니다 */
      var blob = new Blob(['﻿' + ics], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'wedding.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('캘린더 파일을 내려받았습니다');
    } catch (e) {
      window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    }
  };

  /* ---------- 5. 갤러리 ---------- */
  var G = (C.gallery || []).slice();
  var cur = 0;
  if (!G.length) {
    $('#grid').closest('.sec').hidden = true;
  } else {
    $('#grid').innerHTML = G.map(function (s, i) {
      return '<button type="button" data-i="' + i + '" aria-label="' + (i + 1) + '번 사진 크게 보기">' +
        photo(s, i, '사진 ' + (i + 1), i + 1, true) + '</button>';
    }).join('');
  }

  var lb = $('#lb'), lastFocus = null;
  function lbShow(i, animate) {
    cur = (i + G.length) % G.length;
    var st = $('#lbStage');
    st.innerHTML = photo(G[cur], cur, g1 + '와 ' + b1 + ' 사진 ' + (cur + 1), '사진 ' + (cur + 1));
    if (animate && !reduce && st.firstElementChild) { st.firstElementChild.classList.add('fade'); }
    $('#lbCount').textContent = (cur + 1) + ' / ' + G.length;
  }
  function lbOpen(i) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lbShow(i, false);
    $('#lbClose').focus();
  }
  function lbClose() {
    lb.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }
  $('#grid').addEventListener('click', function (e) {
    var t = e.target.closest('button[data-i]');
    if (t) { lbOpen(+t.getAttribute('data-i')); }
  });
  $('#lbClose').onclick = lbClose;
  $('#lbPrev').onclick = function () { lbShow(cur - 1, true); };
  $('#lbNext').onclick = function () { lbShow(cur + 1, true); };
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target === $('#lbStage')) { lbClose(); }
  });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) { return; }
    if (e.key === 'Escape') { lbClose(); }
    if (e.key === 'ArrowLeft') { lbShow(cur - 1, true); }
    if (e.key === 'ArrowRight') { lbShow(cur + 1, true); }
  });
  var sx = null, sy = null;
  lb.addEventListener('touchstart', function (e) {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (sx === null) { return; }
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { lbShow(cur + (dx < 0 ? 1 : -1), true); }
    else if (dy > 70 && Math.abs(dy) > Math.abs(dx)) { lbClose(); }
    sx = sy = null;
  });

  /* ---------- 6. 오시는 길 ---------- */
  $('#venueName').textContent = placeLabel;
  $('#venueMeta').textContent = [V.address, V.tel].filter(Boolean).join(' · ');

  var qName = encodeURIComponent(V.name);
  var qAddr = encodeURIComponent(V.address);
  var appName = 'wedding.invite';
  try { appName = new URL(C.siteUrl).hostname || appName; } catch (e) {}

  var naverWeb = 'https://map.naver.com/p/search/' + (V.name ? qName : qAddr);
  var naverApp = hasCoords
    ? 'nmap://place?lat=' + V.lat + '&lng=' + V.lng + '&name=' + qName + '&appname=' + encodeURIComponent(appName)
    : 'nmap://search?query=' + qName + '&appname=' + encodeURIComponent(appName);
  var kakaoWeb = hasCoords
    ? 'https://map.kakao.com/link/map/' + qName + ',' + V.lat + ',' + V.lng
    : 'https://map.kakao.com/?q=' + qName;
  var tmapApp = hasCoords
    ? 'tmap://route?goalname=' + qName + '&goalx=' + V.lng + '&goaly=' + V.lat
    : '';

  $('#mapBtns').innerHTML =
    '<button class="btn solid" type="button" id="btnNaverApp">네이버지도 길찾기</button>' +
    '<a class="btn" href="' + kakaoWeb + '" target="_blank" rel="noopener">카카오맵</a>' +
    (tmapApp ? '<button class="btn" type="button" id="btnTmap">티맵</button>' : '') +
    '<button class="btn" type="button" data-copy="' + esc(V.address) + '" data-msg="주소를 복사했습니다">주소 복사</button>';
  $('#btnNaverApp').onclick = function () { openApp(naverApp, naverWeb); };
  if (tmapApp) { $('#btnTmap').onclick = function () { openApp(tmapApp, naverWeb); }; }

  $('#transit').innerHTML = (C.transit || []).map(function (r) {
    return '<li><b>' + esc(r.label) + '</b><span>' + esc(r.text) + '</span></li>';
  }).join('');

  /* 지도: 인증키가 없거나 인증이 실패하면 주소 안내 카드로 바꿉니다 */
  var mapDone = false;
  function mapFallback() {
    mapDone = true;
    $('#mapBox').innerHTML =
      '<div class="mapph"><b>' + esc(placeLabel) + '</b><span>' + esc(V.address) + '</span>' +
      '<span>아래 길찾기 버튼을 눌러 주세요.</span></div>';
    $('#mapNote').textContent = C.naverMap && C.naverMap.clientId
      ? '지도를 불러오지 못했습니다. 길찾기 버튼으로 위치를 확인해 주세요.'
      : '';
  }
  window.navermap_authFailure = mapFallback;   /* 키나 도메인 등록이 맞지 않을 때 네이버가 부릅니다 */

  function drawMap(pos) {
    var box = $('#mapBox');
    box.innerHTML = '';
    var map = new naver.maps.Map(box, {
      center: pos,
      zoom: (C.naverMap && C.naverMap.zoom) || 17,
      scrollWheel: false,        /* 휠 확대는 페이지 스크롤과 충돌하므로 끔 */
      pinchZoom: true,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
      logoControl: true,
      mapDataControl: false
    });
    var marker = new naver.maps.Marker({ position: pos, map: map, title: placeLabel });
    new naver.maps.InfoWindow({
      content: '<div style="padding:7px 12px;font-size:14px;line-height:1.4;white-space:nowrap;' +
        'font-family:system-ui,sans-serif;color:#1E292D">' + esc(placeLabel) + '</div>',
      backgroundColor: '#fff',
      borderColor: '#C9D2CC',
      borderWidth: 1,
      anchorSize: new naver.maps.Size(10, 8),
      anchorColor: '#fff',
      pixelOffset: new naver.maps.Point(0, -2)
    }).open(map, marker);
    $('#mapNote').textContent = '지도를 끌어 옮기거나 두 손가락으로 크기를 바꿔 보실 수 있습니다.';
    mapDone = true;
  }

  function initNaverMap() {
    if (!window.naver || !naver.maps) { return mapFallback(); }
    if (hasCoords) { return drawMap(new naver.maps.LatLng(V.lat, V.lng)); }
    if (!naver.maps.Service) { return mapFallback(); }
    /* 좌표가 없으면 주소로 찾습니다. '2층' 같은 꼬리말은 떼고 보냅니다. */
    naver.maps.Service.geocode({ query: V.address.replace(/\s*\d+\s*층\s*$/, '') }, function (status, res) {
      var a = res && res.v2 && res.v2.addresses && res.v2.addresses[0];
      if (status !== naver.maps.Service.Status.OK || !a) { return mapFallback(); }
      V.lat = parseFloat(a.y);
      V.lng = parseFloat(a.x);
      hasCoords = true;
      drawMap(new naver.maps.LatLng(V.lat, V.lng));
    });
  }

  /* 지도 SDK 는 '오시는 길'이 화면 가까이 올 때 불러옵니다 (초기 로딩 지연 방지) */
  function loadNaverMap() {
    if (mapDone) { return; }
    mapDone = true;
    var s = document.createElement('script');
    s.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=' +
      encodeURIComponent(C.naverMap.clientId) + '&submodules=geocoder';
    s.onload = function () { mapDone = false; initNaverMap(); };
    s.onerror = mapFallback;
    document.head.appendChild(s);
  }
  if (C.naverMap && C.naverMap.clientId) {
    if ('IntersectionObserver' in window) {
      var mo = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { mo.disconnect(); loadNaverMap(); }
      }, { rootMargin: '300px 0px' });
      mo.observe($('#mapBox'));
    } else {
      loadNaverMap();
    }
  } else {
    mapFallback();
  }

  /* 멀리서 오시는 길 */
  var routes = C.routes || [];
  if (!routes.length) {
    ['#routesTitle', '#tabs', '#routes'].forEach(function (s) { $(s).hidden = true; });
    $('#routesTitle').nextElementSibling.hidden = true;
  } else {
    $('#routesTitle').textContent = C.routesTitle || '';
    $('#tabs').innerHTML = routes.map(function (r, i) {
      return '<button class="tab" type="button" role="tab" id="tab' + i + '" aria-controls="route' + i +
        '" aria-selected="' + (i === 0) + '">' + esc(r.tab) + '</button>';
    }).join('');
    $('#routes').innerHTML = routes.map(function (r, i) {
      return '<div role="tabpanel" id="route' + i + '" aria-labelledby="tab' + i + '"' + (i ? ' hidden' : '') + '>' +
        '<ol class="steps">' + r.steps.map(function (s) {
          return '<li><div><b><i class="chip">' + esc(s.line) + '</i>' + esc(s.t) + '</b>' +
            '<span>' + esc(s.d) + '</span></div></li>';
        }).join('') + '</ol>' + (r.alt ? '<p class="alt">' + esc(r.alt) + '</p>' : '') + '</div>';
    }).join('');
    $('#tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (!tab) { return; }
      routes.forEach(function (_, i) {
        var on = ('tab' + i) === tab.id;
        $('#tab' + i).setAttribute('aria-selected', on);
        $('#route' + i).hidden = !on;
      });
    });
  }

  /* 택시 안내 */
  var tx = C.taxi;
  if (tx && tx.big) {
    $('#taxiTitle').textContent = tx.title || '';
    $('#taxiBig').textContent = tx.big;
    $('#taxiNote').textContent = tx.note || '';
    $('#taxiCopy').onclick = function () { copy(tx.copy || V.address, '주소를 복사했습니다'); };
  } else {
    $('#taxiTitle').closest('.taxi').hidden = true;
  }

  /* ---------- 7. 마음 전하실 곳 ---------- */
  $('#giftLead').textContent = C.giftLead || '';
  function accBlock(title, rows, open) {
    if (!rows || !rows.length) { return ''; }
    return '<details class="acc"' + (open ? ' open' : '') + '><summary>' + esc(title) + '</summary><ul>' +
      rows.map(function (r) {
        var full = r.bank + ' ' + r.no;
        return '<li><div class="info"><small>' + esc(r.who) + ' · ' + esc(r.holder) + '</small>' +
          '<span>' + esc(full) + '</span></div>' +
          '<button class="cp" type="button" data-copy="' + esc(full) + '" data-msg="' +
          esc(r.holder) + '님 계좌를 복사했습니다">복사</button></li>';
      }).join('') + '</ul></details>';
  }
  var acc = C.accounts || {};
  $('#accounts').innerHTML = accBlock('신랑측 계좌번호', acc.groom, true) + accBlock('신부측 계좌번호', acc.bride, true);

  /* ---------- 선택 기능: RSVP · 방명록 · 배경음악 ---------- */
  var F = C.features || {};
  if (F.rsvp && C.rsvp && C.rsvp.url) {
    $('#rsvpSec').hidden = false;
    $('#rsvpLead').textContent = C.rsvp.lead || '';
    $('#rsvpBtn').href = C.rsvp.url;
  }
  if (F.guestbook && C.guestbook && C.guestbook.url) {
    $('#guestbookSec').hidden = false;
    $('#gbLead').textContent = C.guestbook.lead || '';
    $('#gbBtn').href = C.guestbook.url;
  }
  if (F.bgm && C.bgm && C.bgm.src) {
    var btn = $('#bgmBtn');
    var audio = new Audio(C.bgm.src);   /* 자동재생하지 않습니다. 눌러야 켜집니다. */
    audio.loop = true;
    audio.preload = 'none';
    btn.hidden = false;
    btn.onclick = function () {
      if (audio.paused) {
        audio.play().then(function () {
          btn.setAttribute('aria-pressed', 'true');
          $('#bgmLabel').textContent = '배경음악 끄기';
        }, function () { toast('이 브라우저에서는 소리를 켤 수 없습니다'); });
      } else {
        audio.pause();
        btn.setAttribute('aria-pressed', 'false');
        $('#bgmLabel').textContent = '배경음악 재생';
      }
    };
  }

  /* ---------- 8. 공유 · 9. 푸터 ---------- */
  $('#endMsg').textContent = C.endMessage || '';
  var shareUrl = /^https?:/.test(location.protocol) ? location.href : (C.siteUrl || location.href);
  $('#shareBtn').onclick = function () { copy(shareUrl, '링크를 복사했습니다'); };

  $('#footStamp').textContent = stampText;
  $('#footText').textContent = C.footerText || (g1 + ' ♥ ' + b1 + ' · ' + dateLabel);

  /* ---------- 섹션 진입 페이드업 ---------- */
  var secs = [].slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    secs.forEach(function (s) { s.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    secs.forEach(function (s) { io.observe(s); });
  }
})();
