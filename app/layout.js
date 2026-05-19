import "./globals.css";

export const metadata = {
  title: "일일업무보고 메일 생성기",
  description: "노션 DB → 엑셀 양식 표 → 메일 복사",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

// 페이지 로드 시 깜빡임 없이 저장된 테마를 즉시 적용
const themeScript = `
(function(){
  var t = localStorage.getItem('theme');
  if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
