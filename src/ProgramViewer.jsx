import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useProgram } from './useProgram';

export default function ProgramViewer() {
  const { program, tiers, loading, error } = useProgram();
  const [expandedLevels, setExpandedLevels] = useState({});

  if (loading) {
    return <div className="p-6 text-center text-black/60">⏳ Chargement du programme…</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800">
        ❌ Erreur : {error}
      </div>
    );
  }

  if (!program || program.length === 0) {
    return <div className="p-6 text-center text-black/60">Aucun niveau trouvé.</div>;
  }

  const getTierColor = (tierId) => tiers.find(t => t.id === tierId)?.color || '#000';
  const getTierEmoji = (tierId) => tiers.find(t => t.id === tierId)?.emoji || '⚪';

  const totalSkills = program.reduce((sum, lvl) =>
    sum + lvl.categories.reduce((s, c) => s + c.skills.length, 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.05em' }}>
          🥋 Programme MARS
        </h2>
        <p className="text-sm text-black/60 mt-1">
          {program.length} niveaux · {totalSkills} compétences
        </p>
      </div>

      <div className="space-y-2">
        {program.map(level => {
          const isOpen = expandedLevels[level.id];
          const tierColor = getTierColor(level.tier_id);
          const tierEmoji = getTierEmoji(level.tier_id);
          const skillCount = level.categories.reduce((s, c) => s + c.skills.length, 0);

          return (
            <div key={level.id} className="border border-black/10 rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => setExpandedLevels(prev => ({ ...prev, [level.id]: !prev[level.id] }))}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 text-[10px] font-black rounded text-white" style={{ background: tierColor }}>
                    {level.id}
                  </span>
                  <span className="text-base">{tierEmoji}</span>
                  <span className="text-sm font-semibold" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.08em', fontSize: '16px' }}>
                    {level.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-black/50">{skillCount} comp.</span>
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-black/10 p-4 space-y-4 bg-stone-50/50">
                  {level.categories.map(cat => (
                    <div key={cat.id}>
                      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/50 mb-2 pb-1 border-b border-black/10 flex items-center gap-2">
                        <span className="text-sm">{cat.emoji || '🥋'}</span>
                        {cat.name}
                        <span className="ml-auto normal-case tracking-normal text-black/40">{cat.skills.length}</span>
                      </div>
                      <ul className="space-y-1 pl-1">
                        {cat.skills.map(sk => (
                          <li key={sk.id} className="text-sm flex items-start gap-2">
                            <span className="text-black/30">•</span>
                            <span>{sk.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}