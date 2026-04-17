import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [status, setStatus] = useState('Connexion à Supabase...');

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setStatus('✅ Connexion Supabase OK — ' + (data.session ? 'session active' : 'aucune session'));
      } catch (err) {
        setStatus('❌ Erreur : ' + err.message);
      }
    }
    testConnection();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>EKE Course Management</h1>
      <p>{status}</p>
    </div>
  );
}

export default App;