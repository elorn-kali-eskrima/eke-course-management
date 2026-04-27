import { useState } from 'react';
import { AuthProvider, useAuth } from './useAuth';
import LoginPage from './LoginPage';
import BottomNav from './BottomNav';
import SessionsTab from './SessionsTab';
import HistoryTab from './HistoryTab';
import StatsTab from './StatsTab';
import ConfigTab from './ConfigTab';

function AppContent() {
  const { session, profile, loading, signOut } = useAuth();
  const [tab, setTab] = useState('sessions');

  // On affiche "Chargement…" uniquement au tout premier démarrage
  // (quand on ne sait pas encore si l'utilisateur est connecté)
  if (loading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-black/60">
        Chargement…
      </div>
    );
  }

  if (!session) return <LoginPage />;

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
<header className="bg-black text-white sticky top-0 z-40 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logo-eke-blanc.png"
              alt="Elorn Kali Eskrima"
              className="h-20 w-auto object-contain flex-shrink-0"
            />
            <div>
              <div className="text-xl font-black tracking-tight leading-tight" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.08em' }}>
                ELORN KALI ESKRIMA
              </div>
              <div className="text-xs uppercase tracking-[0.25em] text-white/50 mt-0.5">
                Course Management
              </div>
            </div>
          </div>
<div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: profile?.color }} />
              <span className="text-sm">{profile?.full_name}</span>
              {isAdmin && (
                <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                  👑 Admin
                </span>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="hidden sm:flex text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded transition items-center gap-1"
              title="Rafraîchir l'application"
              aria-label="Rafraîchir"
            >
              🔄 <span>Actualiser</span>
            </button>
            <button
              onClick={signOut}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition"
            >
              🚪
            </button>
          </div>
        </div>
      </header>

      {/* Contenu principal - pb-24 pour laisser de la place pour la bottom nav */}
      <main className="pb-24">
        {tab === 'sessions' && <SessionsTab />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'stats' && <StatsTab />}
        {tab === 'config' && isAdmin && <ConfigTab />}
      </main>

      <BottomNav tab={tab} setTab={setTab} isAdmin={isAdmin} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;