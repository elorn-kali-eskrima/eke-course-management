export default function BottomNav({ tab, setTab, isAdmin }) {
  const items = [
    { id: 'sessions', emoji: '📝', label: 'Séances' },
    { id: 'history', emoji: '📚', label: 'Historique' },
    { id: 'stats', emoji: '📊', label: 'Stats' },
    ...(isAdmin ? [{ id: 'config', emoji: '⚙️', label: 'Config' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 z-40">
      <div className={`max-w-5xl mx-auto grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {items.map(({ id, label, emoji }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="relative flex flex-col items-center py-3 transition hover:bg-stone-50"
          >
            <span className="text-lg">{emoji}</span>
            <span className={`text-[10px] mt-0.5 uppercase tracking-wider ${tab === id ? 'font-bold text-black' : 'font-medium text-black/40'}`}>
              {label}
            </span>
            {tab === id && <div className="absolute top-0 w-8 h-0.5 bg-black" />}
          </button>
        ))}
      </div>
    </nav>
  );
}