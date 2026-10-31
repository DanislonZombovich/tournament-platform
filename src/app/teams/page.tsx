"use client";

import { useEffect, useState } from "react";

interface TeamMember {
  team_id: string;
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
  captain_id: string;
  captain_name: string;
  invite_code: string;
  member_count: string;
  members: TeamMember[];
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [captainRole, setCaptainRole] = useState("pos1");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [teamsRes, userRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/auth/me"),
      ]);
      const teamsData = await teamsRes.json();
      const userData = await userRes.json();
      setTeams(teamsData.teams || []);
      setCurrentUser(userData.user);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tag,
          logo_url: logoUrl,
          captain_role_slot: captainRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка создания команды");

      setIsCreateOpen(false);
      setName("");
      setTag("");
      setLogoUrl("");
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
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin"></div>
        <p className="text-amber-300 font-bold tracking-wider text-sm">ЗАГРУЗКА КОМАНД...</p>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    pos1: "Позиция 1 (Керри)",
    pos2: "Позиция 2 (Мид)",
    pos3: "Позиция 3 (Оффлейн)",
    pos4: "Позиция 4 (Soft Support)",
    pos5: "Позиция 5 (Hard Support)",
    sub1: "Запасной 1",
    sub2: "Запасной 2",
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#17130b] via-[#241a0d] to-[#121622] border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest mb-3">
              <span>⚔️</span>
              <span>Команды The International 2026</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              РОСТЕРЫ И КВАЛИФИКАЦИЯ
            </h1>
            <p className="text-xs text-slate-300 mt-2 max-w-xl">
              Создайте команду или вступите по ссылке капитана на свободный слот роли (Керри, Мид, Оффлейн, Саппорты). Для допуска к турниру у всех 5 игроков основы должен быть привязан Steam.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition shrink-0"
          >
            + Создать команду
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team) => {
          const membersBySlot = new Map(team.members.map((m) => [m.role_slot, m]));
          const required = ["pos1", "pos2", "pos3", "pos4", "pos5"];
          const filledCount = required.filter((r) => membersBySlot.has(r)).length;
          const steamCount = required.filter((r) => membersBySlot.get(r)?.steam_id).length;
          const isEligible = filledCount === 5 && steamCount === 5;
          const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/teams/join/${team.invite_code}`;

          return (
            <div
              key={team.id}
              className="rounded-2xl border border-slate-800 bg-[#0e121b]/95 p-6 shadow-xl flex flex-col justify-between gap-5 relative hover:border-amber-500/40 transition"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3.5">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.tag}
                      className="w-12 h-12 rounded-xl object-contain bg-black/40 p-1 border border-amber-500/30"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-black text-amber-400 border border-slate-700">
                      {team.tag}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white">{team.name}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                        {team.tag}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">Капитан: {team.captain_name || "Не назначен"}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                      isEligible
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {isEligible ? "Допущена к турниру" : `Состав: ${filledCount}/5`}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Steam: {steamCount}/5
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Позиции ростера:
                </span>

                <div className="grid grid-cols-1 gap-1.5">
                  {required.map((roleKey) => {
                    const member = membersBySlot.get(roleKey);

                    return (
                      <div
                        key={roleKey}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                          member
                            ? "bg-slate-900/60 border-slate-800"
                            : "bg-black/20 border-dashed border-slate-800/80"
                        }`}
                      >
                        <span className="text-slate-400 font-medium text-[11px]">
                          {roleLabels[roleKey]}
                        </span>

                        {member ? (
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white">{member.username}</span>
                            {member.steam_id ? (
                              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                Steam ✓
                              </span>
                            ) : (
                              <span className="text-[10px] text-red-400 font-bold bg-red-950/50 px-1.5 py-0.2 rounded border border-red-500/30">
                                Нет Steam ✗
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400/80 italic">
                            Свободный слот
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Ссылка-приглашение в состав</span>
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="mt-0.5 bg-black/40 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 font-mono select-all truncate"
                  />
                </div>

                <a
                  href={`/teams/join/${team.invite_code}`}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider transition shrink-0 self-end"
                >
                  Вступить →
                </a>
              </div>
            </div>
          );
        })}

        {teams.length === 0 && (
          <div className="col-span-2 p-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
            Команды еще не созданы. Создайте первую команду или нажмите в админ-панели &quot;Заполнить демо-данные TI 2026&quot;.
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#0e121b] border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <span className="text-xs font-black text-amber-400 tracking-widest uppercase">Новая команда</span>
              <h3 className="text-xl font-black text-white mt-1">Создание команды</h3>
              <p className="text-xs text-slate-400 mt-1">Вы станете капитаном и займете выбранную роль</p>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                {error}
              </div>
            )}

            {currentUser && !currentUser.steam_id && (
              <div className="mb-4 p-3 rounded-xl bg-amber-950/70 border border-amber-500/50 flex flex-col gap-2 text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Требуется привязка Steam!</span>
                </span>
                <p className="text-slate-300 text-[11px]">
                  Капитан команды и все 5 игроков основы обязаны иметь привязанный Steam для участия в турнире.
                </p>
                <a
                  href="/profile"
                  className="mt-1 py-1.5 px-3 rounded bg-amber-400 text-black font-extrabold text-[11px] text-center uppercase tracking-wider hover:bg-amber-300 transition"
                >
                  Привязать Steam в профиле →
                </a>
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Название команды <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Team Liquid, Virtus.pro"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Тег команды (2-6 символов) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={tag}
                  onChange={(e) => setTag(e.target.value.toUpperCase())}
                  placeholder="TL, VP, TS"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white uppercase placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  URL логотипа команды
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Ваша роль в команде <span className="text-amber-400">*</span>
                </label>
                <select
                  value={captainRole}
                  onChange={(e) => setCaptainRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="pos1">Позиция 1 — Керри (Carry)</option>
                  <option value="pos2">Позиция 2 — Мидлейнер (Mid)</option>
                  <option value="pos3">Позиция 3 — Оффлейнер (Offlane)</option>
                  <option value="pos4">Позиция 4 — Частичная поддержка (Soft Support)</option>
                  <option value="pos5">Позиция 5 — Полная поддержка (Hard Support)</option>
                  <option value="sub1">Запасной 1</option>
                  <option value="sub2">Запасной 2</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 mt-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
              >
                {submitting ? "Создание..." : "Создать команду и получить инвайт-код"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
