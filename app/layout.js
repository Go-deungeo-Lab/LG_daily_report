export const metadata = {
  title: "일일업무보고 메일 생성기",
  description: "노션 DB → 엑셀 양식 표 → 메일 복사",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
