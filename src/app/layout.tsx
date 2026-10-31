import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Danislon Tournaments - Dota 2 Esports & Fantasy Platform",
  description: "Danislon Tournaments - киберспортивная платформа турниров и фэнтези по Dota 2 с интерактивной сеткой плей-офф, карточками Compendium и Pick'ems.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark h-full">
      <body className="min-h-full flex flex-col bg-[#07090e] text-slate-100 antialiased selection:bg-cyan-500 selection:text-black">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 bg-[#06080c] py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-cyan-400 tracking-wider">DANISLON TOURNAMENTS</span>
              <span>•</span>
              <span>Dota 2 Esports & Fantasy Platform</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400 text-[11px]">
              <span>Double Elimination Bo3</span>
              <span>•</span>
              <span>Steam OpenID 2.0</span>
              <span>•</span>
              <span>20 Жетон перековки</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
