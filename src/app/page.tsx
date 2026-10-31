"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface MatchItem {
  id: string;
  match_code: string;
  bracket_type: string;
  round_name: string;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number;
  team2_score: number;
  winner_id: string | null;
  status: string;
  match_order: number;
  team1_name: string | null;
  team1_tag: string | null;
  team1_logo: string | null;
  team2_name: string | null;
  team2_tag: string | null;
  team2_logo: string | null;
}

interface TeamMember {
  role_slot: string;
  user_id: string;
  username: string;
  steam_id: string | null;
  steam_name: string | null;
  steam_avatar: string | null;
}

interface TeamItem {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
  banner_url: string | null;
  members: TeamMember[];
}

interface TournamentItem {
  id: string;
  title: string;
  description: string | null;
  format: string;
  max_teams: number;
  prize_pool: string | null;
  banner_url: string | null;
  status: string;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const queryTournamentId = searchParams.get("tournament_id") || "";

  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<TournamentItem | null>(null);
  const [tournamentsList, setTournamentsList] = useState<TournamentItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);

  const loadData = async (tournId = queryTournamentId) => {
    try {
      const url = tournId ? `/api/tournaments?id=${encodeURIComponent(tournId)}` : "/api/tournaments";
      const [tournRes, teamsRes] = await Promise.all([
        fetch(url),
        fetch("/api/teams"),
      ]);

      const tournJson = await tournRes.json();
      const teamsJson = await teamsRes.json();

      setTournament(tournJson.tournament);
      setTournamentsList(tournJson.tournaments || []);
      setMatches(tournJson.matches || []);
      setTeams(teamsJson.teams || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(queryTournamentId);
  }, [queryTournamentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-cyan-400 animate-spin"></div>
        <p className="text-cyan-300 font-bold tracking-wider text-sm">ЗАГРУЗКА ТУРНИРНОЙ СЕТКИ...</p>
      </div>
    );
  }

  const renderMatchCard = (m?: MatchItem, title?: string) => {
    if (!m) {
      return (
        <div className="p-4 rounded-xl border border-dashed border-blue-900/40 bg-black/30 text-center text-xs text-slate-500">
          Матч формируется
        </div>
      );
    }

    const isCompleted = m.status === "completed";
    const t1Wins = isCompleted && m.winner_id === m.team1_id;
    const t2Wins = isCompleted && m.winner_id === m.team2_id;

    return (
      <div
        onClick={() => setSelectedMatch(m)}
        className={`group p-3.5 rounded-xl border transition cursor-pointer relative overflow-hidden ${
          selectedMatch?.id === m.id
            ? "border-cyan-400 bg-[#0f1d38] shadow-lg shadow-cyan-500/20"
            : "border-blue-900/60 bg-[#0a1324] hover:border-blue-500/60 hover:bg-[#0c1830]"
        }`}
      >
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
          <span className="text-cyan-400 font-mono">{m.match_code}</span>
          <span>{title || m.round_name}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
              isCompleted
                ? "bg-slate-800 text-slate-300"
                : m.status === "in_progress"
                ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40 animate-pulse"
                : "bg-blue-950/60 text-blue-400"
            }`}
          >
            {isCompleted ? "Завершен" : m.status === "in_progress" ? "Live" : "Ожидает"}
          </span>
        </div>

        <div className="space-y-1.5">
          <div
            className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold ${
              t1Wins ? "bg-cyan-950/40 border border-cyan-500/40 text-white" : "bg-black/30 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {m.team1_logo ? (
                <img src={m.team1_logo} alt="" className="w-5 h-5 rounded object-contain" />
              ) : (
                <div className="w-5 h-5 rounded bg-blue-900/60 flex items-center justify-center text-[10px] font-bold text-cyan-300">
                  {m.team1_tag || "?"}
                </div>
              )}
              <span className="truncate max-w-[140px]">{m.team1_name || "TBD"}</span>
            </div>
            <span className={`font-mono font-bold ${t1Wins ? "text-cyan-400 text-sm" : "text-slate-400"}`}>
              {m.team1_score}
            </span>
          </div>

          <div
            className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold ${
              t2Wins ? "bg-cyan-950/40 border border-cyan-500/40 text-white" : "bg-black/30 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {m.team2_logo ? (
                <img src={m.team2_logo} alt="" className="w-5 h-5 rounded object-contain" />
              ) : (
                <div className="w-5 h-5 rounded bg-blue-900/60 flex items-center justify-center text-[10px] font-bold text-cyan-300">
                  {m.team2_tag || "?"}
                </div>
              )}
              <span className="truncate max-w-[140px]">{m.team2_name || "TBD"}</span>
            </div>
            <span className={`font-mono font-bold ${t2Wins ? "text-cyan-400 text-sm" : "text-slate-400"}`}>
              {m.team2_score}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Group matches by bracket type or render standard bracket
  const upperMatches = matches.filter((m) => m.bracket_type === "upper");
  const lowerMatches = matches.filter((m) => m.bracket_type === "lower");
  const grandFinal = matches.find((m) => m.bracket_type === "grand_final") || matches[matches.length - 1];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Tournament Selector & Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0a1324] border border-blue-900/50">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Текущий турнир:</span>
          <select
            value={tournament?.id || ""}
            onChange={(e) => {
              const newId = e.target.value;
              loadData(newId);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#0e1a33] border border-blue-500/40 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {tournamentsList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.format === "double_elimination" ? "Double Elim" : "Single Elim"})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/tournaments"
            className="px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-cyan-300 font-bold text-xs transition"
          >
            🏆 Все турниры
          </a>
          <a
            href="/fantasy"
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition shadow-sm"
          >
            ⚔️ Фэнтези
          </a>
        </div>
      </div>

      {/* Main Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-blue-500/30 bg-[#081020] p-6 sm:p-10 shadow-2xl shadow-blue-500/10">
        <div className="absolute inset-0 opacity-30">
          <img
            src={tournament?.banner_url || "/banner.jpg"}
            alt="Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060a14] via-[#081020]/90 to-transparent"></div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-black uppercase tracking-wider">
                Dota 2 Esports Championship
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-900/60 text-slate-300 text-[11px] font-bold uppercase">
                {tournament?.format === "double_elimination" ? "Double Elimination" : "Single Elimination"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {tournament?.title || "The International 2026: Compendium Championship"}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {tournament?.description ||
                "Официальный турнир по Dota 2 с поддержкой ролевого фэнтези Valve, сетки лузеров и прогнозов на матчи."}
            </p>
          </div>

          <div className="flex flex-row md:flex-col gap-4 text-left md:text-right">
            <div className="p-3.5 rounded-xl bg-blue-950/70 border border-blue-500/40 shadow-inner">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Призовой фонд</span>
              <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
                {tournament?.prize_pool || "$25,000,000"}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-blue-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Статус регистрации</span>
              <span className="text-xs font-bold text-emerald-400">
                {tournament?.status === "registration" ? "Открыта для команд" : "Сетка активна"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bracket Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              Турнирная сетка (Playoffs Bracket)
            </h2>
          </div>
          <span className="text-xs text-slate-400">Нажмите на матч для деталей</span>
        </div>

        {matches.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#091122] border border-blue-900/40">
            <p className="text-xs text-slate-400">Матчи турнира еще генерируются.</p>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#080e1c] border border-blue-900/50 space-y-8 overflow-x-auto">
            {/* Upper Bracket */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
                  Верхняя сетка (Upper Bracket)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upperMatches.map((m) => (
                  <div key={m.id}>{renderMatchCard(m)}</div>
                ))}
              </div>
            </div>

            {/* Lower Bracket */}
            {lowerMatches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-extrabold text-blue-300 uppercase tracking-wider">
                    Нижняя сетка (Lower Bracket)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lowerMatches.map((m) => (
                    <div key={m.id}>{renderMatchCard(m)}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Grand Final */}
            {grandFinal && (
              <div className="space-y-3 max-w-md mx-auto pt-4 border-t border-blue-900/40">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base">👑</span>
                  <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                    Гранд-Финал Чемпионата
                  </span>
                </div>
                {renderMatchCard(grandFinal, grandFinal.round_name)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Match Details Modal / Flyout */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#091122] border border-blue-500/40 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-blue-500/20">
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-lg"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <span className="text-xs font-mono font-bold text-cyan-400 block mb-1">
                {selectedMatch.match_code} • {selectedMatch.round_name}
              </span>
              <h3 className="text-xl font-black text-white">
                {selectedMatch.team1_name || "TBD"} vs {selectedMatch.team2_name || "TBD"}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#060c18] border border-blue-900/40 text-center mb-6">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 block truncate">
                  {selectedMatch.team1_name || "TBD"}
                </span>
                <span className="text-3xl font-mono font-black text-cyan-300">
                  {selectedMatch.team1_score}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 block truncate">
                  {selectedMatch.team2_name || "TBD"}
                </span>
                <span className="text-3xl font-mono font-black text-cyan-300">
                  {selectedMatch.team2_score}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href="/predictions"
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs text-center transition"
              >
                Сделать прогноз
              </a>
              <a
                href="/fantasy"
                className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs text-center transition"
              >
                Фэнтези игроки
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-cyan-400 animate-spin"></div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
