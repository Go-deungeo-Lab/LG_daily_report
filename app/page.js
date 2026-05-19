"use client";
import { useState, useCallback, useRef } from "react";

function getWeekDates(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
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

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekLabel, setWeekLabel] = useState("");
  const bodyRef = useRef(null);

  const weekDates = getWeekDates(weekOffset);

  // Auto-generate week label from dates
  const autoWeekLabel = (() => {
    const d = weekDates[0];
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const startOfMonth = new Date(y, d.getMonth(), 1);
    const firstDay = startOfMonth.getDay();
    const weekNum = Math.ceil((d.getDate() + (firstDay === 0 ? 6 : firstDay - 1)) / 7);
    return `${m}월${weekNum}주차`;
  })();

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

  // Each item already has both plan and progress in one row
  const taskNames = items.map((item) => item["업무항목"] || "(미입력)");

  const first = items[0] || {};
  const schedule =
    first["일정시작"] && first["일정종료"]
      ? `${first["일정시작"]} ~ ${first["일정종료"]}`
      : `${fmtISO(weekDates[0])} ~ ${fmtISO(weekDates[4])}`;
  const members = first["진행인원"] || "";

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

  const th = {
    border: "1px solid #000",
    padding: "6px 12px",
    backgroundColor: "#d9e2f3",
    fontWeight: 700,
    fontSize: "13px",
    textAlign: "center",
    whiteSpace: "nowrap",
  };
  const thSub = { ...th, backgroundColor: "#e8edf7", fontSize: "11px" };
  const td = {
    border: "1px solid #000",
    padding: "5px 10px",
    fontSize: "13px",
    textAlign: "center",
    verticalAlign: "middle",
  };
  const tdL = { ...td, textAlign: "left" };
  const tdRed = { ...tdL, color: "#ff0000", fontSize: "12px" };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f3ef",
        color: "#1a1a1a",
        fontFamily: "Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        padding: "28px 16px",
      }}
    >
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            📋 일일업무보고 메일 생성기
          </h1>
          <p style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
            노션 DB → 엑셀 양식 표 → 메일 복사
          </p>
        </div>

        {/* Controls */}
        <div style={card}>
          <label style={labelStyle}>주차 선택</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={navBtn} onClick={() => { setWeekOffset((p) => p - 1); setWeekLabel(""); setItems([]); }}>
              ←
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {fmtISO(weekDates[0])} ~ {fmtISO(weekDates[4])}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 12, color: "#888" }}>주차:</span>
                <input
                  type="text"
                  value={currentWeekLabel}
                  onChange={(e) => setWeekLabel(e.target.value)}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 5,
                    padding: "4px 8px",
                    fontSize: 13,
                    fontFamily: "inherit",
                    width: 120,
                  }}
                  placeholder="예: 5월3주차"
                />
                <span style={{ fontSize: 11, color: "#aaa" }}>← 노션 DB 주차 속성과 일치해야 함</span>
              </div>
            </div>
            <button style={navBtn} onClick={() => { setWeekOffset((p) => p + 1); setWeekLabel(""); setItems([]); }}>
              →
            </button>
          </div>
          <div style={{ marginTop: 14 }}>
            <button style={btnPrimary} onClick={fetchData} disabled={loading}>
              {loading ? "⏳ 불러오는 중..." : `🔄 "${currentWeekLabel}" 불러오기`}
            </button>
          </div>
          {error && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#e74c3c" }}>
              ❌ {error}
            </p>
          )}
          {items.length > 0 && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#16a34a" }}>
              ✅ {items.length}개 업무 로드 완료
            </p>
          )}
        </div>

        {/* Subject */}
        <div style={card}>
          <label style={labelStyle}>메일 제목</label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 12px",
              background: "#f7f7fa",
              border: "1px solid #ddd",
              borderRadius: 7,
            }}
          >
            <span
              style={{
                flex: 1,
                fontWeight: 500,
                fontSize: 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {mailSubject()}
            </span>
            <button
              style={smallBtn}
              onClick={() => copyText(mailSubject(), setCopiedSubject)}
            >
              {copiedSubject ? "✓" : "복사"}
            </button>
          </div>
        </div>

        {/* Mail Body */}
        <div style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <label style={{ ...labelStyle, margin: 0 }}>메일 본문</label>
            <button
              style={copied ? btnSuccess : btnPrimary}
              onClick={copyAsHTML}
            >
              {copied ? "✓ 복사 완료" : "📋 메일용 복사"}
            </button>
          </div>

          <div
            ref={bodyRef}
            style={{
              background: "#fff",
              color: "#000",
              padding: 20,
              borderRadius: 6,
              border: "1px solid #ddd",
              fontFamily:
                "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <p style={{ margin: "0 0 4px" }}>
              <b>가. 일정 :</b>
            </p>
            <p style={{ margin: "0 0 4px" }}>
              - {schedule} (5일)
            </p>
            <br />
            <p style={{ margin: "0 0 4px" }}>
              <b>나. 진행인원 :</b>
            </p>
            <p style={{ margin: "0 0 12px" }}>
              - {members || "(인원 기재)"}
            </p>
            <br />
            <p style={{ margin: "0 0 8px" }}>
              <b>다. 진행현황 :</b>
            </p>

            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                marginBottom: 16,
              }}
            >
              <thead>
                <tr>
                  <th rowSpan={2} style={th}>항목</th>
                  <th rowSpan={2} style={th}>분류</th>
                  {weekDates.map((_, i) => (
                    <th key={i} style={th}>{i + 1}일차</th>
                  ))}
                  <th rowSpan={2} style={th}>진행율(%)</th>
                  <th rowSpan={2} style={th}>비고</th>
                </tr>
                <tr>
                  {weekDates.map((d, i) => (
                    <th key={i} style={thSub}>{fmt(d)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...td, color: "#999", padding: 24 }}>
                      노션에서 불러오기를 눌러주세요
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const name = item["업무항목"] || "(미입력)";
                    return [
                      <tr key={idx + "-p"}>
                        <td
                          rowSpan={2}
                          style={{
                            ...tdL,
                            fontWeight: 600,
                            verticalAlign: "middle",
                          }}
                        >
                          {name}
                        </td>
                        <td style={td}>계획</td>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <td key={n} style={{ ...td, fontSize: 16 }}>
                            {item[`${n}일차_계획`] === "●" ? "●" : ""}
                          </td>
                        ))}
                        <td style={td}>
                          {item["진행율_계획"] != null
                            ? `${item["진행율_계획"]}%`
                            : "100%"}
                        </td>
                        <td style={tdL}></td>
                      </tr>,
                      <tr key={idx + "-g"}>
                        <td style={td}>진행</td>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <td key={n} style={{ ...td, fontSize: 16 }}>
                            {item[`${n}일차_진행`] === "●" ? "●" : ""}
                          </td>
                        ))}
                        <td style={td}>
                          {item["진행율_진행"] != null
                            ? `${item["진행율_진행"]}%`
                            : ""}
                        </td>
                        <td style={item["비고"] ? tdRed : tdL}>
                          {item["비고"] || ""}
                        </td>
                      </tr>,
                    ];
                  })
                )}
              </tbody>
            </table>

            <p style={{ margin: "0 0 4px" }}>
              <b>라. 상세내용</b>
            </p>
            {items.length > 0
              ? items.map((item, idx) => {
                  if (!item["상세내용"]) return null;
                  const lines = item["상세내용"]
                    .split(/\n|(?:^|\s)-\s?/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  return lines.map((line, li) => (
                    <p key={`${idx}-${li}`} style={{ margin: "0 0 2px" }}>
                      - {line}
                    </p>
                  ));
                })
              : <p style={{ margin: "0 0 2px" }}>- (상세내용 기재)</p>}
            <br />
            <p style={{ margin: "0 0 4px" }}>
              <b>마. 특이사항</b>
            </p>
            {items.length > 0
              ? items.map((item, idx) => {
                  return item["특이사항"] ? (
                    <p key={idx} style={{ margin: "0 0 2px" }}>
                      - {item["특이사항"]}
                    </p>
                  ) : null;
                })
              : <p style={{ margin: "0 0 2px" }}>- (특이사항 기재)</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const card = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 20,
  marginBottom: 12,
};
const labelStyle = {
  display: "block",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  color: "#888",
  marginBottom: 10,
  fontWeight: 600,
};
const navBtn = {
  background: "none",
  border: "1px solid #ddd",
  color: "#777",
  width: 28,
  height: 28,
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  borderRadius: 7,
  border: "none",
  background: "#3564e0",
  color: "#fff",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};
const btnSuccess = {
  ...btnPrimary,
  background: "#16a34a",
};
const smallBtn = {
  background: "none",
  border: "none",
  color: "#888",
  cursor: "pointer",
  fontSize: 12,
  padding: "3px 6px",
  borderRadius: 4,
};
