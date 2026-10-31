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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Размер файла не должен превышать 2 МБ");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  };

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
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-cyan-400 animate-spin"></div>
        <p className="text-cyan-300 font-bold tracking-wider text-sm">ЗАГРУЗКА КОМАНД...</p>
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
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#091325] via-[#0d1c3a] to-[#070e1c] border border-blue-500/40 shadow-2xl shadow-blue-500/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-3">
              <span>⚔️</span>
              <span>Команды и составы Dota 2</span>
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
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition shrink-0"
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
              className="rounded-2xl border border-blue-900/50 bg-[#091122]/95 p-6 shadow-xl flex flex-col justify-between gap-5 relative hover:border-blue-500/50 transition"
            >
              <div className="flex items-center justify-between border-b border-blue-900/50 pb-4">
                <div className="flex items-center gap-3.5">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.tag}
                      className="w-12 h-12 rounded-xl object-contain bg-black/40 p-1 border border-blue-500/30"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-900/60 flex items-center justify-center font-black text-cyan-300 border border-blue-700">
                      {team.tag}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white">{team.name}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 text-[10px] font-black uppercase">
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
                        : "bg-blue-950/80 text-cyan-300 border border-blue-500/40"
                    }`}
                  >
                    {isEligible ? "Допущена к турниру" : `Состав: ${filledCount}/5`}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
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
                            ? "bg-[#0d182e] border-blue-900/60"
                            : "bg-black/20 border-dashed border-blue-900/40"
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
                              <span className="text-[10px] text-rose-400 font-bold bg-rose-950/50 px-1.5 py-0.2 rounded border border-rose-500/30">
                                Нет Steam ✗
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-cyan-400/80 italic">
                            Свободный слот
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-blue-900/60 flex items-center justify-between gap-2">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Ссылка-приглашение в состав</span>
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="mt-0.5 bg-black/40 border border-blue-900/50 rounded px-2 py-1 text-[11px] text-slate-300 font-mono select-all truncate"
                  />
                </div>

                <a
                  href={`/teams/join/${team.invite_code}`}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-cyan-300 text-xs font-black uppercase tracking-wider transition shrink-0 self-end"
                >
                  Вступить →
                </a>
              </div>
            </div>
          );
        })}

        {teams.length === 0 && (
          <div className="col-span-2 p-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-blue-900/40">
            Команды еще не созданы. Создайте первую команду для участия в турнирах.
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#091122] border border-blue-500/40 rounded-2xl p-6 shadow-2xl shadow-blue-500/20">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-lg"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <span className="text-xs font-black text-cyan-400 tracking-widest uppercase">Новая команда</span>
              <h3 className="text-xl font-black text-white mt-1">Создание команды</h3>
              <p className="text-xs text-slate-400 mt-1">Вы станете капитаном и займете выбранную роль</p>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                {error}
              </div>
            )}

            {currentUser && !currentUser.steam_id && (
              <div className="mb-4 p-3 rounded-xl bg-blue-950/70 border border-blue-500/40 flex flex-col gap-2 text-xs">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Требуется привязка Steam!</span>
                </span>
                <p className="text-slate-300 text-[11px]">
                  Капитан команды и все 5 игроков основы обязаны иметь привязанный Steam для участия в турнире.
                </p>
                <a
                  href="/profile"
                  className="mt-1 py-1.5 px-3 rounded bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-extrabold text-[11px] text-center uppercase tracking-wider hover:from-blue-500 hover:to-cyan-400 transition"
                >
                  Привязать Steam в профиле →
                </a>
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Название команды <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Team Liquid, Virtus.pro, Team Spirit"
                  className="w-full px-3 py-2 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Тег команды (2-6 символов) <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={tag}
                  onChange={(e) => setTag(e.target.value.toUpperCase())}
                  placeholder="TL, VP, TS"
                  className="w-full px-3 py-2 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white uppercase placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Логотип команды
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    {logoUrl && (
                      <div className="w-10 h-10 rounded-lg border border-cyan-400/40 overflow-hidden bg-black/40 flex-shrink-0 flex items-center justify-center">
                        <img src={logoUrl} alt="Превью логотипа" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-cyan-500/40 text-xs font-semibold text-cyan-300 transition-all">
                      <span>📁 Загрузить с ПК</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={logoUrl.startsWith("data:") ? "Локальное изображение выбрано с ПК" : logoUrl}
                    onChange={(e) => {
                      if (!logoUrl.startsWith("data:")) {
                        setLogoUrl(e.target.value);
                      }
                    }}
                    placeholder="Или вставьте прямую ссылку (https://...)"
                    className="w-full px-3 py-2 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    Можно выбрать файл напрямую с компьютера (PNG, JPG, WebP) или указать ссылку на картинку в сети.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Ваша роль в команде <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={captainRole}
                  onChange={(e) => setCaptainRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white focus:outline-none focus:border-cyan-400"
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
                className="w-full py-2.5 px-4 mt-2 rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
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
