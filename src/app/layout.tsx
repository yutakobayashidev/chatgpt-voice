import Toaster from "./toaster";
import "./globals.css";

export const metadata = {
  title: "ChatGPT Voice",
  description: "アクセシビリティ特化のChatGPTクライアント。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <Toaster />
      <body className="bg-gray-100">{children}</body>
    </html>
  );
}
