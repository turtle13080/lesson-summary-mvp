import "./globals.css";

export const metadata = {
  title: "수업 내용 및 과제 안내 생성",
  description: "수학 과외 수업 정리본 생성 도구"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
