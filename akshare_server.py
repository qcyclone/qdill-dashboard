import json
import os
import re
import traceback
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import requests

import akshare as ak
import pandas as pd

HOST = "127.0.0.1"
PORT = 8899
ROOT = os.path.dirname(os.path.abspath(__file__))

MANAGE_OVERRIDE = {"160213": 1.0}

CACHE = {
    "daily": None,
    "daily_ts": None,
    "fund_info": {},
}


def now_bj():
    return datetime.now(timezone(timedelta(hours=8)))


def bj_date_str(dt: datetime) -> str:
    return dt.astimezone(timezone(timedelta(hours=8))).strftime("%Y-%m-%d")


def yesterday_bj() -> str:
    return bj_date_str(now_bj() - timedelta(days=1))


def to_float(v):
    try:
        if v is None:
            return None
        if isinstance(v, str):
            v = v.replace("%", "").replace(",", "").strip()
            if v == "":
                return None
        x = float(v)
        if pd.isna(x):
            return None
        return x
    except Exception:
        return None


def load_daily_df(force: bool = False) -> pd.DataFrame:
    # 每 10 分钟刷新一次全量基金表
    if not force and CACHE["daily"] is not None and CACHE["daily_ts"] is not None:
        if (now_bj() - CACHE["daily_ts"]).total_seconds() < 600:
            return CACHE["daily"]

    df = None
    last_err = None
    for fn_name in ["fund_open_fund_daily_em", "fund_em_open_fund_daily"]:
        try:
            fn = getattr(ak, fn_name)
            df = fn()
            if isinstance(df, pd.DataFrame) and not df.empty:
                break
        except Exception as e:
            last_err = e

    if df is None or df.empty:
        raise RuntimeError(f"AKShare daily api failed: {last_err}")

    if "基金代码" in df.columns:
        df["基金代码"] = df["基金代码"].astype(str).str.zfill(6)

    CACHE["daily"] = df
    CACHE["daily_ts"] = now_bj()
    return df


def call_fund_info(symbol: str, indicator: str, period: str | None = None) -> pd.DataFrame:
    # 兼容不同版本参数名
    args_variants = []
    if period:
        args_variants.extend([
            {"symbol": symbol, "indicator": indicator, "period": period},
            {"fund": symbol, "indicator": indicator, "period": period},
        ])
    else:
        args_variants.extend([
            {"symbol": symbol, "indicator": indicator},
            {"fund": symbol, "indicator": indicator},
        ])

    last_err = None
    for kwargs in args_variants:
        for fn_name in ["fund_open_fund_info_em", "fund_em_open_fund_info"]:
            try:
                fn = getattr(ak, fn_name)
                df = fn(**kwargs)
                if isinstance(df, pd.DataFrame) and not df.empty:
                    return df
            except Exception as e:
                last_err = e

    raise RuntimeError(f"AKShare fund info api failed: {last_err}")


def parse_series_last(df: pd.DataFrame):
    # 兼容列名 x/y 或 日期/收益
    cands_x = ["x", "日期", "净值日期", "时间"]
    cands_y = ["y", "收益率", "累计收益率", "value"]

    x_col = next((c for c in cands_x if c in df.columns), None)
    y_col = next((c for c in cands_y if c in df.columns), None)
    if x_col is None or y_col is None:
        # 退化：最后一列按值取
        y_col = df.columns[-1]
        x_col = df.columns[0]

    tmp = df[[x_col, y_col]].copy()
    tmp.columns = ["date", "val"]
    tmp["val"] = tmp["val"].apply(to_float)
    tmp = tmp[tmp["val"].notna()]
    if tmp.empty:
        return None
    return float(tmp.iloc[-1]["val"])


def parse_unit_nav(df: pd.DataFrame):
    cands_d = ["x", "净值日期", "日期", "时间"]
    cands_nav = ["y", "单位净值", "净值"]
    cands_day = ["equityReturn", "日增长率", "涨跌幅"]

    d_col = next((c for c in cands_d if c in df.columns), None)
    n_col = next((c for c in cands_nav if c in df.columns), None)
    day_col = next((c for c in cands_day if c in df.columns), None)

    if d_col is None or n_col is None:
        raise RuntimeError("unit nav columns not found")

    tmp = pd.DataFrame()
    tmp["date"] = df[d_col].astype(str).str.slice(0, 10)
    tmp["nav"] = df[n_col].apply(to_float)
    tmp["day"] = df[day_col].apply(to_float) if day_col else None
    tmp = tmp[tmp["nav"].notna()]
    tmp = tmp.sort_values("date", ascending=False)
    return tmp


def nav_on_or_before(df_nav: pd.DataFrame, date_str: str):
    hit = df_nav[df_nav["date"] <= date_str]
    if hit.empty:
        return None
    return float(hit.iloc[0]["nav"])


def calc_growth(cur, base):
    if cur is None or base is None or base <= 0:
        return None
    return round((cur / base - 1) * 100, 2)


def _num_to_yuan_text(n: float, unit: str = "元") -> str | None:
    if n is None:
        return None
    yuan = n
    if unit == "万元":
        yuan = n * 10000
    elif unit == "亿元":
        yuan = n * 100000000
    if abs(yuan - int(yuan)) < 1e-9:
        return f"{int(yuan)}元"
    return f"{yuan:.2f}".rstrip("0").rstrip(".") + "元"


def fetch_tiantian_meta(code: str) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://fund.eastmoney.com/",
    }

    limit_value = None
    manage_value = None

    # 1) 交易/限额页面
    try:
        u = f"https://fund.eastmoney.com/{code}.html"
        r = requests.get(u, headers=headers, timeout=12)
        r.encoding = r.apparent_encoding or "utf-8"
        txt = r.text

        pats = [
            r"单个账户单日累计申购上限\s*([0-9.,]+)\s*(元|万元|亿元)",
            r"单日累计购买上限\s*([0-9.,]+)\s*(元|万元|亿元)",
            r"单日累计申购上限\s*([0-9.,]+)\s*(元|万元|亿元)",
            r"大额申购(?:限额|上限)?[:：]?\s*([0-9.,]+)\s*(元|万元|亿元)",
            r"限大额(?:申购)?[（(]?\s*([0-9.,]+)\s*(元|万元|亿元)?\s*[)）]?",
        ]
        for pat in pats:
            m = re.search(pat, txt)
            if m:
                n = to_float(m.group(1))
                unit = m.group(2) if m.lastindex and m.lastindex >= 2 and m.group(2) else "元"
                limit_value = _num_to_yuan_text(n, unit)
                if limit_value:
                    break
    except Exception:
        pass

    # 2) 基本概况页面（总费用=管理费率+托管费率）
    try:
        u2 = f"https://fundf10.eastmoney.com/jbgk_{code}.html"
        r2 = requests.get(u2, headers=headers, timeout=12)
        r2.encoding = r2.apparent_encoding or "utf-8"
        txt2 = r2.text

        mgmt = None
        custody = None

        for pat in [
            r"管理费率[^0-9]{0,20}([0-9.]+)%",
            r"基金管理费率[^0-9]{0,20}([0-9.]+)%",
            r"管理费[^0-9]{0,20}([0-9.]+)%",
        ]:
            m2 = re.search(pat, txt2)
            if m2:
                mgmt = to_float(m2.group(1))
                if mgmt is not None:
                    break

        for pat in [
            r"托管费率[^0-9]{0,20}([0-9.]+)%",
            r"基金托管费率[^0-9]{0,20}([0-9.]+)%",
            r"托管费[^0-9]{0,20}([0-9.]+)%",
        ]:
            m3 = re.search(pat, txt2)
            if m3:
                custody = to_float(m3.group(1))
                if custody is not None:
                    break

        if mgmt is not None and custody is not None:
            manage_value = round(mgmt + custody, 4)
        elif mgmt is not None:
            manage_value = mgmt
    except Exception:
        pass

    return {
        "dailyLimit": limit_value,
        "manage": manage_value,
    }

def compute_snapshot(code: str) -> dict:
    daily_df = load_daily_df()
    row_df = daily_df[daily_df["基金代码"].astype(str) == code]
    if row_df.empty:
        raise RuntimeError(f"code not found in daily list: {code}")
    row = row_df.iloc[0]

    name = str(row.get("基金简称", "")) if pd.notna(row.get("基金简称", None)) else None
    today_growth = to_float(row.get("日增长率"))
    fee = str(row.get("手续费", "")).strip() if pd.notna(row.get("手续费", None)) else None
    subscribe_state = str(row.get("申购状态", "")).strip() if pd.notna(row.get("申购状态", None)) else None

    tt_meta = fetch_tiantian_meta(code)
    manage = tt_meta.get("manage")
    if code in MANAGE_OVERRIDE:
        manage = MANAGE_OVERRIDE[code]
    daily_limit = tt_meta.get("dailyLimit")

    # 近1年/今年来优先使用 AKShare 累计收益率走势的 period 口径
    ytd = None
    year = None

    try:
        one_year_df = call_fund_info(code, "累计收益率走势", "1年")
        ytd = parse_series_last(one_year_df)
    except Exception:
        pass

    try:
        year_df = call_fund_info(code, "累计收益率走势", "今年来")
        year = parse_series_last(year_df)
    except Exception:
        pass

    update_date = yesterday_bj()

    # 若累计收益率拿不到，回退到单位净值走势自行计算
    if ytd is None or year is None or today_growth is None:
        unit_df = call_fund_info(code, "单位净值走势")
        nav_df = parse_unit_nav(unit_df)

        if not nav_df.empty:
            latest = nav_df.iloc[0]
            latest_date = str(latest["date"])
            if latest_date <= yesterday_bj():
                update_date = latest_date

            cur_nav = float(latest["nav"])
            one_year_base = nav_on_or_before(nav_df, (now_bj() - timedelta(days=365)).strftime("%Y-%m-%d"))
            year_start = f"{now_bj().year}-01-01"
            year_base = nav_on_or_before(nav_df, year_start)

            if ytd is None:
                ytd = calc_growth(cur_nav, one_year_base)
            if year is None:
                year = calc_growth(cur_nav, year_base)
            if today_growth is None and "day" in nav_df.columns:
                today_growth = to_float(latest.get("day"))

    if subscribe_state and "暂停申购" in subscribe_state:
        daily_limit = "暂停申购"
    elif not daily_limit:
        # 天天基金没拿到具体金额时，回退为状态
        if subscribe_state:
            daily_limit = subscribe_state
        else:
            daily_limit = "--"

    return {
        "code": code,
        "name": name,
        "ytd": round(float(ytd), 2) if ytd is not None else None,
        "year": round(float(year), 2) if year is not None else None,
        "today": round(float(today_growth), 2) if today_growth is not None else None,
        "date": update_date,
        "fee": fee,
        "manage": round(float(manage), 2) if manage is not None else None,
        "dailyLimit": daily_limit,
        "source": "akshare+tiantian",
    }


class Handler(BaseHTTPRequestHandler):
    def _json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _file(self, path):
        if not os.path.isfile(path):
            self.send_error(404)
            return

        ext = os.path.splitext(path)[1].lower()
        ctype = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".txt": "text/plain; charset=utf-8",
        }.get(ext, "application/octet-stream")

        with open(path, "rb") as f:
            body = f.read()

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/api/fund":
            q = parse_qs(u.query)
            code = (q.get("code", [""])[0] or "").strip().zfill(6)
            if not code:
                self._json({"ok": False, "error": "missing code"}, 400)
                return
            try:
                data = compute_snapshot(code)
                self._json({"ok": True, "data": data})
            except Exception as e:
                self._json({
                    "ok": False,
                    "code": code,
                    "error": str(e),
                    "trace": traceback.format_exc(limit=1),
                }, 502)
            return

        if u.path in ["/", ""]:
            return self._file(os.path.join(ROOT, "index.html"))

        rel = u.path.lstrip("/").replace("/", os.sep)
        return self._file(os.path.join(ROOT, rel))


def main():
    print(f"AKShare server running at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop")
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    httpd.serve_forever()


if __name__ == "__main__":
    main()





