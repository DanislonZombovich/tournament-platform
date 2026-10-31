"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";

interface TournamentDetail {
  id: string;
  title: string;
  description: string | null;
  format: string;
  max_teams: number;
  prize_pool: string | null;
  banner_url: string | null;
  status: string;
  is_public: boolean;
  signup_token: string;
}

export default function TournamentSignupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [registeredTeams, setRegisteredTeams] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamDetail, setSelectedTeamDetail] = useState<any>(null);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tournRes, meRes, teamsRes] = await Promise.all([
        fetch(`/api/tournaments?signup_token=${encodeURIComponent(token)}`),
        fetch("/api/auth/me"),
        fetch("/api/teams"),
      ]);

      const tournJson = await tournRes.json();
      const meJson = await meRes.json();
      const teamsJson = await teamsRes.json();

      if (!tournRes.ok) {
        throw new Error(tournJson.error || "Недействительная ссылка регистрации");
      }

      setTournament(tournJson.tournament);
      setRegisteredTeams(tournJson.registered_teams || []);
      setUser(meJson.user || null);

      if (meJson.user && teamsJson.teams) {
        const captainTeams = teamsJson.teams.filter(
          (t: any) => t.captain_id === meJson.user.id
        );
        setMyTeams(captainTeams);
        if (captainTeams.length > 0) {
          setSelectedTeamId(captainTeams[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Load selected team details to check readiness
  useEffect(() => {
    if (!selectedTeamId) {
      setSelectedTeamDetail(null);
      return;
    }
    let isCancelled = false;
    fetch(`/api/teams/${selectedTeamId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.roster) {
          setSelectedTeamDetail(data);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [selectedTeamId]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament || !selectedTeamId) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: tournament.id,
          team_id: selectedTeamId,
          signup_token: token,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации команды");

      setSuccess(data.message || "Ваша команда успешно зарегистрирована на турнир!");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-400 animate-spin"></div>
        <p className="text-orange-300 font-bold tracking-wider text-sm">ПРОВЕРКА ССЫЛКИ РЕГИСТРАЦИИ...</p>
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-2xl bg-[#0e121b] border border-red-500/40 text-center space-y-4 shadow-2xl">
        <span className="text-4xl">🔒</span>
        <h2 className="text-xl font-black text-white">Ссылка регистрации недействительна</h2>
        <p className="text-xs text-red-300 leading-relaxed">
          {error}
        </p>
        <p className="text-[11px] text-slate-400">
          Регистрация на турниры платформы закрыта и доступна исключительно по действующей уникальной ссылке от организатора турнира.
        </p>
        <div className="pt-2">
          <a
            href="/tournaments"
            className="inline-block px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
          >
            К списку турниров
          </a>
        </div>
      </div>
    );
  }

  const isAlreadyRegistered = registeredTeams.some((t: any) => t.team_id === selectedTeamId);
  const primarySlotsFilled = selectedTeamDetail?.primarySlotsFilled;
  const allSteamLinked = selectedTeamDetail?.allSteamLinked;
  const canRegister = selectedTeamDetail && primarySlotsFilled && allSteamLinked && !isAlreadyRegistered;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-6 pb-16">
      {/* HEADER BANNER */}
      <div className="relative rounded-3xl overflow-hidden border border-orange-500/40 bg-[#0d1527] shadow-2xl shadow-orange-500/10">
        <div className="h-44 sm:h-56 w-full relative">
          <img
            src={tournament?.banner_url || "/banner.jpg"}
            alt={tournament?.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#091122] via-[#091122]/70 to-transparent" />
          
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-orange-950/80 border border-orange-500/60 text-orange-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-md">
              <span>🔒</span> Закрытая ссылка регистрации
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/50 text-cyan-300 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md">
              Слоты: {registeredTeams.length}/{tournament?.max_teams || 8}
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 -mt-8 relative z-10 space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {tournament?.title}
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {tournament?.description || "Официальный турнир платформы Danislon Tournaments."}
          </p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-blue-900/60 text-slate-300">
              <span className="text-slate-500 uppercase font-bold text-[10px] block">Формат</span>
              <span className="font-bold text-cyan-300">{tournament?.format === "double_elimination" ? "Double Elimination" : "Single Elimination"}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-blue-900/60 text-slate-300">
              <span className="text-slate-500 uppercase font-bold text-[10px] block">Призовой фонд</span>
              <span className="font-bold text-amber-300">{tournament?.prize_pool || "$25,000"}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-blue-900/60 text-slate-300">
              <span className="text-slate-500 uppercase font-bold text-[10px] block">Статус</span>
              <span className="font-bold text-emerald-400">
                {tournament?.status === "registration" ? "Регистрация открыта" : tournament?.status === "ongoing" ? "Турнир идет" : "Завершен"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK MESSAGES */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-semibold flex items-center gap-2">
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-5 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs font-bold space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <span>✓</span>
            <span>{success}</span>
          </div>
          <div className="pt-1 flex gap-3">
            <a
              href={`/?tournament_id=${tournament?.id}`}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition"
            >
              Сетка турнира →
            </a>
            <a
              href="/tournaments"
              className="px-4 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition"
            >
              Все турниры
            </a>
          </div>
        </div>
      )}

      {/* REGISTRATION FORM CARD */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#091122] border border-blue-500/30 shadow-2xl space-y-6">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>📋</span> Подача заявки команды
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Вы перешли по пригласительной ссылке организатора турнира. Чтобы зарегистрировать свою команду, выберите её из списка ваших команд (вы должны являться капитаном).
          </p>
        </div>

        {!user ? (
          <div className="p-6 rounded-xl bg-blue-950/30 border border-blue-500/30 text-center space-y-4">
            <p className="text-xs text-slate-300">
              Для подачи заявки необходимо войти в свой аккаунт или зарегистрироваться.
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition"
            >
              Войти / Регистрация
            </button>
          </div>
        ) : myTeams.length === 0 ? (
          <div className="p-6 rounded-xl bg-blue-950/30 border border-blue-500/30 text-center space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              У вас пока нет созданных команд, в которых вы являетесь капитаном. Создайте команду в разделе «Команды», пригласите 5 игроков со Steam и возвращайтесь по этой ссылке.
            </p>
            <a
              href="/teams"
              className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition"
            >
              Создать команду →
            </a>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Выберите команду для участия:
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0d182e] border border-blue-900/70 text-xs text-white focus:outline-none focus:border-cyan-400 transition font-bold"
              >
                {myTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    [{team.tag}] {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* TEAM REQUIREMENTS CHECK */}
            {selectedTeamDetail && (
              <div className="p-4 rounded-xl bg-black/40 border border-blue-900/60 space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                  Проверка готовности состава:
                </span>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">5 основных позиций (pos1 - pos5) заняты:</span>
                    {primarySlotsFilled ? (
                      <span className="text-emerald-400 font-bold">✓ Заполнены</span>
                    ) : (
                      <span className="text-red-400 font-bold">✗ Не все слоты заняты</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Привязка Steam у всех 5 игроков:</span>
                    {allSteamLinked ? (
                      <span className="text-emerald-400 font-bold">✓ Привязан</span>
                    ) : (
                      <span className="text-red-400 font-bold">✗ У некоторых игроков нет Steam</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Статус регистрации на турнир:</span>
                    {isAlreadyRegistered ? (
                      <span className="text-amber-400 font-bold">Уже зарегистрирована</span>
                    ) : (
                      <span className="text-cyan-400 font-bold">Готова к регистрации</span>
                    )}
                  </div>
                </div>

                {!primarySlotsFilled || !allSteamLinked ? (
                  <div className="pt-2 border-t border-blue-950 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Для турнира требуются все 5 основных позиций с привязанным Steam.
                    </span>
                    <a
                      href="/teams"
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline"
                    >
                      Настроить состав →
                    </a>
                  </div>
                ) : null}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !canRegister || tournament?.status !== "registration"}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? "Регистрация..."
                : isAlreadyRegistered
                ? "Команда уже зарегистрирована"
                : "Зарегистрировать команду на турнир"}
            </button>
          </form>
        )}
      </div>

      {/* REGISTERED TEAMS PREVIEW */}
      <div className="p-6 rounded-2xl bg-[#070e1c] border border-blue-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-cyan-400 tracking-wider">
            Участники турнира ({registeredTeams.length}/{tournament?.max_teams || 8}):
          </span>
          <span className="text-[11px] text-slate-500">
            Осталось свободных слотов: {Math.max(0, (tournament?.max_teams || 8) - registeredTeams.length)}
          </span>
        </div>

        {registeredTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {registeredTeams.map((t, idx) => (
              <div
                key={t.team_id || idx}
                className="p-3 rounded-xl bg-[#0d172e] border border-blue-900/60 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-black/40 border border-blue-900 flex items-center justify-center font-mono text-xs text-cyan-300 font-bold">
                  #{idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white truncate block">
                    [{t.tag}] {t.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-black/20 text-center text-xs text-slate-500">
            Команды пока не зарегистрированы. Будьте первыми!
          </div>
        )}
      </div>

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
