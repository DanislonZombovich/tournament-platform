"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TeamDetail {
  team: {
    id: string;
    name: string;
    tag: string;
    logo_url: string | null;
    banner_url: string | null;
    invite_code: string;
  };
  roster: Array<{
    role_slot: string;
    is_occupied: boolean;
    player: {
      user_id: string;
      username: string;
      steam_id: string | null;
      steam_name: string | null;
      steam_avatar: string | null;
      is_steam_linked: boolean;
    } | null;
  }>;
  is_eligible_for_tournament: boolean;
}

export default function JoinTeamPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const inviteCode = resolvedParams.inviteCode;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TeamDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [joiningSlot, setJoiningSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const roleMeta: Record<string, { label: string; desc: string }> = {
    pos1: { label: "Позиция 1 — Керри", desc: "Основной фармер и керри команды" },
    pos2: { label: "Позиция 2 — Мидлейнер", desc: "Центральная линия и темп игры" },
    pos3: { label: "Позиция 3 — Оффлейнер", desc: "Сложная линия, инициатор и танк" },
    pos4: { label: "Позиция 4 — Частичная поддержка", desc: "Роумер, стаки, помощь линиям" },
    pos5: { label: "Позиция 5 — Полная поддержка", desc: "Вардинг, контроль карты, спасение" },
    sub1: { label: "Запасной 1", desc: "Резерв команды" },
    sub2: { label: "Запасной 2", desc: "Резерв команды" },
  };

  const loadTeam = async () => {
    try {
      const [teamRes, meRes] = await Promise.all([
        fetch(`/api/teams/${inviteCode}`),
        fetch("/api/auth/me"),
      ]);

      const teamJson = await teamRes.json();
      const meJson = await meRes.json();

      if (!teamRes.ok) throw new Error(teamJson.error || "Команда не найдена");

      setData(teamJson);
      setCurrentUser(meJson.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [inviteCode]);

  const handleJoinSlot = async (roleSlot: string) => {
    if (!currentUser) {
      setError("Для вступления в команду необходимо сначала авторизоваться на сайте");
      return;
    }

    if (!currentUser.steam_id) {
      setError("Для занятия роли в составе команды необходимо сначала привязать Steam аккаунт в профиле!");
      return;
    }

    setJoiningSlot(roleSlot);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_code: inviteCode,
          role_slot: roleSlot,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Ошибка вступления в слот");

      setSuccess(`Поздравляем! Вы успешно заняли слот ${roleMeta[roleSlot]?.label}`);
      await loadTeam();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoiningSlot(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin"></div>
        <p className="text-amber-300 font-bold tracking-wider text-sm">ПОИСК РОСТЕРА КОМАНДЫ...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-2xl bg-[#0e121b] border border-red-500/40 text-center space-y-4">
        <span className="text-4xl">❌</span>
        <h2 className="text-xl font-black text-white">Команда не найдена</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={() => router.push("/teams")}
          className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
        >
          Вернуться к списку команд
        </button>
      </div>
    );
  }

  const team = data?.team;
  const roster = data?.roster || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#17130b] via-[#241a0d] to-[#121622] border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {team?.logo_url ? (
            <img
              src={team.logo_url}
              alt={team.tag}
              className="w-20 h-20 rounded-2xl object-contain bg-black/60 p-2 border-2 border-amber-400 shadow-xl"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl font-black text-amber-400 border border-slate-700">
              {team?.tag}
            </div>
          )}

          <div className="flex flex-col text-center sm:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest self-center sm:self-start mb-2">
              <span>🛡️</span>
              <span>Приглашение в ростер</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{team?.name}</h1>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-black uppercase">
                [{team?.tag}]
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Выберите подходящую вам роль из свободных слотов ниже, чтобы встать в основу команды на турнир.
            </p>
          </div>
        </div>

        {currentUser && !currentUser.steam_id && (
          <div className="mt-5 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <span>⚠️</span>
              <span>У вашего аккаунта не привязан Steam. Привяжите Steam для допуска команды к турниру!</span>
            </div>
            <a
              href="/profile"
              className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-amber-300 shrink-0"
            >
              Привязать Steam
            </a>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-bold">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            {success}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span>⚔️</span>
          <span>Слоты ростера команды (Выберите свою роль):</span>
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {roster.map((slot) => {
            const meta = roleMeta[slot.role_slot] || { label: slot.role_slot, desc: "" };
            const isMe = currentUser && slot.player?.user_id === currentUser.id;

            return (
              <div
                key={slot.role_slot}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition gap-4 ${
                  slot.is_occupied
                    ? isMe
                      ? "bg-amber-500/10 border-amber-400"
                      : "bg-[#0d121c]/90 border-slate-800"
                    : "bg-[#111726]/80 border-amber-500/30 hover:border-amber-400"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                      slot.is_occupied
                        ? "bg-slate-800 text-slate-300"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    }`}
                  >
                    {slot.role_slot.toUpperCase()}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-extrabold text-white">{meta.label}</span>
                    <span className="text-xs text-slate-400">{meta.desc}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  {slot.is_occupied && slot.player ? (
                    <div className="flex items-center gap-3">
                      {slot.player.steam_avatar && (
                        <img
                          src={slot.player.steam_avatar}
                          alt={slot.player.username}
                          className="w-8 h-8 rounded-lg object-cover border border-amber-500/40"
                        />
                      )}
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-white">
                          {slot.player.username} {isMe && "(Вы)"}
                        </span>
                        {slot.player.is_steam_linked ? (
                          <span className="text-[10px] text-emerald-400 font-bold">
                            Steam: {slot.player.steam_name} ✓
                          </span>
                        ) : (
                          <span className="text-[10px] text-red-400 font-bold">
                            Steam не привязан ✗
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={joiningSlot === slot.role_slot}
                      onClick={() => handleJoinSlot(slot.role_slot)}
                      className="w-full sm:w-auto px-5 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition disabled:opacity-50"
                    >
                      {joiningSlot === slot.role_slot ? "Вступление..." : `Занять слот: ${meta.label}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
