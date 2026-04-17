import { AuthProvider, useAuth } from './useAuth';
import LoginPage from './LoginPage';

function AppContent() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui', textAlign: 'center' }}>
        Chargement…
      </div>
    );
  }

  if (!session) return <LoginPage />;

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🥋 EKE Course Management</h1>
      <p>✅ Connecté en tant que : <strong>{profile?.full_name}</strong></p>
      <p>📧 Email : {session.user.email}</p>
      <p>👤 Rôle : <strong>{profile?.role}</strong> {profile?.role === 'admin' && '👑'}</p>
      <p>🎨 Couleur : <span style={{
        display: 'inline-block',
        width: '20px',
        height: '20px',
        background: profile?.color,
        borderRadius: '50%',
        verticalAlign: 'middle',
      }}></span></p>
      <button
        onClick={signOut}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          background: 'black',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
        }}
      >
        🚪 Déconnexion
      </button>
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