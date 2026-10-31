"use client";

import { useEffect, useState } from "react";
import AuthModal from "@/components/AuthModal";

interface TournamentItem {
  id: string;
  title: string;
  description: string | null;
  format: string;
  max_teams: number;
  is_public: boolean;
  access_code: string | null;
  prize_pool: string | null;
  banner_url: string | null;
  status: string;
  is_fantasy_locked: boolean;
  is_predictions_locked: boolean;
  teams_count: string;
  created_at: string;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createFormat, setCreateFormat] = useState("double_elimination");
  const [createMaxTeams, setCreateMaxTeams] = useState(8);
  const [createIsPublic, setCreateIsPublic] = useState(true);
  const [createAccessCode, setCreateAccessCode] = useState("");
  const [createPrizePool, setCreatePrizePool] = useState("$25,000");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Register Team Modal
  const [registerTourn, setRegisterTourn] = useState<TournamentItem | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [regAccessCode, setRegAccessCode] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Auth modal fallback
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const loadData = async () => {
    try {
      const [tournRes, authRes, teamsRes] = await Promise.all([
        fetch("/api/tournaments"),
        fetch("/api/auth/me"),
        fetch("/api/teams"),
      ]);

      const tournJson = await tournRes.json();
      const authJson = await authRes.json();
      const teamsJson = await teamsRes.json();

      setTournaments(tournJson.tournaments || []);
      setUser(authJson.user || null);

      if (teamsJson.teams && authJson.user) {
        // Teams where current user is captain
        const captainTeams = teamsJson.teams.filter(
          (t: any) => t.captain_id === authJson.user.id
        );
        setMyTeams(captainTeams);
        if (captainTeams.length > 0) {
          setSelectedTeamId(captainTeams[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading tournaments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: createTitle,
          description: createDesc,
          format: createFormat,
          max_teams: createMaxTeams,
          is_public: createIsPublic,
          access_code: createIsPublic ? undefined : createAccessCode,
          prize_pool: createPrizePool,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка при создании турнира");

      setIsCreateOpen(false);
      setCreateTitle("");
      setCreateDesc("");
      await loadData();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerTourn || !selectedTeamId) return;

    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);

    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_team",
          tournament_id: registerTourn.id,
          team_id: selectedTeamId,
          access_code: regAccessCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");

      setRegSuccess(data.message || "Команда успешно зарегистрирована!");
      setTimeout(async () => {
        setRegisterTourn(null);
        setRegSuccess(null);
        await loadData();
      }, 1500);
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const filteredTournaments = tournaments.filter((t) => {
    if (filterStatus === "registration" && t.status !== "registration") return false;
    if (filterStatus === "ongoing" && t.status !== "ongoing") return false;
    if (filterStatus === "completed" && t.status !== "completed") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-400 animate-spin"></div>
        <p className="text-cyan-300 font-bold tracking-wider text-sm">ЗАГРУЗКА ТУРНИРОВ...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden border border-blue-500/30 bg-[#091224] p-8 sm:p-12 shadow-2xl shadow-blue-500/10">
        <div className="absolute inset-0 opacity-25">
          <img src="/banner.jpg" alt="Arena Banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060a14] via-[#091224]/90 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <span>⚔️</span>
            <span>Турнирная Арена Dota 2</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
            ТУРНИРЫ & <span className="cyber-blue-text">ФЭНТЕЗИ ЛИГИ</span>
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Создавайте собственные турниры по Dota 2 с настраиваемыми сетками и правилами, 
            регистрируйте команды с обязательной верификацией игроков через Steam и участвуйте в официальном 
            фэнтези-компендиуме Valve.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                if (!user) {
                  setIsAuthOpen(true);
                } else {
                  setIsCreateOpen(true);
                }
              }}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition flex items-center gap-2"
            >
              <span>➕</span>
              <span>Создать турнир</span>
            </button>

            <a
              href="/"
              className="px-5 py-3 rounded-xl bg-[#0e1c38] hover:bg-[#152a54] border border-blue-500/30 text-cyan-300 font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2"
            >
              <span>🏆</span>
              <span>Главный чемпионат TI 2026</span>
            </a>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0c162b] border border-blue-900/40">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "Все турниры" },
            { id: "registration", label: "Регистрация открыта" },
            { id: "ongoing", label: "Идут сейчас" },
            { id: "completed", label: "Завершенные" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterStatus === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по турнирам..."
            className="w-full px-3.5 py-2 pl-9 rounded-xl bg-[#080e1c] border border-blue-900/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
          />
          <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
        </div>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTournaments.map((t) => {
          const isFeatured = t.id === "ti-2026-main";
          const currentCount = parseInt(t.teams_count || "0", 10);
          const maxCount = t.max_teams || 8;

          return (
            <div
              key={t.id}
              className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col justify-between ${
                isFeatured
                  ? "border-cyan-400/60 bg-gradient-to-b from-[#0e1d3d] to-[#080f1f] shadow-xl shadow-cyan-500/10"
                  : "border-blue-900/40 bg-[#091122] hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
              }`}
            >
              {/* Card Banner */}
              <div className="relative h-40 overflow-hidden bg-slate-900">
                <img
                  src={t.banner_url || "/banner.jpg"}
                  alt={t.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#091122] via-[#091122]/40 to-transparent"></div>

                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  {isFeatured && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/90 text-black text-[10px] font-black uppercase tracking-wider shadow">
                      FEATURED
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      t.status === "registration"
                        ? "bg-emerald-950/80 border border-emerald-500/50 text-emerald-300"
                        : t.status === "ongoing"
                        ? "bg-blue-950/80 border border-blue-500/50 text-cyan-300"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {t.status === "registration"
                      ? "Регистрация"
                      : t.status === "ongoing"
                      ? "Идет турнир"
                      : "Завершен"}
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 rounded-md bg-black/60 border border-slate-700 text-slate-300 text-[10px] font-semibold">
                    {t.is_public ? "Публичный" : "🔒 Приватный"}
                  </span>
                </div>

                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-blue-950/80 px-2.5 py-0.5 rounded-md border border-cyan-500/30">
                    💰 {t.prize_pool || "$25,000"}
                  </span>
                  <span className="text-xs font-bold text-slate-300 bg-black/70 px-2 py-0.5 rounded-md">
                    👥 {currentCount} / {maxCount} команд
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-extrabold text-lg text-white group-hover:text-cyan-300 transition line-clamp-1">
                    {t.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {t.description || "Полноценный турнир по Dota 2 с динамической сеткой и фэнтези-лигой."}
                  </p>
                </div>

                <div className="pt-2 border-t border-blue-950 flex items-center gap-2">
                  <a
                    href={`/?tournament_id=${t.id}`}
                    className="flex-1 py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-cyan-300 font-bold text-xs text-center transition"
                  >
                    Сетка матчей
                  </a>

                  {t.status === "registration" && (
                    <button
                      onClick={() => {
                        if (!user) {
                          setIsAuthOpen(true);
                        } else {
                          setRegisterTourn(t);
                          setRegError(null);
                          setRegSuccess(null);
                        }
                      }}
                      className="py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs transition shadow-sm"
                    >
                      Регистрация
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTournaments.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-[#091122] border border-blue-900/40 space-y-3">
          <span className="text-4xl">🏆</span>
          <h3 className="text-lg font-bold text-white">Турниры не найдены</h3>
          <p className="text-xs text-slate-400">Попробуйте изменить поисковый запрос или создайте новый турнир.</p>
        </div>
      )}

      {/* CREATE TOURNAMENT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#091122] border border-blue-500/40 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-blue-500/20 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-lg"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="inline-block p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/30 mb-2">
                <span className="text-2xl">⚡</span>
              </div>
              <h2 className="text-xl font-black text-white">Создание турнира по Dota 2</h2>
              <p className="text-xs text-slate-400 mt-1">
                Настройте параметры чемпионата. Сетка и матчи сгенерируются автоматически.
              </p>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Название турнира <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Например: Cyber Dota 2 Spring Cup 2026"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Описание турнира
                </label>
                <textarea
                  rows={2}
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Регламент, серверы, призовые места..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0d182e] border border-blue-900/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Формат турнира
                  </label>
                  <select
                    value={createFormat}
                    onChange={(e) => setCreateFormat(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  >
                    <option value="double_elimination">Double Elimination (Сетка лузеров)</option>
                    <option value="single_elimination">Single Elimination (На выбывание)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Количество команд
                  </label>
                  <select
                    value={createMaxTeams}
                    onChange={(e) => setCreateMaxTeams(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  >
                    <option value={4}>4 команды (Мини-сетка)</option>
                    <option value={8}>8 команд (Стандарт)</option>
                    <option value={16}>16 команд (Мажор)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Призовой фонд
                  </label>
                  <input
                    type="text"
                    value={createPrizePool}
                    onChange={(e) => setCreatePrizePool(e.target.value)}
                    placeholder="$10,000"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0d182e] border border-blue-900/60 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Видимость турнира
                  </label>
                  <select
                    value={createIsPublic ? "public" : "private"}
                    onChange={(e) => setCreateIsPublic(e.target.value === "public")}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0d182e] border border-blue-900/60 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  >
                    <option value="public">Публичный (виден всем)</option>
                    <option value="private">Приватный (по паролю)</option>
                  </select>
                </div>
              </div>

              {!createIsPublic && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Код доступа для регистрации
                  </label>
                  <input
                    type="text"
                    value={createAccessCode}
                    onChange={(e) => setCreateAccessCode(e.target.value)}
                    placeholder="Пароль для команд"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0d182e] border border-blue-900/60 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={createLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
              >
                {createLoading ? "Создание..." : "Создать и опубликовать турнир"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER TEAM MODAL */}
      {registerTourn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#091122] border border-blue-500/40 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-blue-500/20">
            <button
              onClick={() => setRegisterTourn(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-lg"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="inline-block p-2 bg-blue-500/10 rounded-xl border border-blue-500/30 mb-2">
                <span className="text-2xl">📋</span>
              </div>
              <h2 className="text-xl font-black text-white">Регистрация команды</h2>
              <p className="text-xs text-cyan-300 mt-1 font-bold">{registerTourn.title}</p>
            </div>

            {regError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-semibold">
                {regError}
              </div>
            )}

            {regSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                ✓ {regSuccess}
              </div>
            )}

            <div className="mb-4 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-white block">Правило участия:</span>
              <p className="text-[11px] text-slate-400">
                Команда должна иметь 5 заполненных ролей (pos1 - pos5), и у каждого игрока ОБЯЗАТЕЛЬНО должен быть привязан аккаунт Steam.
              </p>
            </div>

            {myTeams.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-slate-400">
                  У вас нет команд, где вы являетесь капитаном. Создайте команду во вкладке «Команды».
                </p>
                <a
                  href="/teams"
                  className="inline-block py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                >
                  Перейти в Команды
                </a>
              </div>
            ) : (
              <form onSubmit={handleRegisterTeam} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Выберите вашу команду
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  >
                    {myTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{t.tag}] {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!registerTourn.is_public && registerTourn.access_code && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Код доступа турнира
                    </label>
                    <input
                      type="text"
                      required
                      value={regAccessCode}
                      onChange={(e) => setRegAccessCode(e.target.value)}
                      placeholder="Введите пароль турнира"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={regLoading || !selectedTeamId}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
                >
                  {regLoading ? "Проверка и запись..." : "Подтвердить регистрацию"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {isAuthOpen && (
        <AuthModal
          mode="login"
          onClose={() => setIsAuthOpen(false)}
          onSuccess={() => {
            setIsAuthOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
