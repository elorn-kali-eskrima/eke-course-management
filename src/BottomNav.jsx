export default function BottomNav({ tab, setTab, isAdmin }) {
  const items = [
    { id: 'sessions', emoji: '📝', label: 'Séances' },
    { id: 'history', emoji: '📚', label: 'Historique' },
    { id: 'stats', emoji: '📊', label: 'Stats' },
    ...(isAdmin ? [{ id: 'config', emoji: '⚙️', label: 'Config' }] : []),
  ];

  // Sur mobile, on ajoute une colonne pour le bouton refresh
  // Sur desktop (sm:), il y a un bouton refresh dans le header donc on n'en met pas ici
  const mobileColCount = items.length + 1;
  const desktopColCount = items.length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 z-40">
      <div
        className={`max-w-5xl mx-auto grid sm:grid-cols-${desktopColCount}`}
        style={{ gridTemplateColumns: `repeat(${mobileColCount}, minmax(0, 1fr))` }}
      >
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

        {/* Bouton refresh — visible uniquement sur mobile (sm:hidden) */}
        <button
          onClick={() => window.location.reload()}
          className="sm:hidden relative flex flex-col items-center py-3 transition hover:bg-stone-50 border-l border-black/10"
          title="Rafraîchir l'application"
          aria-label="Rafraîchir"
        >
          <span className="text-lg">🔄</span>
          <span className="text-[10px] mt-0.5 uppercase tracking-wider font-medium text-black/40">
            Refresh
          </span>
        </button>
      </div>
    </nav>
  );
}