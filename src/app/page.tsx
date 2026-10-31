"use client";

import { useEffect, useState } from "react";

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

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);

  const loadData = async () => {
    try {
      const [tournRes, teamsRes] = await Promise.all([
        fetch("/api/tournaments"),
        fetch("/api/teams"),
      ]);

      const tournJson = await tournRes.json();
      const teamsJson = await teamsRes.json();

      setTournament(tournJson.tournament);
      setMatches(tournJson.matches || []);
      setTeams(teamsJson.teams || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin"></div>
        <p className="text-amber-300 font-bold tracking-wider text-sm">ЗАГРУЗКА ТУРНИРА THE INTERNATIONAL...</p>
      </div>
    );
  }

  const matchMap = new Map(matches.map((m) => [m.match_code, m]));
  const ub1 = matchMap.get("UB1");
  const ub2 = matchMap.get("UB2");
  const ubf = matchMap.get("UBF");
  const lb1 = matchMap.get("LB1");
  const lbf = matchMap.get("LBF");
  const gf = matchMap.get("GF");

  const renderMatchCard = (m?: MatchItem, title?: string) => {
    if (!m) {
      return (
        <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-black/20 text-center text-xs text-slate-500">
          Матч еще не сформирован
        </div>
      );
    }

    const isCompleted = m.status === "completed";
    const t1Wins = isCompleted && m.winner_id === m.team1_id;
    const t2Wins = isCompleted && m.winner_id === m.team2_id;

    return (
      <div
        onClick={() => setSelectedMatch(m)}
        className="cursor-pointer rounded-xl border border-amber-500/30 bg-[#0e121b]/95 p-3.5 shadow-xl hover:border-amber-400 transition group relative"
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-amber-400">{m.match_code}</span>
            <span className="text-slate-400 font-medium truncate max-w-[150px]">{title || m.round_name}</span>
          </div>
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
              isCompleted
                ? "bg-slate-800 text-slate-300"
                : m.team1_id && m.team2_id
                ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-900 text-slate-500"
            }`}
          >
            {isCompleted ? "Завершен" : m.team1_id && m.team2_id ? "Готов" : "Ожидание"}
          </span>
        </div>

        <div className="space-y-1.5">
          <div
            className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition ${
              t1Wins
                ? "bg-amber-500/15 font-black text-amber-300 border border-amber-500/30"
                : "bg-black/30 text-white"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {m.team1_logo && (
                <img src={m.team1_logo} alt={m.team1_tag || ""} className="w-5 h-5 object-contain shrink-0" />
              )}
              <span className="truncate">{m.team1_tag || "TBD"}</span>
            </div>
            <span className="font-mono font-bold px-1.5 text-xs">
              {isCompleted ? m.team1_score : "-"}
            </span>
          </div>

          <div
            className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition ${
              t2Wins
                ? "bg-amber-500/15 font-black text-amber-300 border border-amber-500/30"
                : "bg-black/30 text-white"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {m.team2_logo && (
                <img src={m.team2_logo} alt={m.team2_tag || ""} className="w-5 h-5 object-contain shrink-0" />
              )}
              <span className="truncate">{m.team2_tag || "TBD"}</span>
            </div>
            <span className="font-mono font-bold px-1.5 text-xs">
              {isCompleted ? m.team2_score : "-"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 animate-fade-in">
      <div className="relative rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-[#17130b] via-[#241a0d] to-[#121622] border-2 border-amber-500/50 shadow-2xl shadow-amber-500/15 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest">
            <span>🛡️</span>
            <span>Aegis of Champions • The International 2026</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
            ТУРНИРНАЯ ПЛАТФОРМА И FANTASY COMPENDIUM
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            Полноценная киберспортивная система: 4 команды в сетке Double Elimination (Bo3), ростеры с жестко закрепленными позициями ролей, Compendium Fantasy с перековкой характеристик карточек за жетоны и прогнозы на матчи.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="/fantasy"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
            >
              <span>🏆</span>
              <span>Собрать фэнтези ростер</span>
            </a>

            <a
              href="/predictions"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2"
            >
              <span>🎯</span>
              <span>Сделать прогнозы (Pick&apos;ems)</span>
            </a>

            <a
              href="/teams"
              className="px-6 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs uppercase tracking-wider transition"
            >
              Команды и слоты ролей
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-xl">⚔️</span>
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">
                Турнирная сетка (Double Elimination Bo3)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              4 сильнейших команды сражаются за Aegis of Champions. Нажмите на матч для просмотра деталей.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Статус:</span>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs uppercase">
              {tournament?.status === "registration" ? "Регистрация команд" : "Сетка опубликована"}
            </span>
          </div>
        </div>

        {matches.length > 0 ? (
          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-800 bg-[#070b12]/80 p-6 shadow-2xl overflow-x-auto">
              <div className="min-w-[850px] space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-1.5">
                    <span>🔺</span>
                    <span>Верхняя сетка (Upper Bracket)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Полуфиналы UB (Bo3)</span>
                      <div className="space-y-4">
                        {renderMatchCard(ub1, "Полуфинал 1")}
                        {renderMatchCard(ub2, "Полуфинал 2")}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Финал верхней сетки (Bo3)</span>
                      <div className="h-full flex flex-col justify-center">
                        {renderMatchCard(ubf, "Финал Верхней сетки")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-widest text-sky-400 mb-3 flex items-center gap-1.5">
                    <span>🔻</span>
                    <span>Нижняя сетка (Lower Bracket)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Раунд 1 LB (Bo3)</span>
                      {renderMatchCard(lb1, "Раунд 1 (Матч на вылет)")}
                    </div>

                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Финал нижней сетки (Bo3)</span>
                      {renderMatchCard(lbf, "Финал Нижней сетки")}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-300 mb-3 flex items-center gap-1.5">
                    <span>👑</span>
                    <span>Гранд-Финал (Grand Final Bo3)</span>
                  </h3>
                  <div className="max-w-md mx-auto">
                    {renderMatchCard(gf, "Гранд-Финал за Aegis 2026")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 space-y-3">
            <span className="text-4xl">⏳</span>
            <h3 className="text-lg font-black text-white">Сетка еще формируется</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Ожидается регистрация 4 команд с заполненными позициями и привязанным Steam. Организатор опубликует сетку кнопкой в админ-панели.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <a
                href="/teams"
                className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/20"
              >
                Зарегистрировать команду
              </a>
              <a
                href="/admin"
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                Админ-панель
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-xl">👥</span>
            <h2 className="text-2xl font-black text-white tracking-wide uppercase">
              Команды турнира и слоты ролей
            </h2>
          </div>
          <a href="/teams" className="text-xs font-bold text-amber-400 hover:underline">
            Все команды ({teams.length}) →
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teams.slice(0, 4).map((t) => {
            const membersMap = new Map(t.members.map((m) => [m.role_slot, m]));
            const roles = ["pos1", "pos2", "pos3", "pos4", "pos5"];

            return (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-800 bg-[#0e121b]/95 p-5 shadow-xl flex flex-col justify-between gap-4"
              >
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
                  {t.logo_url && (
                    <img src={t.logo_url} alt={t.tag} className="w-10 h-10 object-contain rounded-lg bg-black/40 p-1 border border-amber-500/30" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white truncate">{t.name}</span>
                    <span className="text-[10px] font-black text-amber-400 uppercase">[{t.tag}]</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {roles.map((roleKey) => {
                    const member = membersMap.get(roleKey);
                    return (
                      <div key={roleKey} className="flex items-center justify-between p-1.5 rounded bg-black/30">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">{roleKey}</span>
                        {member ? (
                          <span className="text-white font-extrabold truncate max-w-[120px]">{member.username}</span>
                        ) : (
                          <span className="text-amber-400/80 text-[10px] italic">Свободно</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0e121b] border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              ✕
            </button>

            <div className="text-center">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                {selectedMatch.match_code} • {selectedMatch.round_name}
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                {selectedMatch.team1_name || "TBD"} vs {selectedMatch.team2_name || "TBD"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Счет: {selectedMatch.status === "completed" ? `${selectedMatch.team1_score} : ${selectedMatch.team2_score}` : "Еще не сыгран"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-slate-800 text-xs space-y-2">
              <span className="font-bold text-amber-300 block">Информация о матче:</span>
              <p className="text-slate-300">
                Формат: Best of 3 (до двух побед). Победитель продвигается по сетке, проигравший либо переходит в нижнюю сетку, либо покидает турнир.
              </p>
              <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>Победитель:</span>
                <span className="font-bold text-white">
                  {selectedMatch.winner_id
                    ? selectedMatch.winner_id === selectedMatch.team1_id
                      ? selectedMatch.team1_name
                      : selectedMatch.team2_name
                    : "Не определен"}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href="/predictions"
                className="flex-1 text-center py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition"
              >
                Сделать прогноз
              </a>
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
