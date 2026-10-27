# 배포 안내

설치도 빌드도 필요 없습니다. 이 폴더의 파일을 그대로 올리면 됩니다.

```
index.html      화면 구조 (OG 태그 블록만 직접 수정)
config.js       모든 내용 — 이름, 날짜, 주소, 계좌, 사진 경로
style.css       디자인
main.js         동작
assets/         사진과 미리보기 이미지 (og.jpg)
```

---

## 0. 로컬에서 먼저 보기

`index.html`을 파일로 바로 열면 일부 기능(네이버 지도, 링크 복사)이 막힙니다.
간단한 웹서버로 띄워서 확인하세요. 아래 중 하나를 이 폴더에서 실행합니다.

```bash
python -m http.server 8080        # 파이썬이 있을 때
npx --yes serve -l 8080           # Node 가 있을 때
```

그다음 휴대폰 크기로 확인합니다. 브라우저 개발자도구(F12) → 기기 모드 → iPhone 14 Pro(390×844).

---

## 1. 내용 채우기 (`config.js`)

`config.js`를 열면 `// TODO:` 표시가 붙은 줄이 보입니다. 그 값만 바꾸면 됩니다.

| 항목 | 위치 |
| --- | --- |
| 신랑·신부 이름, 부모님 성함, 연락처 | `groom`, `bride` |
| 예식 일시 | `date`, `time` |
| 예식장 이름·주소·층 | `venue` |
| 인사말 | `greeting` |
| 사진 경로 | `cover`, `gallery` |
| 계좌 | `accounts` |
| 대중교통·주차 | `transit` |
| 멀리서 오시는 길 | `routes`, `taxi` |

연락처(`tel`)를 비워 두면 그 사람의 전화·문자 버튼은 자동으로 사라집니다.
`routes: []` 로 두면 '멀리서 오시는 길' 영역이 통째로 사라집니다.

### 사진 넣기

1. 사진을 WebP 로 바꿉니다. 갤러리는 장당 **200KB 안팎**, 가로 1200px 정도면 충분합니다.
   (변환: <https://squoosh.app> 에서 끌어다 놓고 WebP 로 저장)
2. `assets/` 에 넣고 `config.js` 의 경로를 적습니다.

```js
cover: 'assets/cover.webp',
gallery: ['assets/01.webp', 'assets/02.webp', 'assets/03.webp'],
```

사진을 아직 안 넣으면 자리 표시가 보입니다. 그대로 두고 먼저 배포해도 괜찮습니다.

### 예식장 좌표 (선택이지만 권장)

`venue.lat` / `venue.lng` 를 채우면 길찾기 앱이 **좌표로 정확히** 열립니다.
비워 두면 장소 이름으로 검색하는 링크가 쓰입니다(동작은 합니다).

좌표 찾는 법: 네이버 지도에서 예식장을 검색 → 주소창 URL 에 보이는
`.../place/1234567?c=15.00,0,0,0,dh` 형태 대신, 지도에서 **우클릭 → 이 위치의 좌표**
또는 카카오맵 검색 후 URL 의 숫자쌍을 보면 됩니다. 형식은 `lat: 37.5612, lng: 127.0376` 입니다.

---

## 2. 네이버 지도 키 발급 (지도를 띄우려면 필요)

키가 없으면 지도 자리에 **주소 안내 카드**가 보입니다. 페이지는 깨지지 않으니
키 없이 먼저 배포하고 나중에 넣어도 됩니다.

1. <https://console.ncloud.com> 에 로그인합니다. *(계정 생성과 로그인은 직접 하셔야 합니다.)*
2. **Services → Application Services → Maps** 로 들어갑니다.
3. **Application 등록** → 이름을 적고 **Dynamic Map** 과 **Geocoding** 을 선택합니다.
   - Geocoding 은 `venue.lat/lng` 를 비워 둘 때 주소로 위치를 찾는 데 쓰입니다. 좌표를 직접 넣으면 필요 없습니다.
4. **Web 서비스 URL** 에 실제 배포 주소를 등록합니다. **등록한 주소에서만 지도가 뜹니다.**
   - 예: `https://내아이디.github.io`
   - 로컬 확인용으로 `http://localhost:8080` 도 함께 등록합니다.
5. 발급된 **Client ID** 를 `config.js` 에 넣습니다.

```js
naverMap: { clientId: '여기에붙여넣기', zoom: 17 },
```

> 이 키는 브라우저에 노출되는 값입니다. 숨길 수 없고, 숨길 필요도 없습니다.
> **도메인(Web 서비스 URL) 등록이 유일한 보안 장치**이므로 4번을 꼭 하세요.
> 지도가 안 뜨면 대부분 4번의 주소가 틀린 경우입니다. 이때는 자동으로 안내 카드로 바뀝니다.

---

## 3. GitHub Pages 로 배포 (추천)

1. GitHub 에 새 저장소를 만듭니다. 이름을 `wedding` 이라고 하면 주소는
   `https://내아이디.github.io/wedding/` 이 됩니다.
2. 이 폴더의 파일을 올립니다.

```bash
git init
git add index.html config.js style.css main.js assets DEPLOY.md
git commit -m "모바일 청첩장"
git branch -M main
git remote add origin https://github.com/내아이디/wedding.git
git push -u origin main
```

3. 저장소 **Settings → Pages → Source** 를 `Deploy from a branch`, 브랜치는 `main`, 폴더는 `/ (root)` 로 둡니다.
4. 1~2분 뒤 주소가 나옵니다.

`CLAUDE.md` 는 작업 지시서이므로 올리지 않아도 됩니다.

> 저장소가 공개(public)여야 Pages 가 무료로 동작합니다. 전화번호와 계좌가 들어 있으니
> `index.html` 의 `noindex, nofollow` 메타 태그를 지우지 마세요. 검색에는 걸리지 않고,
> **주소를 아는 사람만** 들어오는 형태가 됩니다.

### 대안

- **Cloudflare Pages**: <https://pages.cloudflare.com> → Create → Connect to Git → 빌드 설정 없이 그대로 저장. 또는 Direct Upload 로 폴더를 끌어다 놓기.
- **Netlify**: <https://app.netlify.com/drop> 에 이 폴더를 끌어다 놓으면 즉시 주소가 나옵니다.

둘 다 빌드 설정은 비워 두면 됩니다.

---

## 4. 배포 주소 반영 (중요)

주소가 정해지면 **두 곳**을 같은 값으로 맞춰야 합니다.

**① `config.js`**

```js
siteUrl: 'https://내아이디.github.io/wedding/',   // 끝에 / 를 붙이세요
```

**② `index.html` 의 OG 블록** — 카카오톡 크롤러는 자바스크립트를 실행하지 않아
`config.js` 값을 읽지 못합니다. 그래서 이 블록만은 직접 고쳐야 합니다.

```html
<title>민준 ♥ 서연 결혼합니다</title>
<meta property="og:title" content="민준 ♥ 서연 결혼합니다">
<meta property="og:description" content="2027년 2월 20일 토요일 오후 12시 20분, 레노스블랑쉬 2층">
<meta property="og:image" content="https://내아이디.github.io/wedding/assets/og.jpg">
<meta property="og:url" content="https://내아이디.github.io/wedding/">
```

`og:image` 와 `og:url` 은 반드시 `https://` 로 시작하는 **전체 주소**여야 합니다.
두 곳이 어긋나면 브라우저 콘솔에 경고가 찍히니 F12 로 확인할 수 있습니다.

그리고 네이버 클라우드 콘솔의 **Web 서비스 URL** 에도 이 주소를 등록하세요. (2번 4단계)

---

## 5. 카카오톡 미리보기 이미지

`assets/og.jpg` 는 지금 글자만 있는 임시 이미지입니다. 사진으로 바꾸세요.

- 크기 **1200×630** (가로형 2:1), 용량 **300KB 이하**, 형식 **JPG**
- 세로 사진은 양옆이 잘립니다. 가로로 자른 사진을 쓰세요.
- 파일 이름은 `og.jpg` 그대로 두면 다른 곳을 고칠 필요가 없습니다.

### 바꾼 뒤 캐시 비우기

카카오톡은 미리보기를 한 번 읽으면 오래 기억합니다. 문구나 이미지를 바꿨는데
예전 것이 뜨면 캐시를 지워야 합니다.

1. <https://developers.kakao.com/tool/debugger/sharing> 접속
2. 배포 주소를 넣고 **초기화** → **디버그**
3. 카카오톡에서 다시 링크를 붙여 넣어 확인

---

## 6. 선택 기능 켜기

`config.js` 의 `features` 에서 켜고 끕니다.

```js
features: { bgm: false, guestbook: false, rsvp: false },
```

### 배경음악 (`bgm`)

1. `assets/bgm.mp3` 로 음악 파일을 넣습니다.
2. `features.bgm: true` 로 바꿉니다.

오른쪽 위에 ♪ 버튼이 생깁니다. **자동재생은 하지 않습니다** — 모바일 브라우저가
자동재생을 막기 때문이고, 눌러야 켜지는 쪽이 받는 사람에게도 덜 당황스럽습니다.

### 참석 여부 회신 (`rsvp`) · 방명록 (`guestbook`)

둘 다 글을 저장할 서버가 필요합니다. 정적 사이트만으로는 안 됩니다.
가장 간단한 방법은 **구글 폼**을 쓰는 것입니다.

1. <https://forms.google.com> 에서 폼을 만듭니다. (예: 성함 / 참석 여부 / 인원)
2. **보내기 → 링크** 로 주소를 복사합니다.
3. `config.js` 에 넣고 기능을 켭니다.

```js
features: { bgm: false, guestbook: false, rsvp: true },
rsvp: { url: 'https://forms.gle/xxxxxxxx', lead: '편한 방법으로 참석 여부를 알려 주세요.' },
```

방명록도 같은 방식입니다(`guestbook.url`). 받은 글은 구글 스프레드시트에 쌓입니다.
페이지 안에서 바로 글을 쓰고 읽게 하려면 서버나 Firebase 같은 외부 저장소가 필요합니다.

---

## 7. 배포 후 확인 목록

- [ ] 휴대폰에서 열어 가로 스크롤이 없는지 확인
- [ ] 지도가 뜨는지 (또는 안내 카드가 정상으로 보이는지)
- [ ] 길찾기 버튼 — 네이버지도 앱이 열리는지, 앱이 없으면 웹으로 넘어가는지
- [ ] 전화·문자 버튼이 통화 화면을 띄우는지
- [ ] 계좌 복사, 주소 복사, 링크 복사
- [ ] 캘린더에 추가 (카카오톡 안에서는 막히니 구글 캘린더 버튼으로 안내됩니다)
- [ ] 카카오톡에 링크를 붙여 미리보기 확인
- [ ] 브라우저 콘솔(F12)에 빨간 오류가 없는지
