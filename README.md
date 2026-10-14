# HTShoujoClub

DJ 행사 **반동소녀구락부(半東少女倶楽部)** 의 아카이브 및 행사 안내 웹페이지.

빌드 도구 없이 동작하는 정적 사이트입니다.

## 로컬 실행

데이터를 `fetch()`로 불러오므로 `index.html`을 직접 열면(`file://`) 동작하지 않습니다. 로컬 서버로 실행하세요.

```
python -m http.server 8000
# → http://localhost:8000
```

VS Code의 Live Server 확장을 써도 됩니다.

## 구조

```
index.html      홈 — 히어로, 진행(예정) 행사, 공지사항·지난 행사 미리보기
notice.html     공지사항 — 공지 목록 (펼쳐서 보기)
archive.html    아카이브 — 전체 행사 목록, 연도 필터
event.html      행사 상세 — event.html?id=vol-03 형태로 접근
about.html      소개 / 연락처
assets/
  css/style.css 전체 스타일 (색상 토큰은 :root에 정의)
  data/data.json 사이트·행사 데이터 ← 콘텐츠 수정은 여기서
  js/main.js    헤더/푸터 삽입 및 페이지 렌더링
  img/          이미지 리소스 (포스터, 사진 등)
```

## 공지 추가

`assets/data/data.json`의 `notices` 배열에 항목을 추가합니다. 고정(`pinned: true`) 공지가 먼저, 그다음 최신순으로 표시됩니다.

| 필드 | 설명 |
|---|---|
| `id` | 고유 ID. `notice.html#notice-<id>`로 해당 공지를 바로 펼쳐서 열 수 있음 |
| `date` | `YYYY-MM-DD` |
| `title` | 제목 |
| `pinned` | `true`면 상단 고정 + 「중요」 표시 |
| `body` | 본문. `\n`으로 줄바꿈 |
| `images` | `[{ src, alt }]` 첨부 이미지 (본문 아래 표시, 누르면 원본) |
| `links` | `[{ label, url }]` 관련 링크 |

## 이미지 추가 (WebP 축소본)

포스터·공지 이미지는 원본을 `assets/img/`에 넣은 뒤 아래 도구를 한 번 실행합니다.

```
python tools/make-webp.py          # 새로 추가·변경된 이미지만 변환
python tools/make-webp.py --force  # 전부 다시 생성
```

- 원본마다 `<이름>-640.webp`(목록 카드용)와 `<이름>-840.webp`(상세·공지 본문용)가 생성됩니다.
- `data.json`에는 **원본 경로**만 적으면 되고, 화면에서는 자동으로 축소본을 사용합니다. 원본은 「원본 보기」에서만 열립니다.
- 축소본이 없으면 원본으로 자동 대체되므로 표시가 깨지지는 않습니다(전송량만 늘어남).
- 필요: Pillow (`python -m pip install --user pillow`)

## 행사 추가

`assets/data/data.json`의 `events` 배열에 항목을 추가합니다. (JSON이므로 마지막 항목 뒤 쉼표, 주석은 허용되지 않습니다.)

| 필드 | 설명 |
|---|---|
| `id` | URL에 쓰이는 고유 ID (`event.html?id=vol-01`) |
| `vol` | 회차 번호 (`3.5` 같은 소수도 가능). 번외 행사(mini 등)는 `null` → 「幕間」으로 표시 |
| `label` | (선택) 포스터 자리표시에 쓸 이름. 예: `"REVENGE"`. 없으면 `Vol.N` / `mini` |
| `title` / `subtitle` | 제목 / 부제 |
| `date` | `YYYY-MM-DD`. 오늘 이후면 진행(예정), 이전이면 아카이브로 자동 분류 |
| `open` / `close` | 시작 / 종료 시각 (`HH:MM`) |
| `venue` | `{ name, address, mapUrl }` |
| `ticket` | `{ price, url, openAt, closeAt }` 또는 `null` (아래 참고) |
| `poster` | `"assets/img/파일명.jpg"` 또는 `null`(자리표시) |
| `description` | 행사 소개 문구 |
| `lineup` | `[{ role, name, x, time, note }]` — `x`는 X 계정 ID(@ 제외). `time`이 있으면 타임테이블, 없으면 역할(DJ/VJ) 순 라인업으로 표시 |
| `credits` | `[{ role, people: [{ name, x }] }]` 스태프 (Organizer, Photo 등) |
| `links` | `[{ label, url }]` 관련 게시글 링크 |

### 예매 버튼

`ticket.openAt` / `ticket.closeAt`(`YYYY-MM-DDTHH:MM`, 방문자 브라우저의 현지 시간 기준)에 따라 버튼 상태가 자동으로 바뀝니다.

| 상태 | 표시 |
|---|---|
| `openAt` 이전 | 비활성 「예매 오픈 예정 · 날짜」 |
| 기간 내 | 활성 「티켓 예매」 (`url`로 이동) |
| `closeAt` 이후 | 비활성 「예매 마감」 |

`closeAt`을 비워 두면 행사 당일 종료 시각까지 예매 가능으로 처리합니다.
