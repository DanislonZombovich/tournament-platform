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
  creator_id?: string | null;
  is_fantasy_locked: boolean;
  is_predictions_locked: boolean;
  teams_count: string;
  signup_token?: string;
  created_at: string;
  // Challonge options
  grand_final_format?: string;
  split_participants_losers?: boolean;
  break_ties_placement?: boolean;
  registration_type?: string;
  entry_fee_type?: string;
  teams_required?: boolean;
  min_team_size?: number;
  max_team_size?: number;
  allow_incomplete_teams?: boolean;
  participant_cap?: number;
  start_time?: string | null;
  start_time_tentative?: boolean;
  open_voting_all?: boolean;
  predictions_bracket?: boolean;
  predict_lower_bracket?: boolean;
  prediction_scoring_type?: string;
  allow_predictions_pre_tournament?: boolean;
  exp_shareable_images?: boolean;
  exp_require_verified_emails?: boolean;
  exp_allow_specific_countries?: boolean;
  exp_custom_prediction_fields?: boolean;
  initial_rerolls?: number;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedTournId, setCopiedTournId] = useState<string | null>(null);

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

  // Edit / Settings Modal (Challonge-style)
  const [editTourn, setEditTourn] = useState<TournamentItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editFormat, setEditFormat] = useState("double_elimination");
  const [editMaxTeams, setEditMaxTeams] = useState(8);
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editAccessCode, setEditAccessCode] = useState("");
  const [editPrizePool, setEditPrizePool] = useState("$25,000");
  const [editStatus, setEditStatus] = useState("registration");
  const [editBannerUrl, setEditBannerUrl] = useState("/banner.jpg");
  const [editFantasyLocked, setEditFantasyLocked] = useState(false);
  const [editPredictionsLocked, setEditPredictionsLocked] = useState(false);

  // Challonge specific state
  const [editGrandFinal, setEditGrandFinal] = useState("two_matches");
  const [editSplitLosers, setEditSplitLosers] = useState(false);
  const [editBreakTies, setEditBreakTies] = useState(false);
  const [editRegType, setEditRegType] = useState("public_page");
  const [editEntryFee, setEditEntryFee] = useState("free");
  const [editTeamsRequired, setEditTeamsRequired] = useState(true);
  const [editMinTeam, setEditMinTeam] = useState(5);
  const [editMaxTeam, setEditMaxTeam] = useState(7);
  const [editAllowIncomplete, setEditAllowIncomplete] = useState(false);
  const [editParticipantCap, setEditParticipantCap] = useState(8);
  const [editStartTime, setEditStartTime] = useState("");
  const [editTimeTentative, setEditTimeTentative] = useState(true);
  const [editOpenVoting, setEditOpenVoting] = useState(false);
  const [editPredBracket, setEditPredBracket] = useState(true);
  const [editPredLower, setEditPredLower] = useState(true);
  const [editPredScoring, setEditPredScoring] = useState("exponential");
  const [editAllowPredPre, setEditAllowPredPre] = useState(false);
  const [editExpImages, setEditExpImages] = useState(false);
  const [editExpEmails, setEditExpEmails] = useState(false);
  const [editExpCountries, setEditExpCountries] = useState(false);
  const [editExpFields, setEditExpFields] = useState(false);
  const [editInitialRerolls, setEditInitialRerolls] = useState(20);

  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Register Team Modal
  const [registerTourn, setRegisterTourn] = useState<TournamentItem | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [regAccessCode, setRegAccessCode] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Auth modal fallback
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const isAdmin = Boolean(user && (user.role === "admin" || user.id === "usr_d98221e7ed837829"));

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

  const openEditModal = (t: TournamentItem) => {
    setEditTourn(t);
    setEditTitle(t.title);
    setEditDesc(t.description || "");
    setEditFormat(t.format || "double_elimination");
    setEditMaxTeams(t.max_teams || 8);
    setEditIsPublic(t.is_public);
    setEditAccessCode(t.access_code || "");
    setEditPrizePool(t.prize_pool || "$25,000");
    setEditStatus(t.status || "registration");
    setEditBannerUrl(t.banner_url || "/banner.jpg");
    setEditFantasyLocked(Boolean(t.is_fantasy_locked));
    setEditPredictionsLocked(Boolean(t.is_predictions_locked));

    // Challonge fields
    setEditGrandFinal(t.grand_final_format || "two_matches");
    setEditSplitLosers(Boolean(t.split_participants_losers));
    setEditBreakTies(Boolean(t.break_ties_placement));
    setEditRegType(t.registration_type || "public_page");
    setEditEntryFee(t.entry_fee_type || "free");
    setEditTeamsRequired(t.teams_required !== false);
    setEditMinTeam(t.min_team_size || 5);
    setEditMaxTeam(t.max_team_size || 7);
    setEditAllowIncomplete(Boolean(t.allow_incomplete_teams));
    setEditParticipantCap(t.participant_cap || t.max_teams || 8);
    setEditStartTime(t.start_time ? t.start_time.slice(0, 16) : "");
    setEditTimeTentative(t.start_time_tentative !== false);
    setEditOpenVoting(Boolean(t.open_voting_all));
    setEditPredBracket(t.predictions_bracket !== false);
    setEditPredLower(t.predict_lower_bracket !== false);
    setEditPredScoring(t.prediction_scoring_type || "exponential");
    setEditAllowPredPre(Boolean(t.allow_predictions_pre_tournament));
    setEditExpImages(Boolean(t.exp_shareable_images));
    setEditExpEmails(Boolean(t.exp_require_verified_emails));
    setEditExpCountries(Boolean(t.exp_allow_specific_countries));
    setEditExpFields(Boolean(t.exp_custom_prediction_fields));
    setEditInitialRerolls(t.initial_rerolls || 20);

    setEditError(null);
    setEditSuccess(null);
    setIsDeleting(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && tournaments.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const editId = params.get("edit");
      if (editId) {
        const target = tournaments.find((t) => t.id === editId);
        if (target) {
          openEditModal(target);
        }
      }
    }
  }, [tournaments]);

  const handleUpdateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTourn) return;

    setEditLoading(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const res = await fetch("/api/tournaments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTourn.id,
          title: editTitle,
          description: editDesc,
          format: editFormat,
          max_teams: editMaxTeams,
          is_public: editIsPublic,
          access_code: editIsPublic ? null : editAccessCode,
          prize_pool: editPrizePool,
          banner_url: editBannerUrl,
          status: editStatus,
          is_fantasy_locked: editFantasyLocked,
          is_predictions_locked: editPredictionsLocked,
          // Challonge fields
          grand_final_format: editGrandFinal,
          split_participants_losers: editSplitLosers,
          break_ties_placement: editBreakTies,
          registration_type: editRegType,
          entry_fee_type: editEntryFee,
          teams_required: editTeamsRequired,
          min_team_size: editMinTeam,
          max_team_size: editMaxTeam,
          allow_incomplete_teams: editAllowIncomplete,
          participant_cap: editParticipantCap,
          start_time: editStartTime || null,
          start_time_tentative: editTimeTentative,
          open_voting_all: editOpenVoting,
          predictions_bracket: editPredBracket,
          predict_lower_bracket: editPredLower,
          prediction_scoring_type: editPredScoring,
          allow_predictions_pre_tournament: editAllowPredPre,
          exp_shareable_images: editExpImages,
          exp_require_verified_emails: editExpEmails,
          exp_allow_specific_countries: editExpCountries,
          exp_custom_prediction_fields: editExpFields,
          initial_rerolls: editInitialRerolls,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения настроек");

      setEditSuccess(data.message || "Настройки турнира успешно сохранены!");
      await loadData();
      setTimeout(() => {
        setEditTourn(null);
        setEditSuccess(null);
      }, 1000);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!editTourn) return;
    if (!confirm(`Вы действительно хотите удалить турнир "${editTourn.title}"? Это действие необратимо!`)) {
      return;
    }

    setIsDeleting(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/tournaments?id=${encodeURIComponent(editTourn.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка при удалении турнира");

      setEditTourn(null);
      await loadData();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

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
          tournament_id: registerTourn.id,
          team_id: selectedTeamId,
          access_code: regAccessCode || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка при регистрации команды");

      setRegSuccess(data.message || "Команда успешно зарегистрирована!");
      await loadData();
      setTimeout(() => {
        setRegisterTourn(null);
        setRegSuccess(null);
      }, 1500);
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const filteredTournaments = tournaments.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || "").toLowerCase().includes(q);
      return matchTitle || matchDesc;
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
            Платформа Danislon Tournaments с официальными правилами сетки Challonge и фэнтези-лигой Valve Compendium The International 2026.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isAdmin ? (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition flex items-center gap-2"
              >
                <span>➕</span>
                <span>Создать турнир</span>
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-blue-950/40 border border-blue-900/60 text-xs text-slate-400 flex items-center gap-2">
                <span>🛡️</span>
                <span>Создание турниров доступно только владельцу платформы</span>
              </div>
            )}

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
          const maxCount = t.participant_cap || t.max_teams || 8;
          const canManage = isAdmin || Boolean(user && t.creator_id === user.id);

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

                <div className="absolute top-3 right-3 flex items-center gap-1">
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
                    {t.description || "Полноценный турнир по Dota 2 с сеткой Challonge и фэнтези-лигой Valve."}
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
                    canManage ? (
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
                    ) : t.is_public ? (
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
                    ) : (
                      <span className="py-2 px-2.5 rounded-lg bg-stone-900/80 border border-stone-700/60 text-stone-400 font-bold text-[11px] flex items-center gap-1">
                        <span>🔒</span>
                        <span>По инвайт-ссылке</span>
                      </span>
                    )
                  )}

                  {canManage && (
                    <button
                      onClick={() => openEditModal(t)}
                      className="py-2 px-2.5 rounded-lg bg-[#0e1d3d] hover:bg-blue-900/60 border border-cyan-500/40 text-cyan-300 hover:text-white font-extrabold text-xs transition flex items-center gap-1 shadow-sm"
                      title="Настройки турнира Challonge"
                    >
                      <span>⚙️</span>
                      <span className="hidden sm:inline">Настройки</span>
                    </button>
                  )}
                </div>

                {canManage && (
                  <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-950/40 to-[#12192c] border border-amber-500/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-amber-400 text-xs">🔑</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 truncate">
                          Ссылка регистрации (доступна только вам):
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${typeof window !== "undefined" ? window.location.origin : ""}/tournaments/signup/${t.signup_token || "ti26_70344573f2a1"}`;
                          navigator.clipboard.writeText(url);
                          setCopiedTournId(t.id);
                          setTimeout(() => setCopiedTournId(null), 2000);
                        }}
                        className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-bold transition shrink-0"
                      >
                        {copiedTournId === t.id ? "✓ Скопировано!" : "Копировать"}
                      </button>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/tournaments/signup/${t.signup_token || "ti26_70344573f2a1"}`}
                      className="mt-1.5 w-full bg-black/60 border border-amber-900/60 rounded px-2 py-1 text-[11px] text-amber-200 font-mono select-all truncate"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      {t.is_public
                        ? "Общедоступная регистрация включена, но капитанам также можно отправлять эту прямую ссылку."
                        : "🔒 Только по этой ссылке капитаны могут подать заявку на данный турнир."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTournaments.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-[#091122] border border-blue-900/40 space-y-3">
          <span className="text-4xl">🏆</span>
          <h3 className="text-lg font-bold text-white">Турниры не найдены</h3>
          <p className="text-xs text-slate-400">Попробуйте изменить поисковый запрос.</p>
        </div>
      )}

      {/* CREATE TOURNAMENT MODAL (Admin only) */}
      {isCreateOpen && isAdmin && (
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
                Панель администратора Danislon Tournaments. Сетка генерируется автоматически.
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
                  placeholder="Например: Danislon Masters Season 1"
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
                  placeholder="Регламент, правила, серверы..."
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
                    <option value="double_elimination">Double Elimination</option>
                    <option value="single_elimination">Single Elimination</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="swiss">Swiss</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Лимит команд
                  </label>
                  <select
                    value={createMaxTeams}
                    onChange={(e) => setCreateMaxTeams(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  >
                    <option value={4}>4 команды</option>
                    <option value={8}>8 команд</option>
                    <option value={16}>16 команд</option>
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

      {/* EDIT / CHALLONGE SETTINGS TOURNAMENT MODAL */}
      {editTourn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl bg-[#141416] border border-orange-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl shadow-orange-500/20 max-h-[92vh] overflow-y-auto space-y-6 text-stone-200">
            <button
              onClick={() => setEditTourn(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white transition text-lg"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-stone-800">
              <span className="text-2xl p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                ⚙️
              </span>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wide">
                  Настройки турнира (Регламент Challonge)
                </h2>
                <p className="text-xs text-stone-400 font-mono">
                  ID: <span className="text-orange-400">{editTourn.id}</span>
                </p>
              </div>
            </div>

            {editError && (
              <div className="p-3.5 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-semibold">
                {editError}
              </div>
            )}

            {editSuccess && (
              <div className="p-3.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                ✓ {editSuccess}
              </div>
            )}

            <form onSubmit={handleUpdateTournament} className="space-y-6">
              {/* SECTION: ОСНОВНАЯ ИНФОРМАЦИЯ */}
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-orange-400 block border-b border-stone-800 pb-1">
                  ИНФОРМАЦИЯ О ТУРНИРЕ
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">
                      Название турнира <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#1f1f23] border border-stone-700 text-sm text-white focus:outline-none focus:border-orange-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">
                      Статус турнира
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#1f1f23] border border-stone-700 text-xs text-white focus:outline-none focus:border-orange-400 transition font-bold"
                    >
                      <option value="registration">🟢 Регистрация открыта</option>
                      <option value="ongoing">🔵 Идет турнир (Сетка активна)</option>
                      <option value="completed">⚫ Завершен</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Описание турнира
                  </label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#1f1f23] border border-stone-700 text-xs text-white focus:outline-none focus:border-orange-400 transition"
                  />
                </div>
              </div>

              {/* SECTION: ФОРМАТ И СЕТКА (Challonge exact screenshot) */}
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-orange-400 block border-b border-stone-800 pb-1">
                  ФОРМАТ
                </span>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Формат <span className="text-orange-400">*</span>
                  </label>
                  <select
                    value={editFormat}
                    onChange={(e) => setEditFormat(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#1f1f23] border border-stone-700 text-xs text-white focus:outline-none focus:border-orange-400 transition font-bold"
                  >
                    <option value="double_elimination">Double Elimination</option>
                    <option value="single_elimination">Single Elimination</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="swiss">Swiss</option>
                  </select>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={editSplitLosers}
                      onChange={(e) => setEditSplitLosers(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span>Split Participants - Start with half of the participants in the losers bracket.</span>
                    <span className="text-orange-400 underline cursor-pointer">Подробнее</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={editBreakTies}
                      onChange={(e) => setEditBreakTies(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span>Break ties with placement matches</span>
                  </label>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-stone-300">
                    Гранд Финал
                  </label>
                  <div className="space-y-1.5 pl-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                      <input
                        type="radio"
                        name="grand_final"
                        value="two_matches"
                        checked={editGrandFinal === "two_matches"}
                        onChange={(e) => setEditGrandFinal(e.target.value)}
                        className="text-orange-500 focus:ring-0"
                      />
                      <span>1-2 matches — winners bracket finalist has to be defeated twice by the losers bracket finalist</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                      <input
                        type="radio"
                        name="grand_final"
                        value="one_match"
                        checked={editGrandFinal === "one_match"}
                        onChange={(e) => setEditGrandFinal(e.target.value)}
                        className="text-orange-500 focus:ring-0"
                      />
                      <span>1 match</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                      <input
                        type="radio"
                        name="grand_final"
                        value="none"
                        checked={editGrandFinal === "none"}
                        onChange={(e) => setEditGrandFinal(e.target.value)}
                        className="text-orange-500 focus:ring-0"
                      />
                      <span>None</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION: РЕГИСТРАЦИЯ (Challonge exact screenshot) */}
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-orange-400 block border-b border-stone-800 pb-1">
                  РЕГИСТРАЦИЯ
                </span>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Регистрация
                  </label>
                  <div className="space-y-2 pl-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                      <input
                        type="radio"
                        name="reg_type"
                        value="participant_list"
                        checked={editRegType === "participant_list"}
                        onChange={(e) => setEditRegType(e.target.value)}
                        className="text-orange-500 focus:ring-0"
                      />
                      <span>Предоставить список участников</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                      <input
                        type="radio"
                        name="reg_type"
                        value="public_page"
                        checked={editRegType === "public_page"}
                        onChange={(e) => setEditRegType(e.target.value)}
                        className="text-orange-500 focus:ring-0"
                      />
                      <span>Страница регистрации — <i>This will allow you to ask Custom Questions to your participants</i></span>
                    </label>

                    {editRegType === "public_page" && (
                      <div className="pl-6 space-y-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                          <input
                            type="checkbox"
                            checked={editIsPublic}
                            onChange={(e) => setEditIsPublic(e.target.checked)}
                            className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                          />
                          <span>Сделайте свою страницу регистрации общедоступной</span>
                        </label>

                        <div className="p-3 rounded-xl bg-black/60 border border-orange-500/40 space-y-1.5">
                          <span className="text-[10px] text-orange-400 font-black uppercase tracking-wider block">
                            Уникальная ссылка страницы регистрации:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={`${typeof window !== "undefined" ? window.location.origin : ""}/tournaments/signup/${editTourn?.signup_token || "ti26_70344573f2a1"}`}
                              className="flex-1 bg-stone-900 border border-stone-700 rounded px-2.5 py-1 text-xs text-orange-200 font-mono select-all truncate"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/tournaments/signup/${editTourn?.signup_token || "ti26_70344573f2a1"}`);
                                setEditSuccess("Уникальная ссылка регистрации скопирована в буфер!");
                                setTimeout(() => setEditSuccess(null), 3000);
                              }}
                              className="px-3 py-1 bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/60 text-orange-200 text-xs font-bold rounded transition"
                            >
                              Копировать
                            </button>
                          </div>
                          <span className="text-[10px] text-stone-400 block">
                            {editIsPublic
                              ? "Страница открыта, но можно также делиться этой прямой ссылкой."
                              : "🔒 Закрытый режим: зарегистрироваться на турнир можно ТОЛЬКО перейдя по этой ссылке."}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Вступительный взнос <span className="text-orange-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditEntryFee("free")}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                        editEntryFee === "free"
                          ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
                          : "bg-[#1f1f23] text-stone-400 hover:text-white"
                      }`}
                    >
                      Свободный
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditEntryFee("paid")}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                        editEntryFee === "paid"
                          ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
                          : "bg-[#1f1f23] text-stone-400 hover:text-white"
                      }`}
                    >
                      Оплачено
                    </button>
                  </div>
                </div>

                {/* Участники & Roster requirements */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-stone-300">
                    Участники
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={editTeamsRequired}
                      onChange={(e) => setEditTeamsRequired(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span className="font-bold">Требуется регистрация участников в виде команд</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                      NEW!
                    </span>
                  </label>
                  <span className="text-[11px] text-stone-400 block pl-6">
                    When checked, you and team captains will manage team rosters.
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 mb-1">
                        Minimum Team Size:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={7}
                        value={editMinTeam}
                        onChange={(e) => setEditMinTeam(Number(e.target.value))}
                        className="w-24 px-3 py-1.5 rounded bg-[#1f1f23] border border-stone-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 mb-1">
                        Maximum Team Size:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={5}
                          max={7}
                          value={editMaxTeam}
                          onChange={(e) => setEditMaxTeam(Number(e.target.value))}
                          className="w-24 px-3 py-1.5 rounded bg-[#1f1f23] border border-stone-700 text-xs text-white"
                        />
                        <span className="text-[10px] text-stone-400 italic">— allows for subs, alternates, coaches, etc.</span>
                      </div>
                    </div>
                  </div>

                  <div className="pl-6 pt-1 space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                      <input
                        type="checkbox"
                        checked={editAllowIncomplete}
                        onChange={(e) => setEditAllowIncomplete(e.target.checked)}
                        className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                      />
                      <span>Allow teams with incomplete rosters to participate</span>
                    </label>
                    <span className="text-[10px] text-stone-400 block pl-6">
                      When checked, teams smaller than minimum team size will remain in your tournament when you start it (they're normally disqualified).
                    </span>
                  </div>

                  <div className="pl-6 pt-2 flex items-center gap-3">
                    <span className="text-xs font-bold text-stone-300">Кубок участника (Макс. команд):</span>
                    <input
                      type="number"
                      min={2}
                      max={64}
                      value={editParticipantCap}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditParticipantCap(val);
                        setEditMaxTeams(val);
                      }}
                      className="w-24 px-3 py-1.5 rounded bg-[#1f1f23] border border-stone-700 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Время начала */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Время начала <span className="text-orange-400">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <input
                      type="datetime-local"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-[#1f1f23] border border-stone-700 text-xs text-white focus:outline-none focus:border-orange-400"
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                      <input
                        type="checkbox"
                        checked={editTimeTentative}
                        onChange={(e) => setEditTimeTentative(e.target.checked)}
                        className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                      />
                      <span className="font-bold text-orange-400">Mark as tentative</span>
                    </label>
                  </div>
                  <span className="text-[11px] text-stone-400 block">
                    (GMT+03:00) Europe/Moscow — установите ваш часовой пояс
                  </span>
                </div>
              </div>

              {/* SECTION: ПРОГНОЗЫ И ГОЛОСОВАНИЯ (Challonge exact screenshot) */}
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-orange-400 block border-b border-stone-800 pb-1">
                  ПРОГНОЗЫ И ГОЛОСОВАНИЯ
                </span>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={editOpenVoting}
                      onChange={(e) => setEditOpenVoting(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span>Открыть голосование для всех матчей — Голосующие должны быть зарегистрированы на платформе</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={editPredBracket}
                      onChange={(e) => setEditPredBracket(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span className="font-bold text-orange-400">Разрешить прогнозы для сетки — Только цепочки победителей</span>
                  </label>

                  <div className="pl-6 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                      <input
                        type="checkbox"
                        checked={editPredLower}
                        onChange={(e) => setEditPredLower(e.target.checked)}
                        className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                      />
                      <span className="font-bold text-orange-400">Предсказать нижнюю сетку (1 очко за правильное предсказание)</span>
                    </label>

                    {editPredLower && (
                      <div className="pl-6 space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                          <input
                            type="radio"
                            name="pred_scoring"
                            value="exponential"
                            checked={editPredScoring === "exponential"}
                            onChange={(e) => setEditPredScoring(e.target.value)}
                            className="text-orange-500 focus:ring-0"
                          />
                          <span>Очки увеличиваются экспонентно в каждом раунде (1, 2, 4, 8, ...)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                          <input
                            type="radio"
                            name="pred_scoring"
                            value="linear"
                            checked={editPredScoring === "linear"}
                            onChange={(e) => setEditPredScoring(e.target.value)}
                            className="text-orange-500 focus:ring-0"
                          />
                          <span>Очки увеличиваются линейно в каждом раунде (1, 2, 3, 4, ...)</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={editAllowPredPre}
                      onChange={(e) => setEditAllowPredPre(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span>Разрешить публикацию прогнозов до начала турнира</span>
                  </label>
                </div>
              </div>

              {/* SECTION: EXPERIMENTAL FEATURES 🚀 */}
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-orange-400 block border-b border-stone-800 pb-1">
                  EXPERIMENTAL FEATURES 🚀
                </span>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-stone-300">
                    <input
                      type="checkbox"
                      checked={editExpImages}
                      onChange={(e) => setEditExpImages(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span>Generate shareable images for match results? (Only works for SE, DE, RR and Swiss)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-stone-300">
                    <input
                      type="checkbox"
                      checked={editExpEmails}
                      onChange={(e) => setEditExpEmails(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span>Require participants to have verified emails before joining the competition</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-stone-300">
                    <input
                      type="checkbox"
                      checked={editExpCountries}
                      onChange={(e) => setEditExpCountries(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span>Allow specific countries for your registration?</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-stone-300">
                    <input
                      type="checkbox"
                      checked={editExpFields}
                      onChange={(e) => setEditExpFields(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span>Allow custom fields in Predictions? (Only works if you have predictions activated)</span>
                  </label>
                </div>
              </div>

              {/* SECTION: ФЭНТЕЗИ И ЖЕТОНЫ РЕРОЛЛА */}
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-orange-400 block border-b border-stone-800 pb-1">
                  ФЭНТЕЗИ И ЖЕТОНЫ ПЕРЕКОВКИ ТУРНИРА
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">
                      Жетоны реролла для участников турнира
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editInitialRerolls}
                      onChange={(e) => setEditInitialRerolls(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#1f1f23] border border-stone-700 text-xs text-white focus:outline-none focus:border-orange-400"
                    />
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      Каждый участник получает это количество жетонов перековки именно для этого турнира.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">
                      Призовой фонд
                    </label>
                    <input
                      type="text"
                      value={editPrizePool}
                      onChange={(e) => setEditPrizePool(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#1f1f23] border border-stone-700 text-xs text-white focus:outline-none focus:border-orange-400"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#1a1a1e] border border-stone-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={editFantasyLocked}
                      onChange={(e) => setEditFantasyLocked(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span>🔒 Заблокировать изменения карточек в Фэнтези</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={editPredictionsLocked}
                      onChange={(e) => setEditPredictionsLocked(e.target.checked)}
                      className="rounded bg-[#1f1f23] border-stone-700 text-orange-500 focus:ring-0"
                    />
                    <span>🔒 Заблокировать прием прогнозов на матчи</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-stone-800 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 transition disabled:opacity-50"
                >
                  {editLoading ? "Сохранение..." : "💾 Сохранить все параметры турнира"}
                </button>

                {editTourn.id !== "ti-2026-main" && (
                  <button
                    type="button"
                    onClick={handleDeleteTournament}
                    disabled={isDeleting}
                    className="py-3 px-4 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 hover:text-white font-bold text-xs uppercase tracking-wider transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {isDeleting ? "Удаление..." : "🗑️ Удалить турнир"}
                  </button>
                )}
              </div>
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

            <form onSubmit={handleRegisterTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Выберите вашу команду
                </label>
                {myTeams.length > 0 ? (
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  >
                    {myTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        [{team.tag}] {team.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-900 text-xs text-slate-400">
                    У вас пока нет созданных команд, где вы капитан. Создайте команду в разделе «Команды».
                  </div>
                )}
              </div>

              {!registerTourn.is_public && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Пароль турнира
                  </label>
                  <input
                    type="text"
                    required
                    value={regAccessCode}
                    onChange={(e) => setRegAccessCode(e.target.value)}
                    placeholder="Введите код доступа"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0d182e] border border-blue-900/60 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={regLoading || myTeams.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
              >
                {regLoading ? "Регистрация..." : "Зарегистрировать команду"}
              </button>
            </form>
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
