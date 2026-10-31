"use client";

import { useEffect, useState } from "react";
import { RolledTrait } from "@/lib/fantasy";

interface FantasyPlayer {
  player_id: string;
  username: string;
  steam_id: string | null;
  steam_name: string | null;
  steam_avatar: string | null;
  team_id: string;
  team_name: string;
  team_tag: string;
  team_logo: string | null;
}

interface FantasyCardData {
  id: string;
  role_slot: string;
  selected_player_id: string | null;
  traits: RolledTrait[];
  points_earned: number;
  selected_player: FantasyPlayer | null;
}

export default function FantasyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    tournament: any;
    is_fantasy_locked: boolean;
    fantasy_tokens: number;
    cards: FantasyCardData[];
    players_by_role: Record<string, FantasyPlayer[]>;
  } | null>(null);

  const [activeModalRole, setActiveModalRole] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchFantasy = async () => {
    try {
      const res = await fetch("/api/fantasy");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFantasy();
  }, []);

  const handleSelectPlayer = async (roleSlot: string, playerId: string | null) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/fantasy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select_player",
          role_slot: roleSlot,
          player_id: playerId,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Ошибка выбора игрока");
      setActiveModalRole(null);
      setMessage({ text: resData.message || "Игрок успешно выбран", type: "success" });
      await fetchFantasy();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRerollTraits = async (roleSlot: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/fantasy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reroll_traits",
          role_slot: roleSlot,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Ошибка перековки");
      setMessage({ text: "Характеристики успешно перекованы! (-1 жетон)", type: "success" });
      await fetchFantasy();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin"></div>
        <p className="text-amber-300 font-bold tracking-wider text-sm">ЗАГРУЗКА COMPENDIUM FANTASY...</p>
      </div>
    );
  }

  const cardsMap = new Map((data?.cards || []).map((c) => [c.role_slot, c]));
  const totalPoints = (data?.cards || []).reduce((acc, c) => acc + (c.points_earned || 0), 0);
  const tokens = data?.fantasy_tokens ?? 20;
  const isLocked = data?.is_fantasy_locked ?? false;

  const renderCardSlot = (roleKey: string, roleTitle: string, roleSubtitle: string) => {
    const card = cardsMap.get(roleKey);
    const player = card?.selected_player;
    const traits = card?.traits || [];

    return (
      <div className="flex flex-col h-full bg-[#121620]/90 border border-amber-500/40 rounded-xl overflow-hidden shadow-xl shadow-black/60 relative group hover:border-amber-400 transition-all duration-300">
        <div className="bg-gradient-to-r from-amber-950/80 via-[#221c13] to-amber-950/80 px-4 py-2.5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-widest text-amber-300 uppercase">{roleTitle}</span>
            <span className="text-[10px] text-slate-400">{roleSubtitle}</span>
          </div>
          <div className="px-2 py-0.5 rounded bg-black/60 border border-amber-500/30 text-[10px] font-bold text-amber-400">
            {Math.round((card?.points_earned || 0) * 100) / 100} PTS
          </div>
        </div>

        <div className="p-4 flex flex-col flex-1 justify-between gap-4">
          <div>
            {player ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-slate-800">
                <div className="relative">
                  {player.steam_avatar ? (
                    <img
                      src={player.steam_avatar}
                      alt={player.username}
                      className="w-14 h-14 rounded-lg object-cover border border-amber-500/50"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-lg font-black text-amber-400">
                      {player.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {player.team_logo && (
                    <img
                      src={player.team_logo}
                      alt={player.team_tag}
                      className="w-5 h-5 rounded-full absolute -bottom-1 -right-1 bg-black p-0.5 border border-amber-400"
                    />
                  )}
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase">
                      {player.team_tag}
                    </span>
                    <span className="text-sm font-extrabold text-white truncate">{player.username}</span>
                  </div>
                  <span className="text-xs text-slate-400 truncate mt-0.5">{player.team_name}</span>
                  <span className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {player.steam_name || "Steam привязан"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-lg border-2 border-dashed border-slate-800 bg-black/20 flex flex-col items-center justify-center text-center gap-2">
                <span className="text-3xl opacity-40">👤</span>
                <span className="text-xs font-bold text-slate-400">Слот не заполнен</span>
                <span className="text-[10px] text-slate-500">Выберите игрока из 4 команд</span>
              </div>
            )}

            {!isLocked && (
              <button
                type="button"
                onClick={() => setActiveModalRole(roleKey)}
                disabled={actionLoading}
                className="w-full mt-3 py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-extrabold text-xs tracking-wider uppercase transition shadow-sm"
              >
                {player ? "Заменить игрока" : "Выбрать игрока"}
              </button>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider text-slate-300 uppercase flex items-center gap-1">
                <span>⚡</span>
                <span>Бонусы карточки (3)</span>
              </span>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => handleRerollTraits(roleKey)}
                  disabled={actionLoading || tokens <= 0}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 disabled:opacity-40"
                  title="Потратить 1 жетон для перековки 3 характеристик"
                >
                  <span>🔄</span>
                  <span>Перековать (1 жетон)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {traits.map((trait, tIdx) => (
                <div
                  key={tIdx}
                  className={`px-2.5 py-1.5 rounded-md border text-xs font-bold flex items-center justify-between ${trait.colorClass}`}
                >
                  <span className="truncate">{trait.label}</span>
                  <span className="font-black text-xs ml-2 shrink-0">+{trait.bonus}%</span>
                </div>
              ))}
              {traits.length === 0 && (
                <div className="text-[11px] text-slate-500 italic py-1">Характеристики еще не сгенерированы</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#17130b] via-[#241a0d] to-[#121622] border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10 overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest self-center lg:self-start mb-3">
              <span>🏆</span>
              <span>The International 2026 Compendium</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              ФЭНТЕЗИ-ЛИГА ИНТА
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              Соберите свой чемпионский ростер из 5 ролей, перековывайте характеристики карточек жетонами и получайте очки за каждый матч турнира!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-black/60 border border-amber-500/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Очки фэнтези</span>
              <span className="text-2xl font-black text-amber-400 mt-0.5">{Math.round(totalPoints * 100) / 100}</span>
            </div>

            <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-black/60 border border-amber-500/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Жетоны перековки</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xl">🪙</span>
                <span className="text-2xl font-black text-amber-400">{tokens}</span>
                <span className="text-xs font-bold text-slate-400">/ 20</span>
              </div>
            </div>

            <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-black/60 border border-amber-500/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Статус</span>
              <span
                className={`text-xs font-black uppercase px-2.5 py-1 rounded mt-1.5 ${
                  isLocked
                    ? "bg-red-950/80 text-red-300 border border-red-500/40"
                    : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {isLocked ? "Заблокировано" : "Выбор открыт"}
              </span>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs font-bold flex items-center justify-between ${
              message.type === "success"
                ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                : "bg-red-950/80 border border-red-500/40 text-red-300"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="ti-gold-banner rounded-2xl p-5 flex flex-col gap-4">
          <div className="text-center pb-3 border-b border-amber-500/40">
            <h2 className="text-xl font-black tracking-widest text-amber-300 uppercase">ОСНОВА</h2>
            <p className="text-xs text-amber-200/60 font-medium">Керри и Сложная линия</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {renderCardSlot("pos1", "Позиция 1", "Керри")}
            {renderCardSlot("pos3", "Позиция 3", "Оффлейнер")}
          </div>
        </div>

        <div className="ti-gold-banner rounded-2xl p-5 flex flex-col gap-4">
          <div className="text-center pb-3 border-b border-amber-500/40">
            <h2 className="text-xl font-black tracking-widest text-amber-300 uppercase">ЦЕНТР</h2>
            <p className="text-xs text-amber-200/60 font-medium">Мидлейнер</p>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {renderCardSlot("pos2", "Позиция 2", "Центральная линия")}
          </div>
        </div>

        <div className="ti-gold-banner rounded-2xl p-5 flex flex-col gap-4">
          <div className="text-center pb-3 border-b border-amber-500/40">
            <h2 className="text-xl font-black tracking-widest text-amber-300 uppercase">ПОДДЕРЖКА</h2>
            <p className="text-xs text-amber-200/60 font-medium">Частичная и полная поддержка</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {renderCardSlot("pos4", "Позиция 4", "Частичная поддержка")}
            {renderCardSlot("pos5", "Позиция 5", "Полная поддержка")}
          </div>
        </div>
      </div>

      <div className="ti-panel rounded-xl p-6 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
            📜
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Формула начисления Compendium Fantasy
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Очки начисляются за убийства (0.3), выживаемость (до 3.0), крипстат (0.003), GPM (0.002), вардинг (0.5), вышки (1.0), Рошана (1.5) и FB (4.0).
              Перекованные бонусы карточки умножают соответствующие показатели!
            </p>
          </div>
        </div>
        <a
          href="/leaderboard"
          className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition shrink-0"
        >
          Посмотреть таблицу лидеров →
        </a>
      </div>

      {activeModalRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0e121b] border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setActiveModalRole(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <span className="text-xs font-black text-amber-400 tracking-widest uppercase">Выбор игрока</span>
              <h3 className="text-lg font-black text-white mt-1">
                Кандидаты на роль: {activeModalRole.toUpperCase()}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Доступны 4 профессиональных игрока, зарегистрированных на эту позицию в командах турнира
              </p>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {(data?.players_by_role[activeModalRole] || []).map((cand) => {
                const currentCard = cardsMap.get(activeModalRole);
                const isSelected = currentCard?.selected_player_id === cand.player_id;

                return (
                  <div
                    key={cand.player_id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/10"
                        : "bg-slate-900/80 border-slate-800 hover:border-amber-500/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {cand.steam_avatar ? (
                          <img
                            src={cand.steam_avatar}
                            alt={cand.username}
                            className="w-12 h-12 rounded-lg object-cover border border-amber-500/40"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-black text-amber-400">
                            {cand.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {cand.team_logo && (
                          <img
                            src={cand.team_logo}
                            alt={cand.team_tag}
                            className="w-4 h-4 rounded-full absolute -bottom-1 -right-1 bg-black p-0.5 border border-amber-400"
                          />
                        )}
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase">
                            {cand.team_tag}
                          </span>
                          <span className="text-sm font-extrabold text-white">{cand.username}</span>
                        </div>
                        <span className="text-xs text-slate-400">{cand.team_name}</span>
                        <span className="text-[10px] text-emerald-400">{cand.steam_name}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleSelectPlayer(activeModalRole, isSelected ? null : cand.player_id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                        isSelected
                          ? "bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300"
                          : "bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20"
                      }`}
                    >
                      {isSelected ? "Снять" : "Выбрать"}
                    </button>
                  </div>
                );
              })}

              {(data?.players_by_role[activeModalRole] || []).length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-900/50 rounded-xl">
                  Команды еще не зарегистрированы или нет игроков на эту роль.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
