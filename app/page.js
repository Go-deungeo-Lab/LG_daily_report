"use client";
import { useState, useCallback, useRef, useEffect } from "react";

function getWeekDates(offset = 0) {
  // KST 기준 오늘
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60000);
  kst.setDate(kst.getDate() + offset * 7);
  const day = kst.getDay();
  const diff = kst.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(kst.setDate(diff));
  return Array.from({ length: 5 }, (_, i) => {
    const dt = new Date(mon);
    dt.setDate(mon.getDate() + i);
    return dt;
  });
}

function fmt(d) {
  return `${d.getMonth() + 1}월${d.getDate()}일`;
}
function fmtISO(d) {
  return d.toISOString().split("T")[0];
}

function calcWeekLabel(dates) {
  const d = dates[0];
  const m = d.getMonth() + 1;
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const firstMonday = new Date(firstOfMonth);
  const day = firstOfMonth.getDay();
  if (day === 0) firstMonday.setDate(2);
  else if (day === 1) firstMonday.setDate(1);
  else firstMonday.setDate(firstOfMonth.getDate() + (8 - day));
  const diffDays = Math.floor((d - firstMonday) / (1000 * 60 * 60 * 24));
  const weekNum = diffDays < 0 ? 1 : Math.floor(diffDays / 7) + 1;
  return `${m}월${weekNum}주차`;
}

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekLabel, setWeekLabel] = useState("");
  const [isDark, setIsDark] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setIsDark(!isDark);
  };

  const weekDates = getWeekDates(weekOffset);
  const autoWeekLabel = calcWeekLabel(weekDates);
  const currentWeekLabel = weekLabel || autoWeekLabel;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const label = weekLabel || autoWeekLabel;
      const res = await fetch(`/api/notion?week=${encodeURIComponent(label)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [weekLabel, autoWeekLabel]);

  const first = items[0] || {};
  const schedule =
    first["일정시작"] && first["일정종료"]
      ? `${first["일정시작"]} ~ ${first["일정종료"]}`
      : `${fmtISO(weekDates[0])} ~ ${fmtISO(weekDates[4])}`;

  const members = [...new Set(
    items
      .flatMap((item) => (item["진행인원"] || "").split(/[,，]\s*/))
      .filter(Boolean)
  )].join(", ");

  const mailSubject = () => {
    const names = items.map((i) => i["업무항목"]).filter(Boolean).join(", ");
    const ds = fmtISO(new Date()).replace(/-/g, "");
    return `[일일업무보고] ${names || "업무 내용"} 현황 송부의 건_${ds}`;
  };

  const copyAsHTML = async () => {
    const el = bodyRef.current;
    if (!el) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([el.innerHTML], { type: "text/html" }),
          "text/plain": new Blob([el.innerText], { type: "text/plain" }),
        }),
      ]);
    } catch {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("copy");
      sel.removeAllRanges();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const copyText = async (text, setter) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="page-wrapper">
      <div className="page-inner">

        {/* ── Header ── */}
        <div className="page-header">
          <div className="page-header-top">
            <div>
              <h1 className="page-title">
                <span className="page-title-icon">📋</span>
                일일업무보고 생성기
              </h1>
              <p className="page-subtitle">노션 DB → 표 → 메일 복사</p>
            </div>
            <button className="theme-toggle" onClick={toggleTheme} title={isDark ? "라이트 모드" : "다크 모드"}>
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* ── 주차 선택 ── */}
        <div className="card">
          <div className="card-label">주차 선택</div>
          <div className="week-nav">
            <button
              className="nav-arrow"
              onClick={() => { setWeekOffset((p) => p - 1); setWeekLabel(""); setItems([]); }}
              title="이전 주"
            >
              ‹
            </button>
            <div className="week-center">
              <div className="week-range">
                {fmtISO(weekDates[0])} ~ {fmtISO(weekDates[4])}
              </div>
              <div className="week-label-row">
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>주차</span>
                <input
                  className="week-input"
                  type="text"
                  value={currentWeekLabel}
                  onChange={(e) => setWeekLabel(e.target.value)}
                  placeholder="예: 5월3주차"
                />
                <span className="week-label-hint">← 노션 DB 주차 속성과 일치해야 함</span>
              </div>
            </div>
            <button
              className="nav-arrow"
              onClick={() => { setWeekOffset((p) => p + 1); setWeekLabel(""); setItems([]); }}
              title="다음 주"
            >
              ›
            </button>
          </div>

          <div className="action-row">
            <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
              {loading ? "⏳ 불러오는 중…" : `🔄 "${currentWeekLabel}" 불러오기`}
            </button>
            {error && (
              <span className="status-msg error">❌ {error}</span>
            )}
            {!error && items.length > 0 && (
              <span className="status-msg success">✅ {items.length}개 업무 로드</span>
            )}
          </div>
        </div>

        {/* ── 메일 제목 ── */}
        <div className="card">
          <div className="card-label">메일 제목</div>
          <div className="subject-row">
            <span className="subject-text">{mailSubject()}</span>
            <button
              className="btn-copy"
              onClick={() => copyText(mailSubject(), setCopiedSubject)}
            >
              {copiedSubject ? "✓ 복사됨" : "복사"}
            </button>
          </div>
        </div>

        {/* ── 메일 본문 ── */}
        <div className="card">
          <div className="body-card-header">
            <div className="card-label" style={{ margin: 0 }}>메일 본문 미리보기</div>
            <button
              className={`btn ${copied ? "btn-success" : "btn-primary"}`}
              onClick={copyAsHTML}
            >
              {copied ? "✓ 복사 완료" : "📋 메일용 복사"}
            </button>
          </div>

          <div className="mail-preview" ref={bodyRef}>
            <p style={{ margin: "0 0 4px" }}><b>가. 일정 :</b></p>
            <p style={{ margin: "0 0 4px" }}>- {schedule} (5일)</p>
            <br />
            <p style={{ margin: "0 0 4px" }}><b>나. 진행인원 :</b></p>
            <p style={{ margin: "0 0 12px" }}>- {members || "(인원 기재)"}</p>
            <br />
            <p style={{ margin: "0 0 8px" }}><b>다. 진행현황 :</b></p>

            <div className="table-scroll">
              <table className="mail-table">
                <thead>
                  <tr>
                    <th rowSpan={2} className="th-main">항목</th>
                    <th rowSpan={2} className="th-main">분류</th>
                    {weekDates.map((_, i) => (
                      <th key={i} className="th-main">{i + 1}일차</th>
                    ))}
                    <th rowSpan={2} className="th-main">진행율(%)</th>
                    <th rowSpan={2} className="th-main">비고</th>
                  </tr>
                  <tr>
                    {weekDates.map((d, i) => (
                      <th key={i} className="th-sub">{fmt(d)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty-hint">
                        위에서 주차를 선택하고 불러오기를 눌러주세요
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const name = item["업무항목"] || "(미입력)";
                      return [
                        <tr key={idx + "-p"}>
                          <td
                            rowSpan={2}
                            className="td-left"
                            style={{ fontWeight: 600, verticalAlign: "middle" }}
                          >
                            {name}
                          </td>
                          <td>계획</td>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <td key={n} className="td-dot">
                              {item[`${n}일차_계획`] === "●" ? "●" : ""}
                            </td>
                          ))}
                          <td>
                            {item["진행율_계획"] != null ? `${item["진행율_계획"]}%` : "100%"}
                          </td>
                          <td className="td-left"></td>
                        </tr>,
                        <tr key={idx + "-g"}>
                          <td>진행</td>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <td key={n} className="td-dot">
                              {item[`${n}일차_진행`] === "●" ? "●" : ""}
                            </td>
                          ))}
                          <td>
                            {item["진행율_진행"] != null ? `${item["진행율_진행"]}%` : ""}
                          </td>
                          <td className={item["비고"] ? "td-red" : "td-left"}>
                            {item["비고"] || ""}
                          </td>
                        </tr>,
                      ];
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p style={{ margin: "0 0 4px" }}><b>라. 상세내용</b></p>
            {items.length > 0
              ? items.map((item, idx) => {
                  if (!item["상세내용"]) return null;
                  const lines = item["상세내용"]
                    .split(/\n|(?:^|\s)-\s?/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  return lines.map((line, li) => (
                    <p key={`${idx}-${li}`} style={{ margin: "0 0 2px" }}>- {line}</p>
                  ));
                })
              : <p style={{ margin: "0 0 2px" }}>- (상세내용 기재)</p>}
            <br />
            <p style={{ margin: "0 0 4px" }}><b>마. 특이사항</b></p>
            {items.length > 0
              ? items.map((item, idx) =>
                  item["특이사항"] ? (
                    <p key={idx} style={{ margin: "0 0 2px" }}>- {item["특이사항"]}</p>
                  ) : null
                )
              : <p style={{ margin: "0 0 2px" }}>- (특이사항 기재)</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
