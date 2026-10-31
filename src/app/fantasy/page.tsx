"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  RolledTrait,
  CardQuality,
  CARD_QUALITIES,
  CARD_TITLES,
} from "@/lib/fantasy";

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
  quality: CardQuality;
  title: string;
  traits: RolledTrait[];
  points_earned: number;
  selected_player: FantasyPlayer | null;
}

interface TournamentOption {
  id: string;
  title: string;
}

function FantasyContent() {
  const searchParams = useSearchParams();
  const initialTournamentId = searchParams.get("tournament_id") || "ti-2026-main";

  const [currentTournId, setCurrentTournId] = useState(initialTournamentId);
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    tournament: any;
    is_fantasy_locked: boolean;
    fantasy_tokens: number;
    cards: FantasyCardData[];
    players_by_role: Record<string, FantasyPlayer[]>;
  } | null>(null);

  const [activeModalRole, setActiveModalRole] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchTournaments = async () => {
    try {
      const res = await fetch("/api/tournaments");
      const json = await res.json();
      if (json.tournaments) {
        setTournaments(json.tournaments.map((t: any) => ({ id: t.id, title: t.title })));
      }
    } catch {}
  };

  const fetchFantasy = async (tournId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fantasy?tournament_id=${encodeURIComponent(tournId)}`);
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
    fetchTournaments();
  }, []);

  useEffect(() => {
    fetchFantasy(currentTournId);
  }, [currentTournId]);

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
          tournament_id: currentTournId,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Ошибка сохранения игрока");

      setMessage({ text: resJson.message || "Игрок назначен!", type: "success" });
      setActiveModalRole(null);
      await fetchFantasy(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async (cardId: string, traitId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/fantasy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_lock",
          card_id: cardId,
          trait_id: traitId,
          tournament_id: currentTournId,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Ошибка фиксации свойства");
      await fetchFantasy(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReroll = async (cardId: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/fantasy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reroll_traits",
          card_id: cardId,
          tournament_id: currentTournId,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Ошибка перековки");

      setMessage({ text: resJson.message || "Характеристики карточки перекованы!", type: "success" });
      await fetchFantasy(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-cyan-400 animate-spin"></div>
        <p className="text-cyan-300 font-bold tracking-wider text-sm">ЗАГРУЗКА ФЭНТЕЗИ ЛИГИ...</p>
      </div>
    );
  }

  const roleTitles: Record<string, { title: string; subtitle: string; icon: string }> = {
    pos1: { title: "КЕРРИ", subtitle: "Позиция 1 (Carry)", icon: "⚔️" },
    pos2: { title: "МИДЛЕЙНЕР", subtitle: "Позиция 2 (Mid)", icon: "⚡" },
    pos3: { title: "ОФФЛЕЙНЕР", subtitle: "Позиция 3 (Offlane)", icon: "🛡️" },
    pos4: { title: "SOFT SUPPORT", subtitle: "Позиция 4 (Частичная поддержка)", icon: "🔮" },
    pos5: { title: "HARD SUPPORT", subtitle: "Позиция 5 (Полная поддержка)", icon: "💚" },
  };

  const cardMap = new Map((data?.cards || []).map((c) => [c.role_slot, c]));
  const tokens = data?.fantasy_tokens ?? 20;
  const isLocked = data?.is_fantasy_locked ?? false;

  const totalPoints = (data?.cards || []).reduce((acc, c) => acc + (c.points_earned || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Tournament Selector & Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0a1324] border border-blue-900/50 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Фэнтези для турнира:</span>
          <select
            value={currentTournId}
            onChange={(e) => setCurrentTournId(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl bg-[#0e1a33] border border-blue-500/40 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRulesOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-950/50 hover:bg-blue-900/50 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>📜</span>
            <span>Правила и формулы очков</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs font-bold text-amber-300 shadow-sm">
            <span>🪙</span>
            <span>{tokens} жетонов турнира</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-blue-900 text-xs font-bold text-white">
            <span>Всего очков:</span>
            <span className="font-mono text-cyan-400 text-sm">{Math.round(totalPoints * 100) / 100}</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden border border-blue-500/30 bg-[#081020] p-6 sm:p-10 shadow-2xl shadow-blue-500/10">
        <div className="absolute inset-0 opacity-25">
          <img src="/banner.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060a14] via-[#081020]/90 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <span>🏆</span>
            <span>Официальная механика Компендиума Valve The International 2026</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            ФЭНТЕЗИ ЛИГА: <span className="cyber-blue-text">КРУТКА, ТИТУЛЫ & ЭМБЛЕМЫ</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Соберите ростер из 5 игроков турнира по отдельным ролям. Крутите карточки за жетоны текущего турнира, 
            фиксируйте лучшие показатели замком 🔒, повышайте качество карточки до Редкого, Эпического и Бессмертного, 
            и выбивайте легендарные титулы Valve!
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold ${
            message.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/80 border-red-500/40 text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 5 Individual Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {["pos1", "pos2", "pos3", "pos4", "pos5"].map((roleKey) => {
          const card = cardMap.get(roleKey);
          const meta = roleTitles[roleKey];
          const player = card?.selected_player;
          const qualityKey = (card?.quality || "common") as CardQuality;
          const qualityCfg = CARD_QUALITIES[qualityKey] || CARD_QUALITIES.common;
          const title = card?.title || "Стальной";
          const titleCfg = CARD_TITLES.find((t) => t.name === title);

          return (
            <div
              key={roleKey}
              className={`rounded-2xl border ${qualityCfg.borderClass} bg-[#091122] p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all duration-300 relative group overflow-hidden`}
            >
              {/* Quality Glow Banner */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${qualityCfg.glowClass} to-transparent`}></div>

              {/* Header with Title and Quality Badge */}
              <div className="text-center pb-3 border-b border-blue-900/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${qualityCfg.badgeClass}`}>
                    {qualityCfg.nameRu}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-950/70 border border-blue-800 text-cyan-300">
                    x{qualityCfg.bonusMultiplier}
                  </span>
                </div>

                <div className="pt-1">
                  <span className="text-lg block mb-0.5">{meta.icon}</span>
                  <h3 className="text-base font-black tracking-wider text-white uppercase">{meta.title}</h3>
                  <span className="text-[10px] text-cyan-400 font-bold block">{meta.subtitle}</span>
                </div>

                {/* Valve Title Badge */}
                <div className="pt-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-gradient-to-r from-blue-900/60 to-cyan-900/40 border border-cyan-500/40 text-white font-extrabold text-[11px] tracking-wide">
                    👑 Титул: «{title}»
                  </span>
                  {titleCfg && (
                    <span className="block text-[9px] text-slate-400 mt-0.5 font-medium">
                      {titleCfg.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Player Avatar & Info */}
              <div className="flex flex-col items-center text-center space-y-2 py-1">
                {player ? (
                  <>
                    <div className="relative">
                      {player.steam_avatar ? (
                        <img
                          src={player.steam_avatar}
                          alt={player.username}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-400/80 shadow-lg shadow-cyan-500/20"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-blue-900 border-2 border-cyan-400/80 flex items-center justify-center text-2xl font-black text-cyan-300">
                          {player.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {player.team_logo && (
                        <img
                          src={player.team_logo}
                          alt=""
                          className="w-6 h-6 rounded-full absolute -bottom-1 -right-1 bg-black p-0.5 border border-cyan-400"
                        />
                      )}
                    </div>

                    <div>
                      <span className="font-extrabold text-sm text-white block">{player.username}</span>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        [{player.team_tag}] {player.team_name}
                      </span>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-500/30 text-xs font-mono font-bold text-cyan-300">
                      +{card?.points_earned || 0} pts
                    </div>
                  </>
                ) : (
                  <div className="py-6 space-y-2 text-center">
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-blue-900/80 flex items-center justify-center text-slate-600 text-2xl mx-auto">
                      ?
                    </div>
                    <span className="text-xs text-slate-500 block">Игрок не выбран</span>
                  </div>
                )}
              </div>

              {/* Traits List with Lock Buttons */}
              <div className="space-y-1.5 pt-2 border-t border-blue-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Характеристики карточки:
                  </span>
                  <span className="text-[9px] text-cyan-400 font-semibold">
                    🔒 фиксация
                  </span>
                </div>

                <div className="space-y-1">
                  {(card?.traits || []).map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between px-2 py-1 rounded border text-[11px] transition ${
                        t.locked
                          ? "bg-amber-950/40 border-amber-500/50 shadow-sm shadow-amber-500/10"
                          : "bg-[#0d182e] border-blue-900/50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => card?.id && handleToggleLock(card.id, t.id)}
                        disabled={isLocked || actionLoading}
                        title={t.locked ? "Свойство зафиксировано (не будет перекручено)" : "Зафиксировать свойство"}
                        className={`text-xs mr-1.5 transition ${
                          t.locked ? "text-amber-400 hover:text-amber-200" : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {t.locked ? "🔒" : "🔓"}
                      </button>

                      <span className="text-slate-300 truncate max-w-[105px] flex-1">{t.label}</span>
                      <span className="font-mono font-bold text-cyan-300">+{t.bonus}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons: Select Player & Reroll ("Крутить") */}
              <div className="pt-2 border-t border-blue-900/60 flex flex-col gap-2">
                <button
                  onClick={() => setActiveModalRole(roleKey)}
                  disabled={isLocked}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition disabled:opacity-40"
                >
                  {player ? "Сменить игрока" : "Выбрать игрока"}
                </button>

                {card && card.id && (
                  <button
                    onClick={() => handleReroll(card.id)}
                    disabled={isLocked || tokens <= 0 || actionLoading}
                    className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-600/90 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span>🎲</span>
                    <span>Крутить (1 жетон)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scoring Rules Modal */}
      {rulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#091122] border border-cyan-500/40 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-cyan-500/20 max-h-[85vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setRulesOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-lg"
            >
              ✕
            </button>

            <div className="text-center pb-3 border-b border-blue-900/60">
              <span className="text-3xl block mb-1">📜</span>
              <h2 className="text-xl font-black text-white">Регламент и формулы очков Фэнтези Valve</h2>
              <p className="text-xs text-slate-400 mt-1">
                Официальные правила The International & расчёт battlepass.ru
              </p>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-[#0d182e] border border-blue-900/50 space-y-2">
                <span className="font-extrabold text-white text-sm block">1. Базовые очки за матч (карту):</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>⚔️ Убийства: <span className="font-mono text-cyan-300 font-bold">+1.21</span> / килл</div>
                  <div>☠️ Смерти: <span className="font-mono text-cyan-300 font-bold">18.0 - 1.8</span> / смерть</div>
                  <div>🌾 Добивания (CS): <span className="font-mono text-cyan-300 font-bold">+0.03</span> / крип</div>
                  <div>💰 GPM: <span className="font-mono text-cyan-300 font-bold">x0.02</span></div>
                  <div>🏰 Башни: <span className="font-mono text-cyan-300 font-bold">+3.40</span> / башня</div>
                  <div>🐲 Рошан: <span className="font-mono text-cyan-300 font-bold">+8.50</span> / рошан</div>
                  <div>👁️ Варды: <span className="font-mono text-cyan-300 font-bold">+1.13</span> / вард</div>
                  <div>⚡ Оглушения: <span className="font-mono text-cyan-300 font-bold">+0.15</span> / сек</div>
                  <div>🩸 First Blood: <span className="font-mono text-cyan-300 font-bold">+17.00</span></div>
                  <div>🤝 Ассисты: <span className="font-mono text-cyan-300 font-bold">+0.60</span> / ассист</div>
                  <div>💥 Teamfight: <span className="font-mono text-cyan-300 font-bold">до 18.95</span></div>
                  <div>🌀 Руны: <span className="font-mono text-cyan-300 font-bold">+1.21</span> / руна</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d182e] border border-blue-900/50 space-y-2">
                <span className="font-extrabold text-white text-sm block">2. Качества карточек (Эмблемы):</span>
                <div className="space-y-1.5 text-[11px]">
                  <div>🥉 <span className="font-bold text-stone-300">Обычный (Common)</span>: Базовый множитель x1.0, статы 10% - 20%</div>
                  <div>🥈 <span className="font-bold text-sky-400">Редкий (Rare / Серебро)</span>: Множитель x1.1 (+10% очков), статы 15% - 35%</div>
                  <div>🥇 <span className="font-bold text-amber-400">Эпический (Epic / Золото)</span>: Множитель x1.25 (+25% очков), статы 25% - 50%</div>
                  <div>💎 <span className="font-bold text-emerald-400">Бессмертный (Immortal)</span>: Множитель x1.40 (+40% очков), статы 40% - 75%</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d182e] border border-blue-900/50 space-y-2">
                <span className="font-extrabold text-white text-sm block">3. Механика крутки и жетоны перековки:</span>
                <p className="leading-relaxed">
                  Жетоны перековки привязаны к конкретному турниру. При нажатии «Крутить» вы тратите 1 жетон турнира.
                  Зафиксированные замочком 🔒 свойства сохраняются, а остальные перекручиваются со свежими процентами бонуса.
                  Также есть шанс повысить качество эмблемы и получить новый титул!
                </p>
              </div>
            </div>

            <button
              onClick={() => setRulesOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase transition"
            >
              Понятно, закрыть
            </button>
          </div>
        </div>
      )}

      {/* Player Selection Modal */}
      {activeModalRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#091122] border border-blue-500/40 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-blue-500/20 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setActiveModalRole(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-lg"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <span className="text-xs font-mono font-bold text-cyan-400 block mb-1 uppercase">
                {roleTitles[activeModalRole]?.subtitle}
              </span>
              <h3 className="text-xl font-black text-white">Выберите игрока в ростер</h3>
            </div>

            <div className="space-y-2 mb-6">
              {((data?.players_by_role && data.players_by_role[activeModalRole]) || []).map((p) => {
                const currentSelected = cardMap.get(activeModalRole)?.selected_player_id === p.player_id;

                return (
                  <div
                    key={p.player_id}
                    onClick={() => handleSelectPlayer(activeModalRole, p.player_id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      currentSelected
                        ? "bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10"
                        : "bg-[#0d182e] border-blue-900/60 hover:border-cyan-500/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {p.steam_avatar ? (
                        <img src={p.steam_avatar} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-xs font-bold text-cyan-300">
                          {p.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-extrabold text-sm text-white block">{p.username}</span>
                        <span className="text-xs text-slate-400">
                          [{p.team_tag}] {p.team_name}
                        </span>
                      </div>
                    </div>

                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                        currentSelected
                          ? "bg-cyan-400 text-black font-extrabold"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {currentSelected ? "Выбран ✓" : "Выбрать"}
                    </button>
                  </div>
                );
              })}

              {((data?.players_by_role && data.players_by_role[activeModalRole]) || []).length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs bg-[#0d182e] rounded-xl border border-blue-900/40">
                  В этом турнире пока нет зарегистрированных команд с игроками на данную роль.
                </div>
              )}
            </div>

            {cardMap.get(activeModalRole)?.selected_player_id && (
              <button
                onClick={() => handleSelectPlayer(activeModalRole, null)}
                disabled={actionLoading}
                className="w-full py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-bold transition"
              >
                Снять игрока со слота
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FantasyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
      }
    >
      <FantasyContent />
    </Suspense>
  );
}
