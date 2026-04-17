import { useState } from 'react';
import { useAuth } from './useAuth';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
      fontFamily: 'system-ui, sans-serif',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            marginBottom: '1.5rem',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
          }}>
            <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900 }}>EKE</span>
          </div>
          <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 900, margin: 0, letterSpacing: '0.05em' }}>
            ELORN KALI ESKRIMA
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
            Course Management
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}>
          <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: 'rgba(0,0,0,0.6)', marginBottom: '0.5rem' }}>
            📧 Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '0.25rem',
              marginBottom: '1rem',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          />

          <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: 'rgba(0,0,0,0.6)', marginBottom: '0.5rem' }}>
            🔒 Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '0.25rem',
              marginBottom: '1.5rem',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <div style={{
              background: '#fee',
              color: '#c00',
              padding: '0.75rem',
              borderRadius: '0.25rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#666' : 'black',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.25rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '0.875rem',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Connexion…' : 'Connexion →'}
          </button>
        </form>
      </div>
    </div>
  );
}