import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Check, X } from 'lucide-react';

export default function StatsExport({
  sessions,
  program,
  tiers,
  seasons,
  filterSeason,
  instructorFilter,
  period,
  onClose,
}) {
  const today = new Date();
  const activeSeason = seasons.find(s => s.is_active);

  // Détermine la saison filtrée pour l'affichage
  const seasonLabel = (() => {
    if (filterSeason === 'all') return 'Toutes les saisons';
    if (filterSeason === 'active') return activeSeason?.name || 'Saison active';
    return seasons.find(s => s.id === filterSeason)?.name || 'Saison';
  })();

  const seasonIdToFilter =
    filterSeason === 'all' ? null
    : filterSeason === 'active' ? activeSeason?.id
    : filterSeason;

  // Filtrage des séances
  const filtered = useMemo(() => {
    const now = new Date();
    return sessions.filter(s => {
      if (seasonIdToFilter && s.season_id !== seasonIdToFilter) return false;
      if (instructorFilter !== 'all' && s.instructor_id !== instructorFilter) return false;
      const d = new Date(s.date);
      const diffDays = (now - d) / (1000 * 60 * 60 * 24);
      if (period === 'week' && diffDays > 7) return false;
      if (period === 'month' && diffDays > 30) return false;
      if (period === 'quarter' && diffDays > 90) return false;
      if (period === 'year' && diffDays > 365) return false;
      return true;
    });
  }, [sessions, period, instructorFilter, seasonIdToFilter]);

  const totalSessions = filtered.length;
  const totalReps = filtered.reduce((sum, s) => sum + (s.session_skills?.length || 0), 0);

  const skillRepetitions = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      s.session_skills?.forEach(ss => {
        if (ss.skill?.id) map[ss.skill.id] = (map[ss.skill.id] || 0) + 1;
      });
    });
    return map;
  }, [filtered]);

  const workedSkills = useMemo(() => new Set(Object.keys(skillRepetitions)), [skillRepetitions]);

  const visibleProgram = useMemo(() => {
    return (program || []).filter(l => l.is_visible !== false);
  }, [program]);

  const totalSkills = visibleProgram.reduce((sum, lvl) =>
    sum + lvl.categories.reduce((s, c) => s + c.skills.length, 0), 0);

  const levelProgress = visibleProgram.map(level => {
    const allSkillIds = level.categories.flatMap(cat => cat.skills.map(sk => sk.id));
    const worked = allSkillIds.filter(id => workedSkills.has(id)).length;
    return {
      level,
      total: allSkillIds.length,
      worked,
      pct: allSkillIds.length ? Math.round(worked / allSkillIds.length * 100) : 0,
    };
  });

  // Données mensuelles (12 derniers mois pour avoir une vue complète sur saison)
  const monthsData = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), sessions: 0 };
    }
    sessions.forEach(s => {
      if (seasonIdToFilter && s.season_id !== seasonIdToFilter) return;
      if (instructorFilter !== 'all' && s.instructor_id !== instructorFilter) return;
      const key = s.date.slice(0, 7);
      if (months[key]) months[key].sessions++;
    });
    return Object.values(months);
  }, [sessions, instructorFilter, seasonIdToFilter]);

  const radarData = useMemo(() => {
    const categoryMap = {};
    visibleProgram.forEach(level => {
      level.categories.forEach(cat => {
        const key = cat.name;
        if (!categoryMap[key]) categoryMap[key] = { total: 0, worked: 0, emoji: cat.emoji };
        categoryMap[key].total += cat.skills.length;
        cat.skills.forEach(sk => {
          if (workedSkills.has(sk.id)) categoryMap[key].worked++;
        });
      });
    });
    return Object.entries(categoryMap).map(([name, v]) => ({
      category: name,
      coverage: v.total ? Math.round(v.worked / v.total * 100) : 0,
    }));
  }, [visibleProgram, workedSkills]);

  // Heatmap (52 semaines)
  const heatmap = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const dayCounts = {};
    sessions.forEach(s => {
      if (seasonIdToFilter && s.season_id !== seasonIdToFilter) return;
      if (instructorFilter !== 'all' && s.instructor_id !== instructorFilter) return;
      dayCounts[s.date] = (dayCounts[s.date] || 0) + 1;
    });

    const startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() - 365);
    while (startDate.getDay() !== 1) startDate.setDate(startDate.getDate() - 1);

    const weeks = [];
    for (let w = 0; w < 53; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(startDate);
        day.setDate(day.getDate() + w * 7 + d);
        const key = day.toISOString().split('T')[0];
        week.push({ date: key, count: dayCounts[key] || 0, isFuture: day > todayDate });
      }
      weeks.push(week);
    }
    return weeks;
  }, [sessions, instructorFilter, seasonIdToFilter]);

  const heatColor = (n) => {
    if (n === 0) return '#f5f5f4';
    if (n === 1) return '#a8a29e';
    if (n === 2) return '#57534e';
    return '#000';
  };

  const getTierColor = (tierId) => tiers.find(t => t.id === tierId)?.color || '#000';
  const getTierEmoji = (tierId) => tiers.find(t => t.id === tierId)?.emoji || '⚪';

  // Liste détaillée pour la fin du document
  const detailedList = visibleProgram.map(level => {
    const items = [];
    level.categories.forEach(cat => {
      cat.skills.forEach(sk => {
        items.push({
          cat,
          skill: sk,
          isWorked: workedSkills.has(sk.id),
          reps: skillRepetitions[sk.id] || 0,
        });
      });
    });
    return { level, items };
  });

  // Période lisible
  const periodLabel = {
    week: '7 derniers jours',
    month: '30 derniers jours',
    quarter: '90 derniers jours',
    year: '365 derniers jours',
    all: 'Toutes périodes',
  }[period];

  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="bg-white">
      {/* Barre d'actions (visible uniquement à l'écran, pas à l'impression) */}
      <div className="no-print sticky top-0 z-50 bg-stone-100 border-b border-black/10 px-4 py-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-bold">📄 Aperçu d'export PDF</span>
          <span className="text-black/50 ml-2 text-xs">— Vérifie le contenu avant d'imprimer</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs uppercase tracking-wider border border-black/20 rounded hover:bg-stone-200"
          >
            ← Retour
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 text-xs uppercase tracking-wider bg-black text-white rounded hover:bg-stone-800 font-bold"
          >
            🖨️ Imprimer / PDF
          </button>
        </div>
      </div>

      {/* Contenu imprimable */}
      <div className="print-page max-w-[210mm] mx-auto p-8 text-black">
        {/* En-tête */}
        <div className="border-b-2 border-black pb-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <img src="/logo-eke-noir.png" alt="EKE" className="h-20 w-auto object-contain" />
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.05em' }}>
                ELORN KALI ESKRIMA
              </h1>
              <div className="text-xs uppercase tracking-[0.3em] text-black/50 mt-1">Course Management</div>
            </div>
          </div>
          <div className="mt-6">
            <div className="text-xs uppercase tracking-[0.2em] text-black/50">Rapport statistique</div>
            <h2 className="text-4xl font-black tracking-tight mt-1" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.03em' }}>
              {seasonLabel}
            </h2>
            <div className="text-xs text-black/60 mt-2 flex flex-wrap gap-3">
              <span>📅 Généré le {dateStr}</span>
              <span>·</span>
              <span>⏱️ Période : {periodLabel}</span>
              {instructorFilter !== 'all' && <><span>·</span><span>👤 Filtré par instructeur</span></>}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <section className="mb-8 page-break-after">
          <h3 className="text-lg font-black uppercase tracking-wider mb-3 pb-1 border-b border-black/10">📊 Synthèse</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KpiCard emoji="📝" value={totalSessions} label="Séances" />
            <KpiCard emoji="🔁" value={totalReps} label="Répétitions" />
            <KpiCard emoji="✅" value={`${workedSkills.size}/${totalSkills}`} label="Couvertes" />
          </div>

          {/* Progression par niveau */}
          <h4 className="text-sm font-bold uppercase tracking-wider mb-3">📈 Progression par niveau</h4>
          <div className="space-y-2">
            {levelProgress.map(({ level, total, worked, pct }) => {
              const tierColor = getTierColor(level.tier_id);
              return (
                <div key={level.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-white text-[9px] font-black" style={{ background: tierColor }}>{level.id}</span>
                      <span>{getTierEmoji(level.tier_id)} {level.name}</span>
                    </span>
                    <span className="text-black/60 font-mono">{worked}/{total} · {pct}%</span>
                  </div>
                  <div className="h-3 bg-stone-200 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: tierColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Heatmap + Graph */}
        <section className="mb-8 page-break-after">
          <h3 className="text-lg font-black uppercase tracking-wider mb-3 pb-1 border-b border-black/10">🔥 Activité</h3>

          <h4 className="text-sm font-bold uppercase tracking-wider mb-2">Heatmap annuelle</h4>
          <div className="mb-4">
            <div className="flex gap-0.5">
              {heatmap.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className="w-2 h-2 rounded-sm"
                      style={{ background: day.isFuture ? 'transparent' : heatColor(day.count) }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 text-[9px] uppercase tracking-wider text-black/50">
              <span>Moins</span>
              {[0, 1, 2, 3].map(n => <div key={n} className="w-2 h-2 rounded-sm" style={{ background: heatColor(n) }} />)}
              <span>Plus</span>
            </div>
          </div>

          <h4 className="text-sm font-bold uppercase tracking-wider mb-2">📊 Séances par mois (12 derniers mois)</h4>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthsData}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#000" />
                <YAxis tick={{ fontSize: 10 }} stroke="#000" allowDecimals={false} />
                <Bar dataKey="sessions" fill="#000" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Radar */}
        <section className="mb-8 page-break-after">
          <h3 className="text-lg font-black uppercase tracking-wider mb-3 pb-1 border-b border-black/10">🎯 Couverture par catégorie</h3>
          {radarData.length > 0 ? (
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#00000020" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: '#000' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#666' }} />
                  <Radar dataKey="coverage" stroke="#000" fill="#000" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-black/40">Aucune catégorie.</div>
          )}
        </section>

        {/* Liste détaillée */}
        <section>
          <h3 className="text-lg font-black uppercase tracking-wider mb-3 pb-1 border-b border-black/10">📋 Liste détaillée des compétences</h3>
          <div className="space-y-4">
            {detailedList.map(({ level, items }) => {
              const tierColor = getTierColor(level.tier_id);
              const byCategory = {};
              items.forEach(it => {
                if (!byCategory[it.cat.id]) byCategory[it.cat.id] = { cat: it.cat, items: [] };
                byCategory[it.cat.id].items.push(it);
              });

              return (
                <div key={level.id} className="page-break-inside-avoid">
                  <div className="flex items-center gap-2 mb-2 pb-1 border-b border-black/10">
                    <span className="px-2 py-0.5 rounded text-white text-[9px] font-black" style={{ background: tierColor }}>{level.id}</span>
                    <span className="text-sm font-bold">{getTierEmoji(level.tier_id)} {level.name}</span>
                  </div>
                  {Object.values(byCategory).map(({ cat, items: catItems }) => (
                    <div key={cat.id} className="mb-2">
                      <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-black/60 mb-1">
                        {cat.emoji || '🥋'} {cat.name}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4">
                        {catItems.map(it => (
                          <div key={it.skill.id} className="flex items-start gap-2 text-xs py-0.5">
                            {it.isWorked ? (
                              <div className="w-3 h-3 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check size={8} className="text-white" strokeWidth={4} />
                              </div>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-stone-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <X size={8} className="text-white" strokeWidth={4} />
                              </div>
                            )}
                            <span className="flex-1">{it.skill.name}</span>
                            {it.reps > 0 && <span className="text-[9px] font-bold text-black/50 ml-1">×{it.reps}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        {/* Pied de page */}
        <div className="mt-12 pt-4 border-t border-black/10 text-center text-[10px] text-black/40">
          Document généré automatiquement par EKE Course Management
        </div>
      </div>
    </div>
  );
}

function KpiCard({ value, label, emoji }) {
  return (
    <div className="bg-black text-white rounded-lg p-4 text-center">
      {emoji && <div className="text-xl mb-1">{emoji}</div>}
      <div className="text-3xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/70 mt-1">{label}</div>
    </div>
  );
}