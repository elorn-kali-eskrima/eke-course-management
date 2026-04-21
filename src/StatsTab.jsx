import { useState, useMemo } from 'react';
import { Search, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { useSessions } from './useSessions';
import { useProgram } from './useProgram';

export default function StatsTab() {
  const { sessions, loading: loadingSessions, error: sessionsError } = useSessions();
  const { program, tiers, loading: loadingProgram, error: programError } = useProgram();

  const [period, setPeriod] = useState('year');
  const [instructorFilter, setInstructorFilter] = useState('all');

  // Liste des instructeurs présents dans les séances
  const instructors = useMemo(() => {
    const map = new Map();
    sessions.forEach(s => {
      if (s.instructor) map.set(s.instructor.id, s.instructor);
    });
    return Array.from(map.values());
  }, [sessions]);

  // Filtrage des séances selon période + instructeur
  const filtered = useMemo(() => {
    const now = new Date();
    return sessions.filter(s => {
      if (instructorFilter !== 'all' && s.instructor_id !== instructorFilter) return false;
      const d = new Date(s.date);
      const diffDays = (now - d) / (1000 * 60 * 60 * 24);
      if (period === 'week' && diffDays > 7) return false;
      if (period === 'month' && diffDays > 30) return false;
      if (period === 'quarter' && diffDays > 90) return false;
      if (period === 'year' && diffDays > 365) return false;
      return true;
    });
  }, [sessions, period, instructorFilter]);

  // KPIs
  const totalSessions = filtered.length;
  const totalReps = filtered.reduce((sum, s) => sum + (s.session_skills?.length || 0), 0);

  // Map des compétences travaillées : { skillId: nb_repetitions }
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

  const totalSkills = useMemo(() => {
    if (!program) return 0;
    return program.reduce((sum, lvl) =>
      sum + lvl.categories.reduce((s, c) => s + c.skills.length, 0), 0);
  }, [program]);

  // Progression par niveau
  const levelProgress = useMemo(() => {
    if (!program) return [];
    return program.map(level => {
      const allSkillIds = level.categories.flatMap(cat => cat.skills.map(sk => sk.id));
      const worked = allSkillIds.filter(id => workedSkills.has(id)).length;
      return {
        level,
        total: allSkillIds.length,
        worked,
        pct: allSkillIds.length ? Math.round(worked / allSkillIds.length * 100) : 0,
      };
    });
  }, [program, workedSkills]);

  // Données mensuelles (6 derniers mois)
  const monthsData = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: d.toLocaleDateString('fr-FR', { month: 'short' }), sessions: 0 };
    }
    sessions.forEach(s => {
      if (instructorFilter !== 'all' && s.instructor_id !== instructorFilter) return;
      const key = s.date.slice(0, 7);
      if (months[key]) months[key].sessions++;
    });
    return Object.values(months);
  }, [sessions, instructorFilter]);

  // Radar par catégorie
  const radarData = useMemo(() => {
    if (!program) return [];
    const categoryMap = {};
    program.forEach(level => {
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
      category: `${v.emoji || ''} ${name}`,
      coverage: v.total ? Math.round(v.worked / v.total * 100) : 0,
    }));
  }, [program, workedSkills]);

  // Heatmap annuelle (53 semaines)
  const heatmap = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayCounts = {};
    sessions.forEach(s => {
      if (instructorFilter !== 'all' && s.instructor_id !== instructorFilter) return;
      dayCounts[s.date] = (dayCounts[s.date] || 0) + 1;
    });

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 365);
    while (startDate.getDay() !== 1) startDate.setDate(startDate.getDate() - 1);

    const weeks = [];
    for (let w = 0; w < 53; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(startDate);
        day.setDate(day.getDate() + w * 7 + d);
        const key = day.toISOString().split('T')[0];
        week.push({
          date: key,
          count: dayCounts[key] || 0,
          isFuture: day > today,
        });
      }
      weeks.push(week);
    }
    return weeks;
  }, [sessions, instructorFilter]);

  const heatColor = (n) => {
    if (n === 0) return '#f5f5f4';
    if (n === 1) return '#a8a29e';
    if (n === 2) return '#57534e';
    return '#000';
  };

  const getTierColor = (tierId) => tiers.find(t => t.id === tierId)?.color || '#000';

  if (loadingSessions || loadingProgram) {
    return <div className="p-6 text-center text-black/60">⏳ Chargement…</div>;
  }
  if (sessionsError || programError) {
    return <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800 max-w-4xl mx-auto">❌ Erreur : {sessionsError || programError}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Titre */}
      <div className="mb-5 flex items-baseline gap-3">
        <div className="text-xs font-mono text-black/30">03</div>
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.05em' }}>
            <span className="text-xl">📊</span>
            Statistiques
          </h2>
          <div className="text-xs text-black/50 uppercase tracking-[0.2em]">
            Analyse des données
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white border border-black/10 rounded-lg p-3 mb-6 flex flex-wrap gap-2">
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2 border border-black/15 rounded text-sm bg-white focus:outline-none focus:border-black"
        >
          <option value="week">📅 Semaine</option>
          <option value="month">📅 Mois</option>
          <option value="quarter">📅 Trimestre</option>
          <option value="year">📅 Année</option>
          <option value="all">📅 Tout</option>
        </select>
        <select
          value={instructorFilter}
          onChange={e => setInstructorFilter(e.target.value)}
          className="px-3 py-2 border border-black/15 rounded text-sm bg-white focus:outline-none focus:border-black"
        >
          <option value="all">👥 Tous instructeurs</option>
          {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard emoji="📝" value={totalSessions} label="Séances" />
        <StatCard emoji="🔁" value={totalReps} label="Répétitions" />
        <StatCard emoji="✅" value={`${workedSkills.size}/${totalSkills}`} label="Couvertes" />
      </div>

      {/* Heatmap */}
      <Card title="🔥 Activité annuelle">
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-1" style={{ minWidth: '700px' }}>
            {heatmap.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="w-3 h-3 rounded-sm"
                    title={day.isFuture ? '' : `${day.date} : ${day.count} séance${day.count > 1 ? 's' : ''}`}
                    style={{ background: day.isFuture ? 'transparent' : heatColor(day.count) }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] uppercase tracking-wider text-black/50">
            <span>Moins</span>
            {[0, 1, 2, 3].map(n => <div key={n} className="w-3 h-3 rounded-sm" style={{ background: heatColor(n) }} />)}
            <span>Plus</span>
          </div>
        </div>
      </Card>

      {/* Progression par niveau */}
      <Card title="📈 Progression par niveau">
        {levelProgress.length === 0 ? (
          <div className="text-sm text-black/40 text-center py-4">Aucun niveau dans le programme.</div>
        ) : (
          <div className="space-y-3">
            {levelProgress.map(({ level, total, worked, pct }) => {
              const tierColor = getTierColor(level.tier_id);
              const tierEmoji = tiers.find(t => t.id === level.tier_id)?.emoji || '⚪';
              return (
                <div key={level.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-white text-[9px] font-black" style={{ background: tierColor }}>{level.id}</span>
                      <span>{tierEmoji}</span>
                    </span>
                    <span className="text-black/60">{worked}/{total} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${pct}%`, background: tierColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Bar chart : séances par mois */}
      <Card title="📊 Séances par mois (6 derniers mois)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthsData}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#000" />
            <YAxis tick={{ fontSize: 11 }} stroke="#000" allowDecimals={false} />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="sessions" fill="#000" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Radar chart : couverture par catégorie */}
      <Card title="🎯 Couverture par catégorie">
        {radarData.length === 0 ? (
          <div className="text-sm text-black/40 text-center py-4">Aucune catégorie.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#00000020" />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: '#000' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#666' }} />
              <Radar dataKey="coverage" stroke="#000" fill="#000" fillOpacity={0.35} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Liste détaillée des compétences */}
      <SkillChecklist
        program={program}
        tiers={tiers}
        skillRepetitions={skillRepetitions}
        workedSkills={workedSkills}
      />
    </div>
  );
}

// ============ LISTE DÉTAILLÉE DES COMPÉTENCES ============
function SkillChecklist({ program, tiers, skillRepetitions, workedSkills }) {
  const [filter, setFilter] = useState('all'); // all | seen | unseen
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [expandedLevels, setExpandedLevels] = useState({});

  const toggleLevel = (lvl) => setExpandedLevels(p => ({ ...p, [lvl]: !p[lvl] }));
  const getTierColor = (tierId) => tiers.find(t => t.id === tierId)?.color || '#000';
  const getTierEmoji = (tierId) => tiers.find(t => t.id === tierId)?.emoji || '⚪';

  // Pré-calcul : items filtrés par niveau
  const levelStats = useMemo(() => {
    if (!program) return [];
    return program
      .map(level => {
        const items = [];
        level.categories.forEach(cat => {
          cat.skills.forEach(sk => {
            const isWorked = workedSkills.has(sk.id);
            if (filter === 'seen' && !isWorked) return;
            if (filter === 'unseen' && isWorked) return;
            if (search && !sk.name.toLowerCase().includes(search.toLowerCase()) && !cat.name.toLowerCase().includes(search.toLowerCase())) return;
            items.push({ cat, skill: sk, isWorked, reps: skillRepetitions[sk.id] || 0 });
          });
        });
        return { level, items };
      })
      .filter(l => (levelFilter === 'all' || l.level.id === levelFilter) && l.items.length > 0);
  }, [program, workedSkills, skillRepetitions, filter, search, levelFilter]);

  const totalSkillsCount = program?.reduce((s, l) =>
    s + l.categories.reduce((a, c) => a + c.skills.length, 0), 0) || 0;

  return (
    <Card title="📋 Liste détaillée des compétences">
      {/* Filtres */}
      <div className="space-y-2 mb-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter === 'all' ? 'bg-black text-white' : 'bg-stone-100 hover:bg-stone-200'}`}
          >
            Toutes ({totalSkillsCount})
          </button>
          <button
            onClick={() => setFilter('seen')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter === 'seen' ? 'bg-emerald-600 text-white' : 'bg-stone-100 hover:bg-stone-200'}`}
          >
            ✅ Vues ({workedSkills.size})
          </button>
          <button
            onClick={() => setFilter('unseen')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter === 'unseen' ? 'bg-red-600 text-white' : 'bg-stone-100 hover:bg-stone-200'}`}
          >
            ❌ Non vues ({totalSkillsCount - workedSkills.size})
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher une compétence…"
              className="w-full pl-9 pr-3 py-2 border border-black/15 rounded text-sm focus:outline-none focus:border-black"
            />
          </div>
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            className="px-3 py-2 border border-black/15 rounded text-sm bg-white focus:outline-none focus:border-black"
          >
            <option value="all">🎯 Tous niveaux</option>
            {program?.map(l => <option key={l.id} value={l.id}>{l.id}</option>)}
          </select>
        </div>
      </div>

      {/* Liste */}
      {levelStats.length === 0 ? (
        <div className="text-center py-8 text-black/40 text-sm">🤔 Aucune compétence ne correspond aux filtres</div>
      ) : (
        <div className="space-y-2">
          {levelStats.map(({ level, items }) => {
            const tierColor = getTierColor(level.tier_id);
            const isOpen = expandedLevels[level.id] ?? true;

            // Regrouper par catégorie
            const byCategory = {};
            items.forEach(it => {
              if (!byCategory[it.cat.id]) byCategory[it.cat.id] = { cat: it.cat, items: [] };
              byCategory[it.cat.id].items.push(it);
            });

            return (
              <div key={level.id} className="border border-black/10 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleLevel(level.id)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-stone-50 hover:bg-stone-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-white text-[9px] font-black" style={{ background: tierColor }}>{level.id}</span>
                    <span className="text-xs font-semibold">{getTierEmoji(level.tier_id)} {level.name}</span>
                    <span className="text-[10px] text-black/50">({items.length})</span>
                  </div>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isOpen && (
                  <div className="p-2 space-y-2">
                    {Object.values(byCategory).map(({ cat, items: catItems }) => (
                      <div key={cat.id}>
                        <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-black/50 mb-1 px-1">
                          {cat.emoji || '🥋'} {cat.name}
                        </div>
                        <div className="space-y-0.5">
                          {catItems.map(it => (
                            <div
                              key={it.skill.id}
                              className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${it.isWorked ? 'bg-emerald-50' : 'bg-stone-50'}`}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {it.isWorked ? (
                                  <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center">
                                    <Check size={10} className="text-white" strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-stone-300 flex items-center justify-center">
                                    <X size={10} className="text-white" strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                              <span className="flex-1">{it.skill.name}</span>
                              {it.reps > 0 && (
                                <span className="flex-shrink-0 text-[10px] font-bold bg-black text-white px-1.5 py-0.5 rounded-full">
                                  ×{it.reps}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ============ Helpers UI ============
function Card({ title, children }) {
  return (
    <div className="bg-white border border-black/10 rounded-lg p-4 mb-4">
      <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-black/70 mb-3 pb-2 border-b border-black/10">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ value, label, emoji }) {
  return (
    <div className="bg-black text-white rounded-lg p-4 text-center">
      {emoji && <div className="text-xl mb-1">{emoji}</div>}
      <div className="text-2xl font-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/70 mt-1">{label}</div>
    </div>
  );
}