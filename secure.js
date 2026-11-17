/* 개인정보 인코더/디코더 — config.js 의 private 값을 풀고 만듭니다.
   이름·전화번호·계좌가 소스 코드와 저장소에 평문으로 보이지 않게 해서
   정규식 수집기, 저장소 검색, JS를 실행하지 않는 크롤러를 막습니다.
   (열쇠가 코드 안에 있으므로 소스를 직접 분석하는 사람까지 막지는 못합니다.)
   값을 바꿀 때는 tools/secure.html 을 브라우저로 열어 새 줄을 만드세요. */
(function () {
  'use strict';

  var P = ['wd', 'Hn', '9q', 'Lx', '4T', 'eR', 'k2', 'Vs'];
  function seed(n) {
    var s = P.slice().reverse().join('') + 'c' + 7;
    var h = 2166136261 ^ n;
    for (var i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 16777619); }
    return h >>> 0 || 1;
  }
  function stream(n, len) {
    var x = seed(n), out = [];
    for (var i = 0; i < len; i++) {
      x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
      out.push(x & 255);
    }
    return out;
  }
  function xor(bin, n) {
    var ks = stream(n, bin.length), r = '';
    for (var i = 0; i < bin.length; i++) { r += String.fromCharCode(bin.charCodeAt(i) ^ ks[i]); }
    return r;
  }

  window.SECURE = {
    encode: function (obj) {
      var n = (Math.random() * 65535) | 0;
      var bin = unescape(encodeURIComponent(JSON.stringify(obj)));
      return 'P1:' + n.toString(36) + '.' + btoa(xor(bin, n));
    },
    decode: function (str) {
      var m = /^P1:([0-9a-z]+)\.([A-Za-z0-9+/=]+)$/.exec(String(str || '').replace(/\s+/g, ''));
      if (!m) { throw new Error('private 값 형식이 올바르지 않습니다'); }
      return JSON.parse(decodeURIComponent(escape(xor(atob(m[2]), parseInt(m[1], 36)))));
    }
  };
})();
