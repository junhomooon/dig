// ==============================
// 리스폰시브 레이아웃 ; 모바일 적용
// ==============================
const IS_MOBILE = window.innerWidth < 768;

const NODE_COUNT = IS_MOBILE ? 400 : 1000;

const PARAGRAPH_HEIGHT_MIN = IS_MOBILE ? 80 : 120;
const PARAGRAPH_HEIGHT_MAX = IS_MOBILE ? 160 : 260;

const PARAGRAPH_GAP_MIN = IS_MOBILE ? 40 : 60;
const PARAGRAPH_GAP_MAX = IS_MOBILE ? 80 : 160;

const MAX_PER_PARAGRAPH = IS_MOBILE ? 4 : 10;
const MIN_PER_PARAGRAPH = 1;

const MAX_TRIES = 30;
const PADDING = 8;

// ==============================
// DOM
// ==============================
const world = document.getElementById("world");
const viewport = document.getElementById("viewport");

const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panel-title");
const panelContent = document.getElementById("panel-content");
const panelLink = document.getElementById("panel-link");
const panelImage = document.getElementById("panel-image");
const panelClose = document.getElementById("panel-close");

const searchInput = document.getElementById("searchInput");
const searchToggle = document.getElementById("searchToggle");
const topbar = document.querySelector(".topbar");

// ==============================
// STATE
// ==============================
let scrollY = 0;
let currentY = IS_MOBILE ? 160 : 240;

// ==============================
// 위키피디아 api 불러오기
// ==============================
async function fetchRandomTitles() {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=random&rnnamespace=0&rnlimit=${NODE_COUNT}`
  );
  const data = await res.json();
  return data.query.random.map(r => r.title);
}

async function fetchKeywordTitles(keyword) {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srlimit=${NODE_COUNT}&srnamespace=0&srsearch=${encodeURIComponent(keyword)}`
  );
  const data = await res.json();
  return data.query.search.map(s => s.title);
}

// ==============================
// 정리 텍스트랑 이미지 불러오기
// ==============================
async function fetchSummary(title) {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  );
  if (!res.ok) throw new Error("summary fetch failed");
  return await res.json(); // { extract, thumbnail, originalimage, ... }
}


function rand(min, max) {
  return min + Math.random() * (max - min);
}

function measureBox(text) {
  const tmp = document.createElement("span");
  tmp.className = "node";
  tmp.style.visibility = "hidden";
  tmp.textContent = text;
  world.appendChild(tmp);
  const rect = tmp.getBoundingClientRect();
  tmp.remove();
  return { w: rect.width + PADDING * 2, h: rect.height + PADDING * 2 };
}

function intersects(a, b) {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  );
}

function setPanelVisible(isVisible) {
  panel.style.display = isVisible ? "block" : "none";
}

function setPanelLoading(title) {
  panelTitle.textContent = title;
  panelContent.innerHTML = "<p>Loading…</p>";
  panelImage.style.display = "none";
  panelImage.src = "";
}

// ==============================
// 레이아웃
// ==============================
function createParagraph(titles) {
  const paragraphHeight = rand(PARAGRAPH_HEIGHT_MIN, PARAGRAPH_HEIGHT_MAX);
  const paragraphGap = rand(PARAGRAPH_GAP_MIN, PARAGRAPH_GAP_MAX);
  const boxes = [];

  titles.forEach(title => {
    const size = measureBox(title);

    for (let i = 0; i < MAX_TRIES; i++) {
      const x = Math.random() * (window.innerWidth - size.w);
      const y = currentY + Math.random() * (paragraphHeight - size.h);

      const candidate = { x, y, ...size };

      if (!boxes.some(b => intersects(candidate, b))) {
        boxes.push(candidate);

        const el = document.createElement("span");
        el.className = "node";
        el.textContent = title;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        el.addEventListener("click", async (e) => {
          e.stopPropagation();

          setPanelVisible(true);
          setPanelLoading(title);

          // 외부 구글 링크 연결
          panelLink.href = `https://www.google.com/search?q=${encodeURIComponent(title)}`;

          try {
            const data = await fetchSummary(title);

            const extract = (data.extract || "").trim();
            panelContent.innerHTML = extract
              ? `<p>${escapeHTML(extract)}</p>`
              : `<p>No summary available.</p>`;

            // 썸네일 우선, 없으면 메인 이미지 삽입 해보는걸로.
            const imgUrl =
              (data.thumbnail && data.thumbnail.source) ||
              (data.originalimage && data.originalimage.source) ||
              "";

            if (imgUrl) {
              panelImage.src = imgUrl;
              panelImage.style.display = "block";
            } else {
              panelImage.style.display = "none";
              panelImage.src = "";
            }
          } catch {
            panelContent.innerHTML = `<p>Failed to load summary.</p>`;
            panelImage.style.display = "none";
            panelImage.src = "";
          }
        });

        world.appendChild(el);
        break;
      }
    }
  });

  currentY += paragraphHeight + paragraphGap;
}

// 방지용 최소 escape
function escapeHTML(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}



function applyScroll() {
  world.style.transform = `translateY(${scrollY}px)`;
}

function clearWorld() {
  world.innerHTML = "";
  currentY = IS_MOBILE ? 160 : 240;
  scrollY = 0;
  applyScroll();
}

function generateMap(titles) {
  clearWorld();

  let index = 0;
  while (index < titles.length) {
    const count =
      MIN_PER_PARAGRAPH +
      Math.floor(Math.random() * (MAX_PER_PARAGRAPH - MIN_PER_PARAGRAPH + 1));

    createParagraph(titles.slice(index, index + count));
    index += count;
  }
}

// ==============================
// 스크롤
// ==============================
viewport.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    scrollY -= e.deltaY;
    applyScroll();
  },
  { passive: false }
);

// ==============================
// 토글바
// ==============================
searchToggle.onclick = () => {
  topbar.classList.add("search-open");
  searchInput.focus();
};

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    topbar.classList.remove("search-open");
    searchInput.value = "";
    setPanelVisible(false);
  }
});

searchInput.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  const keyword = searchInput.value.trim();
  if (!keyword) return;

  try {
    const titles = await fetchKeywordTitles(keyword);
    generateMap(titles);
  } finally {
    topbar.classList.remove("search-open");
  }
});

// ==============================
// 패널 닫기...
// ==============================
panelClose.onclick = () => setPanelVisible(false);


document.addEventListener("click", (e) => {
  if (!panel.contains(e.target) && !topbar.contains(e.target)) {
    // 패널이 열려있을 때만 닫기
    if (panel.style.display === "block") setPanelVisible(false);
  }
});


(async () => {
  const titles = await fetchRandomTitles();
  generateMap(titles);
})();

// ==============================
// 리사이징 컴포넌트
// ==============================
window.addEventListener("resize", () => location.reload());