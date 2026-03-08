const today = new Date();
const todayText = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

const EM_LSJZ_API = "https://api.fund.eastmoney.com/f10/lsjz";
const TT_GZ_API = "https://fundgz.1234567.com.cn/js";
const DOCTOR_API = "https://api.doctorxiong.club/v1/fund";
const LOCAL_API_CANDIDATES = ["http://127.0.0.1:8899/api/fund", "http://localhost:8899/api/fund", "/api/fund", "http://127.0.0.1:8765/api/fund", "http://localhost:8765/api/fund"];
const CACHE_WRITE_API_CANDIDATES = ["http://127.0.0.1:8899/api/cache", "http://localhost:8899/api/cache", "/api/cache", "http://127.0.0.1:8765/api/cache", "http://localhost:8765/api/cache"];
const tradeInfoCache = new Map(); // code -> { dailyLimit, manage }
const DASHBOARD_CACHE_KEY = "qdii-dashboard-cache-v1";
const STATIC_CACHE_URL = "./data-cache.json";

const groups = [
  {
    id: "nasdaq",
    title: `场外纳斯达克100基金对比（${todayText}）`,
    rows: [
      ["019172", "摩根纳斯达克100指数(QDII)人民币A", 0.12, 0.6, 26.14, 17.82, -3.11, -0.28, "10元", "2026-03-06"],
      ["160213", "国泰纳斯达克100指数", 0.15, 0.0, 18.55, 17.64, -3.05, -0.28, "开放申购", "2026-03-06"],
      ["018043", "天弘纳斯达克100指数发起(QDII)A", 0.1, 0.6, 26.2, 17.6, -2.97, -0.28, "50元", "2026-03-06"],
      ["016452", "南方纳斯达克100指数发起(QDII)A", 0.12, 0.65, 33.25, 17.47, -3.04, -0.28, "50元", "2026-03-06"],
      ["019736", "宝盈纳斯达克100指数发起(QDII)A人民币", 0.12, 0.0, 6.8, 17.37, -3.05, -0.28, "开放申购", "2026-03-06"],
      ["019441", "万家纳斯达克100指数发起式(QDII)A", 0.1, 0.65, 4.98, 17.09, -3.0, -0.28, "10元", "2026-03-06"],
      ["016532", "嘉实纳斯达克100ETF发起联接(QDII)A人民币", 0.1, 0.6, 21.1, 16.49, -2.81, -0.28, "100元", "2026-03-06"],
      ["016055", "博时纳斯达克100ETF发起式联接(QDII)A人民币", 0.1, 0.65, 15.59, 15.74, -2.76, -0.28, "暂停申购", "2026-03-06"],
      ["270042", "广发纳斯达克100ETF联接A人民币(QDII)A", 0.13, 0.0, 108.44, 15.19, -3.13, -0.28, "开放申购", "2026-03-06"],
      ["018966", "汇添富纳斯达克100ETF发起式联接(QDII)人民币A", 0.12, 0.65, 11.33, 14.91, -2.64, -0.28, "100元", "2026-03-06"],
      ["161130", "易方达纳斯达克100ETF联接(QDII-LOF)A", 0.12, 0.0, 16.11, 14.74, -2.86, -0.28, "开放申购", "2026-03-06"],
      ["019524", "华泰柏瑞纳斯达克100ETF发起式联接(QDII)A", 0.12, 0.65, 6.77, 14.69, -3.05, -0.28, "100元", "2026-03-06"],
      ["015299", "华夏纳斯达克100ETF发起式联接(QDII)A", 0.12, 0.8, 3.83, 14.64, -2.15, -0.28, "暂停申购", "2026-03-06"],
      ["000834", "大成纳斯达克100ETF联接(QDII)A", 0.12, 1.0, 38.85, 14.62, -2.86, -0.28, "10元", "2026-03-06"],
      ["019547", "招商纳斯达克100ETF发起式联接(QDII)A", 0.12, 0.65, 15.79, 14.47, -3.02, -0.28, "100元", "2026-03-06"],
      ["539001", "建信纳斯达克100指数(QDII)人民币", 0.12, 1.0, 13.23, 14.21, -3.51, -0.28, "暂停申购", "2026-03-06"],
      ["040046", "华安纳斯达克100ETF联接(QDII)A", 0.12, 0.0, 55.2, 13.69, -3.0, -0.28, "开放申购", "2026-03-06"]
    ]
  },
  {
    id: "sp500",
    title: `场外标普500基金对比（${todayText}）`,
    rows: [
      ["017028", "国泰标普500ETF发起联接(QDII)人民币", 0.1, 0.75, 1.57, 14.56, null, null, "暂停申购", "--"],
      ["017641", "摩根标普500指数(QDII)人民币A", 0.12, 0.0, 31.56, 13.69, -3.3, -1.51, "开放申购", "2026-03-06"],
      ["007721", "天弘标普500发起(QDII-FOF)A", 0.1, 0.8, 26.47, 13.45, null, null, "50元", "--"],
      ["050025", "博时标普500ETF联接A", 0.12, 0.0, 67.56, 12.41, -1.94, -0.05, "开放申购", "2026-03-06"],
      ["161125", "易方达标普500指数人民币A", 0.12, 1.0, 14.75, 12.03, -3.16, -1.38, "10元", "2026-03-06"],
      ["018064", "华夏标普500ETF发起式联接(QDII)A", 0.12, 0.0, 4.09, 11.91, null, null, "开放申购", "--"]
    ]
  }
];

const columns = [
  { key: "code", label: "基金代码" },
  { key: "name", label: "基金名称" },
  { key: "fee", label: "申购费" },
  { key: "manage", label: "总管理费" },
  { key: "scale", label: "规模" },
  { key: "ytd", label: "近1年涨幅" },
  { key: "year", label: "今年涨幅" },
  { key: "today", label: "今日涨幅" },
  { key: "dailyLimit", label: "每日申购上限" },
  { key: "update", label: "更新日期" }
];

const state = {
  sort: {
    nasdaq: { key: "ytd", dir: -1 },
    sp500: { key: "ytd", dir: -1 }
  },
  active: {
    nasdaq: "",
    sp500: ""
  }
};

const board = document.getElementById("board");
const statusText = document.getElementById("statusText");
const statusCount = document.getElementById("statusCount");
const progressBar = document.getElementById("progressBar");
const refreshBtn = document.getElementById("refreshBtn");
const saveAllBtn = document.getElementById("saveAllBtn");

function mapRow(raw) {
  return {
    code: raw[0],
    name: raw[1],
    fee: raw[2],
    manage: raw[3],
    scale: raw[4],
    ytd: raw[5],
    year: raw[6],
    today: raw[7],
    dailyLimit: raw[8],
    update: raw[9]
  };
}

groups.forEach((group) => {
  group.rows = group.rows.map(mapRow);
});

const totalRows = groups.reduce((sum, group) => sum + group.rows.length, 0);

function formatCacheTime(isoText) {
  const dt = new Date(isoText);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(dt);
}

function saveDashboardCache() {
  const payload = {
    savedAt: new Date().toISOString(),
    groups: groups.map((group) => ({
      id: group.id,
      rows: group.rows.map((row) => ({ ...row }))
    }))
  };

  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(payload));
  } catch (_) {
  }

  return payload;
}

async function writeCacheToFile(payload) {
  if (!payload) return false;

  for (const url of CACHE_WRITE_API_CANDIDATES) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (resp.ok) return true;
    } catch (_) {
    }
  }

  return false;
}

function applyCachePayload(payload) {
  if (!payload || !Array.isArray(payload.groups)) return null;

  const groupMap = new Map();
  payload.groups.forEach((group) => {
    if (!group?.id || !Array.isArray(group.rows)) return;
    groupMap.set(group.id, new Map(group.rows.map((row) => [String(row.code), row])));
  });

  groups.forEach((group) => {
    const rowMap = groupMap.get(group.id);
    if (!rowMap) return;
    group.rows = group.rows.map((row) => {
      const hit = rowMap.get(String(row.code));
      if (!hit) return row;
      const merged = { ...row, ...hit, code: row.code };

      if (isDisplayableDailyLimit(merged.dailyLimit)) {
        tradeInfoCache.set(row.code, {
          dailyLimit: normalizeDailyLimitText(String(merged.dailyLimit)),
          manage: Number.isFinite(Number(merged.manage)) ? Number(merged.manage) : null
        });
      }

      return merged;
    });
  });

  return payload.savedAt || null;
}

function restoreDashboardCache() {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    return applyCachePayload(JSON.parse(raw));
  } catch (_) {
    return null;
  }
}

async function restoreStaticCache() {
  try {
    const resp = await fetch(`${STATIC_CACHE_URL}?_=${Date.now()}`, { cache: "no-store" });
    if (!resp.ok) return null;
    const payload = await resp.json();
    return applyCachePayload(payload);
  } catch (_) {
    return null;
  }
}

function displayCell(key, value) {
  if (value === null || value === undefined) return "--";
  if (key === "fee" || key === "manage") return `${value.toFixed(2)}%`;
  if (key === "scale") return `${value.toFixed(2)}亿`;
  if (key === "ytd" || key === "year" || key === "today") return `${value.toFixed(2)}%`;
  return String(value);
}

function numericValue(value) {
  if (value === null || value === undefined || value === "--") return Number.NEGATIVE_INFINITY;
  const num = Number(value);
  return Number.isFinite(num) ? num : Number.NEGATIVE_INFINITY;
}

function dailyLimitSortInfo(value) {
  const text = String(value ?? "").trim();
  const amountMatch = text.match(/^([0-9]+(?:\.[0-9]+)?)元$/);
  if (amountMatch) {
    return { isNumber: true, amount: Number(amountMatch[1]), text };
  }
  if (text.includes("暂停申购")) {
    return { isNumber: true, amount: 0, text: "暂停申购" };
  }
  if (!text || text === "--") {
    return { isNumber: false, amount: Number.NEGATIVE_INFINITY, text: "--" };
  }
  return { isNumber: false, amount: Number.NEGATIVE_INFINITY, text };
}

function compareDailyLimit(a, b) {
  const av = dailyLimitSortInfo(a);
  const bv = dailyLimitSortInfo(b);
  if (av.isNumber && bv.isNumber) {
    if (av.amount === bv.amount) return 0;
    return av.amount - bv.amount;
  }
  if (av.isNumber && !bv.isNumber) return -1;
  if (!av.isNumber && bv.isNumber) return 1;
  return av.text.localeCompare(bv.text, "zh-CN");
}

function sortedRows(group) {
  const sortCfg = state.sort[group.id];
  const rows = [...group.rows];
  if (!sortCfg.key) return rows;

  return rows.sort((a, b) => {
    if (sortCfg.key === "dailyLimit") {
      return compareDailyLimit(a.dailyLimit, b.dailyLimit) * sortCfg.dir;
    }

    if (["code", "name", "update"].includes(sortCfg.key)) {
      const av = String(a[sortCfg.key] ?? "");
      const bv = String(b[sortCfg.key] ?? "");
      return av.localeCompare(bv, "zh-CN") * sortCfg.dir;
    }

    const av = numericValue(a[sortCfg.key]);
    const bv = numericValue(b[sortCfg.key]);
    if (av === bv) return 0;
    return (av - bv) * sortCfg.dir;
  });
}

function tableHasOverflow(table) {
  const cells = table.querySelectorAll("th, td");
  for (const cell of cells) {
    if (cell.scrollWidth > cell.clientWidth + 1) return true;
  }
  return false;
}

function fitPanelTable(panel) {
  const table = panel.querySelector("table");
  if (!table) return;

  const vw = window.innerWidth || document.documentElement.clientWidth || 1200;
  const isMobile = vw <= 768;
  const maxFont = isMobile ? 13.5 : 15;
  const minFont = isMobile ? 9.5 : 12;
  let font = maxFont;

  while (font >= minFont) {
    const padY = isMobile
      ? Math.max(2, Math.round(font * 0.4))
      : Math.max(4, Math.round(font * 0.52));
    const padX = isMobile
      ? Math.max(1, Math.round(font * 0.22))
      : Math.max(2, Math.round(font * 0.28));

    panel.style.setProperty("--tbl-font", `${font}px`);
    panel.style.setProperty("--cell-pad-y", `${padY}px`);
    panel.style.setProperty("--cell-pad-x", `${padX}px`);

    if (!tableHasOverflow(table)) break;
    font -= 0.5;
  }
}

function fitAllTables() {
  board.querySelectorAll(".panel").forEach((panel) => fitPanelTable(panel));
}
function render() {
  board.innerHTML = "";

  groups.forEach((group) => {
    const panel = document.createElement("section");
    panel.className = `panel ${group.id}`;

    const title = document.createElement("h2");
    title.textContent = group.title;

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    columns.forEach((col) => {
      const th = document.createElement("th");
      const sortCfg = state.sort[group.id];
      const isSortedCol = sortCfg.key === col.key;
      const mark = isSortedCol ? (sortCfg.dir > 0 ? " ▲" : " ▼") : "";
      th.textContent = `${col.label}${mark}`;
      if (isSortedCol) th.classList.add("sort-active");
      th.addEventListener("click", () => {
        if (sortCfg.key === col.key) {
          sortCfg.dir = -sortCfg.dir;
        } else {
          sortCfg.key = col.key;
          sortCfg.dir = -1;
        }
        render();
      });
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    const tbody = document.createElement("tbody");

    sortedRows(group).forEach((row) => {
      const tr = document.createElement("tr");
      if (state.active[group.id] === row.code) tr.classList.add("active");

      tr.addEventListener("click", () => {
        state.active[group.id] = row.code;
        statusText.textContent = `已选中 ${row.code} ${row.name}`;
        render();
      });

      columns.forEach((col) => {
        const td = document.createElement("td");
        td.textContent = displayCell(col.key, row[col.key]);
        if (col.key === "name") td.classList.add("name");
        if (state.sort[group.id].key === col.key) td.classList.add("sort-active");
        if (col.key === "ytd") td.classList.add("red");
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    panel.appendChild(title);
    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrap";
    tableWrap.appendChild(table);
    panel.appendChild(tableWrap);
    board.appendChild(panel);
  });
  requestAnimationFrame(fitAllTables);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateInBeijing(dateObj) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(dateObj);

  const year = parts.find((item) => item.type === "year")?.value;
  const month = parts.find((item) => item.type === "month")?.value;
  const day = parts.find((item) => item.type === "day")?.value;
  return `${year}-${month}-${day}`;
}
function getBeijingDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((item) => item.type === "year")?.value;
  const month = parts.find((item) => item.type === "month")?.value;
  const day = parts.find((item) => item.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function shiftDate(dateStr, diffDays) {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + diffDays);
  return dt.toISOString().slice(0, 10);
}

function shiftYear(dateStr, diffYears) {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCFullYear(dt.getUTCFullYear() + diffYears);
  return dt.toISOString().slice(0, 10);
}

function getFirstNumber(obj, keys) {
  for (const key of keys) {
    const num = Number(obj?.[key]);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function getFirstText(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/(\{[\s\S]*\})/);
    if (!match) throw new Error("invalid json payload");
    return JSON.parse(match[1]);
  }
}

function jsonpRequest(url, callbackParam = "callback", timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const cb = `__qdii_cb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const script = document.createElement("script");
    const sep = url.includes("?") ? "&" : "?";
    let finished = false;

    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[cb];
    };

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error("jsonp timeout"));
    }, timeoutMs);

    window[cb] = (data) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error("jsonp error"));
    };

    script.src = `${url}${sep}${callbackParam}=${cb}&_=${Date.now()}`;
    document.body.appendChild(script);
  });
}

function ttJsonp(code, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const prev = window.jsonpgz;
    let finished = false;

    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      window.jsonpgz = prev;
    };

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error("tt jsonp timeout"));
    }, timeoutMs);

    window.jsonpgz = (data) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error("tt jsonp error"));
    };

    script.src = `${TT_GZ_API}/${encodeURIComponent(code)}.js?rt=${Date.now()}`;
    document.body.appendChild(script);
  });
}

function parseEmRecords(raw) {
  const list = raw?.Data?.LSJZList || raw?.data?.LSJZList || raw?.LSJZList;
  if (!Array.isArray(list) || list.length === 0) throw new Error("empty lsjz list");

  return list
    .map((item) => {
      const date = String(item.FSRQ || item.fsrq || "").slice(0, 10);
      const nav = Number(item.DWJZ ?? item.dwjz);
      const dayGrowth = Number(item.JZZZL ?? item.jzzzl);
      return {
        date,
        nav: Number.isFinite(nav) ? nav : null,
        dayGrowth: Number.isFinite(dayGrowth) ? dayGrowth : null
      };
    })
    .filter((item) => item.date && item.nav !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function fetchEmLsjz(code) {
  const url = `${EM_LSJZ_API}?fundCode=${encodeURIComponent(code)}&pageIndex=1&pageSize=400`;

  try {
    const jsonpData = await jsonpRequest(url, "callback", 7000);
    return parseEmRecords(jsonpData);
  } catch (_) {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const text = await fetch(proxyUrl, { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    });
    return parseEmRecords(parseJsonLoose(text));
  }
}

async function fetchTtEstimate(code) {
  try {
    const data = await ttJsonp(code, 6000);
    return {
      name: getFirstText(data, ["name"]),
      todayGrowth: getFirstNumber(data, ["gszzl"]),
      date: getFirstText(data, ["gztime", "jzrq"])?.slice(0, 10) || null
    };
  } catch (_) {
    return null;
  }
}

function navOnOrBefore(records, dateStr) {
  for (const rec of records) {
    if (rec.date <= dateStr && rec.nav !== null) {
      return rec.nav;
    }
  }
  return null;
}

function normalizeUpdateDate(rawDate, beijingToday) {
  const maxDate = shiftDate(beijingToday, -1);
  if (!rawDate || typeof rawDate !== "string") return maxDate;
  const date = rawDate.slice(0, 10);
  return date > maxDate ? maxDate : date;
}
function calcGrowth(currentNav, baseNav) {
  if (!Number.isFinite(currentNav) || !Number.isFinite(baseNav) || baseNav <= 0) return null;
  return Number((((currentNav / baseNav) - 1) * 100).toFixed(2));
}

async function updateRowWithEastmoney(row, beijingToday) {
  const records = await fetchEmLsjz(row.code);
  const latest = records[0];
  if (!latest) throw new Error("no latest nav");

  const tt = await fetchTtEstimate(row.code);
  let growthDate = latest.date;
  let todayGrowth = latest.dayGrowth;
  let effectiveNav = latest.nav;

  if (tt?.name) row.name = tt.name;

  if (tt?.name) row.name = tt.name;

  growthDate = normalizeUpdateDate(growthDate, beijingToday);

  const oneYearBaseDate = shiftYear(beijingToday, -1);
  const yearStartDate = `${beijingToday.slice(0, 4)}-01-01`;

  const oneYearBaseNav = navOnOrBefore(records, oneYearBaseDate);
  const yearBaseNav = navOnOrBefore(records, yearStartDate);

  row.ytd = calcGrowth(effectiveNav, oneYearBaseNav);
  row.year = calcGrowth(effectiveNav, yearBaseNav);
  row.today = Number.isFinite(todayGrowth) ? todayGrowth : null;
  row.update = growthDate;
}

function buildAllOrigins(url) {
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

function buildJina(url) {
  if (url.startsWith("https://")) return `https://r.jina.ai/http://${url.slice(8)}`;
  if (url.startsWith("http://")) return `https://r.jina.ai/http://${url.slice(7)}`;
  return `https://r.jina.ai/http://${url}`;
}

async function fetchJsonNoStore(url) {
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function fetchTextNoStore(url) {
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.text();
}

function normalizeDoctorPayload(raw) {
  const item = Array.isArray(raw?.data) ? raw.data[0] : raw?.data;
  if (!item) throw new Error("doctor empty data");

  return {
    name: getFirstText(item, ["name", "fund_name"]),
    ytd: getFirstNumber(item, ["lastYearGrowth", "last12MonthGrowth", "lastYearRate"]),
    year: getFirstNumber(item, ["thisYearGrowth", "yearGrowth", "lastSixMonthsGrowth"]),
    today: getFirstNumber(item, ["dayGrowth", "expectGrowth", "gszzl"]),
    date: getFirstText(item, ["expectWorthDate", "netWorthDate", "gztime", "updateDate"])?.slice(0, 10) || null
  };
}

async function fetchDoctorSnapshot(code) {
  const url = `${DOCTOR_API}?code=${encodeURIComponent(code)}`;
  try {
    const json = await fetchJsonNoStore(url);
    return normalizeDoctorPayload(json);
  } catch (_) {
    try {
      const text = await fetchTextNoStore(buildAllOrigins(url));
      return normalizeDoctorPayload(parseJsonLoose(text));
    } catch (_) {
      const text = await fetchTextNoStore(buildJina(url));
      return normalizeDoctorPayload(parseJsonLoose(text));
    }
  }
}

async function updateRowWithDoctor(row, beijingToday) {
  const snap = await fetchDoctorSnapshot(row.code);
  if (snap.name) row.name = snap.name;
  if (snap.ytd !== null && snap.ytd !== undefined) row.ytd = Number(snap.ytd);
  if (snap.year !== null && snap.year !== undefined) row.year = Number(snap.year);
  if (snap.today !== null && snap.today !== undefined) row.today = Number(snap.today);

  let d = normalizeUpdateDate(snap.date, beijingToday);
  if (!d) d = beijingToday;
  if (d > beijingToday) d = beijingToday;
  row.update = d;
}
function loadPingZhongDataScript(code, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let done = false;

    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("pingzhongdata timeout"));
    }, timeoutMs);

    script.onload = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);

      const data = {
        name: typeof window.fS_name === "string" ? window.fS_name : null,
        trend: Array.isArray(window.Data_netWorthTrend) ? window.Data_netWorthTrend : null,
        syl1n: Number.isFinite(Number(window.syl_1n)) ? Number(window.syl_1n) : null,
        syl1y: Number.isFinite(Number(window.syl_1y)) ? Number(window.syl_1y) : null
      };

      // 避免全局变量污染后续基金
      try {
        delete window.fS_name;
        delete window.Data_netWorthTrend;
        delete window.syl_1n;
        delete window.syl_1y;
      } catch (_) {
      }

      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error("pingzhongdata error"));
    };

    script.src = `https://fund.eastmoney.com/pingzhongdata/${encodeURIComponent(code)}.js?v=${Date.now()}`;
    document.body.appendChild(script);
  });
}

function trendPointToDaily(trendPoint) {
  const ts = Number(trendPoint?.x);
  const nav = Number(trendPoint?.y);
  const dayGrowth = Number(trendPoint?.equityReturn);
  if (!Number.isFinite(ts) || !Number.isFinite(nav)) return null;

  return {
    date: formatDateInBeijing(new Date(ts)),
    nav,
    dayGrowth: Number.isFinite(dayGrowth) ? dayGrowth : null
  };
}

async function updateRowWithPingZhong(row, beijingToday) {
  const payload = await loadPingZhongDataScript(row.code, 8500);
  const trend = Array.isArray(payload.trend) ? payload.trend.map(trendPointToDaily).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date)) : [];
  if (trend.length === 0) throw new Error("pingzhongdata empty trend");

  const latest = trend[0];
  const oneYearBaseDate = shiftYear(beijingToday, -1);
  const yearStartDate = `${beijingToday.slice(0, 4)}-01-01`;

  const oneYearBaseNav = navOnOrBefore(trend, oneYearBaseDate);
  const yearBaseNav = navOnOrBefore(trend, yearStartDate);

  let growthDate = normalizeUpdateDate(latest.date, beijingToday);

  if (payload.name) row.name = payload.name;
  row.ytd = Number.isFinite(payload.syl1n) ? Number(payload.syl1n.toFixed(2)) : calcGrowth(latest.nav, oneYearBaseNav);
  row.year = calcGrowth(latest.nav, yearBaseNav);
  row.today = Number.isFinite(latest.dayGrowth) ? Number(latest.dayGrowth.toFixed(2)) : (payload.syl1y ?? null);

  if (!Number.isFinite(row.ytd) && Number.isFinite(payload.syl1n)) row.ytd = Number(payload.syl1n.toFixed(2));
  row.update = growthDate;
}
function isConcreteLimit(value) {
  if (!value || typeof value !== "string") return false;
  return /^[0-9]+(?:\.[0-9]+)?元$/.test(value.trim());
}

function isPausedLimit(value) {
  if (!value || typeof value !== "string") return false;
  return value.includes("暂停申购");
}

function isDisplayableDailyLimit(value) {
  return isConcreteLimit(value) || isPausedLimit(value);
}

function normalizeDailyLimitText(value) {
  if (!value || typeof value !== "string") return null;
  const txt = value.trim();
  if (txt.includes("暂停申购")) return "暂停申购";
  return isConcreteLimit(txt) ? txt : null;
}

function parseDailyLimitFromFundPage(html) {
  if (!html || typeof html !== "string") return null;

  const cleaned = html
    .replace(/\r|\n|\t/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  const sectionMatch = cleaned.match(/交易状态：([\s\S]*?)购买手续费：/);
  const section = (sectionMatch ? sectionMatch[1] : cleaned).replace(/<[^>]+>/g, "").replace(/\s+/g, "");

  if (section.includes("暂停申购")) {
    return "暂停申购";
  }

  const toYuanText = (numText, unitText = "元") => {
    const n = Number(String(numText || "").replace(/,/g, ""));
    if (!Number.isFinite(n)) return null;

    let yuan = n;
    if (unitText === "万元") yuan = n * 10000;
    if (unitText === "亿元") yuan = n * 100000000;

    const txt = Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2).replace(/\.00$/, "");
    return `${txt}元`;
  };

  const patterns = [
    /单个账户单日累计申购上限([0-9.,]+)(元|万元|亿元)/,
    /单日累计购买上限([0-9.,]+)(元|万元|亿元)/,
    /单日累计申购上限([0-9.,]+)(元|万元|亿元)/,
    /大额申购(?:限额|上限)?[:：]?([0-9.,]+)(元|万元|亿元)/,
    /限大额(?:申购)?[（(]?([0-9.,]+)(元|万元|亿元)?[)）]?/
  ];

  for (const reg of patterns) {
    const m = section.match(reg);
    if (m) {
      const amount = toYuanText(m[1], m[2] || "元");
      if (isConcreteLimit(amount)) return amount;
    }
  }

  return null;
}

function parseManageFeeFromFundPage(html) {
  if (!html || typeof html !== "string") return null;

  const cleaned = html
    .replace(/\r|\n|\t/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/<[^>]+>/g, "");

  const patterns = [
    /管理费率[:：]?\s*([0-9.]+)%/,
    /基金管理费率[:：]?\s*([0-9.]+)%/,
    /管理费[:：]?\s*([0-9.]+)%/
  ];

  for (const reg of patterns) {
    const m = cleaned.match(reg);
    if (m) {
      const v = Number(m[1]);
      if (Number.isFinite(v) && v >= 0 && v <= 10) return v;
    }
  }

  return null;
}
async function fetchEastmoneyFundPageHtml(code) {
  const baseUrl = `https://fund.eastmoney.com/${encodeURIComponent(code)}.html`;
  const urls = [
    buildAllOrigins(baseUrl),
    buildJina(baseUrl)
  ];

  let lastErr = null;
  for (const url of urls) {
    try {
      const text = await fetchTextNoStore(url);
      if (text && text.length > 1000) return text;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error("fund page unavailable");
}

async function updateDailyLimitFromEastmoney(row) {
  if (tradeInfoCache.has(row.code)) {
    const cached = tradeInfoCache.get(row.code);
    if (cached?.dailyLimit && isDisplayableDailyLimit(cached.dailyLimit)) {
      row.dailyLimit = cached.dailyLimit;
    }
    if (cached?.manage !== null && cached?.manage !== undefined && Number.isFinite(cached.manage)) {
      row.manage = cached.manage;
    }
    if ((cached?.dailyLimit && isDisplayableDailyLimit(cached.dailyLimit)) && (cached?.manage !== null && cached?.manage !== undefined)) {
      return;
    }
  }

  let meta = tradeInfoCache.get(row.code) || { dailyLimit: null, manage: null };

  try {
    const html = await fetchEastmoneyFundPageHtml(row.code);
    const limit = parseDailyLimitFromFundPage(html);
    const manage = parseManageFeeFromFundPage(html);

    if (isDisplayableDailyLimit(limit)) {
      meta.dailyLimit = limit;
      row.dailyLimit = limit;
    }

    if (manage !== null && Number.isFinite(manage)) {
      meta.manage = manage;
      row.manage = manage;
    }

    tradeInfoCache.set(row.code, meta);
  } catch (_) {
  }
}
async function fetchFromLocalApi(code) {
  let lastErr = null;

  for (const base of LOCAL_API_CANDIDATES) {
    try {
      const resp = await fetch(`${base}?code=${encodeURIComponent(code)}&_=${Date.now()}`, { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const json = await resp.json();
      if (!json?.ok || !json?.data) throw new Error(json?.error || "invalid payload");
      return json.data;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error("local api unavailable");
}

async function tryUpdateRowOnce(row, bj) {
  // 这些字段只由天天基金页面回填
  if (!isDisplayableDailyLimit(row.dailyLimit)) row.dailyLimit = "--";
  if (!Number.isFinite(row.manage)) row.manage = row.manage ?? null;

  // AKShare 优先
  try {
    const snap = await fetchFromLocalApi(row.code);
    if (snap.name) row.name = snap.name;
    if (snap.ytd !== null && snap.ytd !== undefined) row.ytd = Number(snap.ytd);
    if (snap.year !== null && snap.year !== undefined) row.year = Number(snap.year);
    if (snap.today !== null && snap.today !== undefined) row.today = Number(snap.today);
    if (snap.manage !== null && snap.manage !== undefined && Number.isFinite(Number(snap.manage))) {
      row.manage = Number(snap.manage);
    }
    if (snap.dailyLimit) {
      const normalizedLimit = normalizeDailyLimitText(String(snap.dailyLimit));
      if (isDisplayableDailyLimit(normalizedLimit)) row.dailyLimit = normalizedLimit;
    }
    row.update = normalizeUpdateDate(snap.date || bj, bj);
    return { ok: true, source: snap.source || "akshare" };
  } catch (_) {
  }

  try {
    await updateRowWithPingZhong(row, bj);
    await updateDailyLimitFromEastmoney(row);
    return { ok: true, source: "东财 pingzhongdata" };
  } catch (_) {
  }

  try {
    await updateRowWithEastmoney(row, bj);
    await updateDailyLimitFromEastmoney(row);
    return { ok: true, source: "东财/天天" };
  } catch (_) {
  }

  try {
    await updateRowWithDoctor(row, bj);
    await updateDailyLimitFromEastmoney(row);
    return { ok: true, source: "doctorxiong" };
  } catch (_) {
  }

  return { ok: false, source: "none" };
}
async function refreshData() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "更新中...";

  const allRows = groups.flatMap((group) => group.rows);
  const total = allRows.length;
  let success = 0;
  let failed = 0;
  let done = 0;

  const concurrency = 6;
  const bj = getBeijingDateString(new Date());
  let nextIndex = 0;

  progressBar.style.width = "0%";
  statusCount.textContent = `0/${total}`;
  statusText.textContent = "并发更新中";

  const updateProgress = (rowCode, source, ok) => {
    done += 1;
    if (ok) {
      success += 1;
      statusText.textContent = `已更新 ${rowCode}`;
    } else {
      failed += 1;
      statusText.textContent = `更新失败 ${rowCode}`;
    }

    statusCount.textContent = `${done}/${total}`;
    progressBar.style.width = `${Math.floor((done / total) * 100)}%`;

    if (done % 3 === 0 || done === total) {
      render();
    }
  };

  const worker = async () => {
    while (true) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= total) break;

      const row = allRows[i];
      let result = await tryUpdateRowOnce(row, bj);
      if (!result.ok) {
        result = await tryUpdateRowOnce(row, bj);
      }
      updateProgress(row.code, result.source, result.ok);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);

  render();
  const cachePayload = saveDashboardCache();
  const fileWritten = await writeCacheToFile(cachePayload);

  if (failed > 0) {
    statusText.textContent = `更新完成：成功 ${success} 条，失败 ${failed} 条（已自动切换多数据源）${fileWritten ? "，并已写入 data-cache.json" : ""}`;
  } else {
    statusText.textContent = `更新完成：全部基金已更新${fileWritten ? "，并已写入 data-cache.json" : ""}`;
  }

  refreshBtn.disabled = false;
  refreshBtn.textContent = "更新所有数据";
}

function drawTableToCanvas(group) {
  const panel = board.querySelector(`.panel.${group.id}`);
  if (!panel) {
    throw new Error(`panel not found: ${group.id}`);
  }

  const table = panel.querySelector("table");
  const titleEl = panel.querySelector("h2");
  const thead = table?.querySelector("thead");
  const headerCells = thead ? Array.from(thead.querySelectorAll("th")) : [];
  const rows = sortedRows(group);

  const panelRect = panel.getBoundingClientRect();
  const tableRect = table.getBoundingClientRect();
  const titleRect = titleEl.getBoundingClientRect();
  const theadRect = thead.getBoundingClientRect();
  const firstBodyRow = table.querySelector("tbody tr");
  const firstBodyRowRect = firstBodyRow ? firstBodyRow.getBoundingClientRect() : null;

  const scale = 2;
  const width = Math.max(1, Math.round(panelRect.width * scale));
  const height = Math.max(1, Math.round(panelRect.height * scale));

  const tableLeft = (tableRect.left - panelRect.left) * scale;
  const tableWidth = tableRect.width * scale;
  const titleY = ((titleRect.top - panelRect.top) + titleRect.height / 2) * scale;
  const headerTop = (theadRect.top - panelRect.top) * scale;
  const headerH = theadRect.height * scale;
  const bodyStartY = firstBodyRowRect ? (firstBodyRowRect.top - panelRect.top) * scale : (headerTop + headerH);
  const rowHeight = firstBodyRowRect ? firstBodyRowRect.height * scale : ((tableRect.height - theadRect.height) / Math.max(rows.length, 1)) * scale;

  const colWidths = [];
  const xOffsets = [];
  if (headerCells.length === columns.length) {
    headerCells.forEach((cell) => {
      const rect = cell.getBoundingClientRect();
      xOffsets.push((rect.left - panelRect.left) * scale);
      colWidths.push(rect.width * scale);
    });
  } else {
    const ratios = [0.08, 0.305, 0.065, 0.065, 0.075, 0.075, 0.075, 0.075, 0.09, 0.095];
    let used = 0;
    ratios.forEach((ratio, idx) => {
      if (idx === ratios.length - 1) {
        colWidths.push(tableWidth - used);
      } else {
        const w = Math.floor(tableWidth * ratio);
        colWidths.push(w);
        used += w;
      }
    });
    let x = tableLeft;
    colWidths.forEach((w) => {
      xOffsets.push(x);
      x += w;
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const titleStyle = getComputedStyle(titleEl);
  const thStyle = headerCells[0] ? getComputedStyle(headerCells[0]) : null;
  const tdSample = table.querySelector("tbody td");
  const tdStyle = tdSample ? getComputedStyle(tdSample) : null;
  const titleFontSize = (parseFloat(titleStyle.fontSize) || 32) * scale;
  const thFontSize = (thStyle ? parseFloat(thStyle.fontSize) : 14) * scale;
  const tdFontSize = (tdStyle ? parseFloat(tdStyle.fontSize) : 13) * scale;

  const fitText = (text, maxWidth) => {
    const raw = String(text ?? "--");
    if (ctx.measureText(raw).width <= maxWidth) return raw;
    const ellipsis = "...";
    let out = raw;
    while (out.length > 0 && ctx.measureText(out + ellipsis).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return out.length > 0 ? out + ellipsis : ellipsis;
  };

  ctx.fillStyle = "#c8d9ea";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#1e5087";
  ctx.font = `bold ${titleFontSize}px 'Microsoft YaHei', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(group.title, width / 2, titleY);

  ctx.fillStyle = "#3d74c6";
  ctx.fillRect(tableLeft, headerTop, tableWidth, headerH);

  ctx.font = `bold ${thFontSize}px 'Microsoft YaHei', sans-serif`;
  ctx.fillStyle = "#f2f7ff";
  const sortCfg = state.sort[group.id] || { key: "", dir: -1 };
  columns.forEach((col, index) => {
    const cx = xOffsets[index] + colWidths[index] / 2;
    const mark = sortCfg.key === col.key ? (sortCfg.dir > 0 ? " ▲" : " ▼") : "";
    const text = fitText(`${col.label}${mark}`, colWidths[index] - 8 * scale);
    ctx.fillText(text, cx, headerTop + headerH / 2);
  });

  rows.forEach((row, rowIndex) => {
    const y = bodyStartY + rowIndex * rowHeight;

    ctx.fillStyle = rowIndex % 2 === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)";
    ctx.fillRect(tableLeft, y, tableWidth, rowHeight);

    ctx.strokeStyle = "#b6c6d8";
    ctx.lineWidth = Math.max(1, scale);
    ctx.strokeRect(tableLeft, y, tableWidth, rowHeight);

    columns.forEach((col, index) => {
      const rawText = displayCell(col.key, row[col.key]);
      const cx = xOffsets[index] + colWidths[index] / 2;
      const text = fitText(rawText, colWidths[index] - 8 * scale);
      ctx.font = `${col.key === "name" ? "bold" : "normal"} ${tdFontSize}px 'Microsoft YaHei', sans-serif`;
      ctx.fillStyle = col.key === "ytd" ? "#f13b3b" : "#17385f";
      ctx.fillText(text, cx, y + rowHeight / 2);
    });
  });

  ctx.strokeStyle = "#b6c6d8";
  ctx.lineWidth = Math.max(1, scale);
  let splitX = tableLeft;
  colWidths.forEach((w) => {
    splitX += w;
    ctx.beginPath();
    ctx.moveTo(splitX, headerTop);
    ctx.lineTo(splitX, bodyStartY + rows.length * rowHeight);
    ctx.stroke();
  });

  return canvas;
}
let html2CanvasLoader = null;

function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (html2CanvasLoader) return html2CanvasLoader;

  html2CanvasLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    script.async = true;
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error("html2canvas load failed"));
    document.head.appendChild(script);
  });

  return html2CanvasLoader;
}

function downloadCanvas(canvas) {
  const anchor = document.createElement("a");
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = `qdii-dashboard-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function saveAllPanels() {
  saveAllBtn.disabled = true;
  saveAllBtn.textContent = "生成中...";

  try {
    try {
      const html2canvas = await loadHtml2Canvas();
      const target = board;
      const canvas = await html2canvas(target, {
        ignoreElements: (el) => el?.classList?.contains("site-footer") || el?.id === "busuanzi_value_site_pv",
        backgroundColor: "#d8d9de",
        scale: Math.max(2, Math.ceil(window.devicePixelRatio || 1)),
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight
      });
      downloadCanvas(canvas);
      statusText.textContent = "整页看板图片已生成并开始下载";
      return;
    } catch (_) {
      // fallback: keep previous painter for environments where CDN is unavailable
    }

    const canvases = groups.map((group) => drawTableToCanvas(group));
    const width = Math.max(...canvases.map((canvas) => canvas.width));
    const gap = 30;
    const totalHeight = canvases.reduce((sum, canvas) => sum + canvas.height, 0) + gap * (canvases.length - 1);

    const merged = document.createElement("canvas");
    merged.width = width;
    merged.height = totalHeight;
    const ctx = merged.getContext("2d");

    let y = 0;
    canvases.forEach((canvas, idx) => {
      ctx.drawImage(canvas, 0, y);
      y += canvas.height;
      if (idx < canvases.length - 1) {
        ctx.fillStyle = "#d8d9de";
        ctx.fillRect(0, y, width, gap);
        y += gap;
      }
    });

    downloadCanvas(merged);
    statusText.textContent = "整页看板图片已生成并开始下载";
  } finally {
    saveAllBtn.disabled = false;
    saveAllBtn.textContent = "⇩ 保存图片";
  }
}

refreshBtn.addEventListener("click", refreshData);
saveAllBtn.addEventListener("click", saveAllPanels);

let fitTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(() => fitAllTables(), 80);
});

async function bootstrap() {
  let cachedAt = restoreDashboardCache();
  let source = "localStorage";

  if (!cachedAt) {
    cachedAt = await restoreStaticCache();
    if (cachedAt) source = "static";
  }

  render();

  if (cachedAt) {
    const sourceText = source === "static" ? "本地文件缓存" : "上次缓存";
    statusText.textContent = `已加载${sourceText}（北京时间 ${formatCacheTime(cachedAt)}）`;
    statusCount.textContent = `${totalRows}/${totalRows}`;
    progressBar.style.width = "100%";
  } else {
    statusText.textContent = "已加载本地默认数据，点击“更新所有数据”拉取最新";
    statusCount.textContent = `0/${totalRows}`;
    progressBar.style.width = "0%";
  }
}

bootstrap();























































































