// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';

export default function LoginPage() {
  const [matricule, setMatricule] = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Django SimpleJWT attend "username" et "password"
      // Le matricule est le username (voir accounts/serializers.py)
      const res = await api.post('/auth/token/', {
        username: matricule,
        password,
      });

      localStorage.setItem('access_token',  res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);

      // Récupérer le profil pour savoir si étudiant ou enseignant
      const profil = await api.get('/auth/me/');
      localStorage.setItem('role', profil.data.role);

      if (profil.data.role === 'enseignant' || profil.data.role === 'admin') {
        navigate('/enseignant');
      } else {
        navigate('/etudiant');
      }
    } catch (err) {
      setError('Matricule ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-white mb-1"
               style={{ fontFamily: 'sans-serif' }}>
            ENSET <span className="text-blue-500">LMS</span>
          </div>
          <p className="text-[#8b949e] text-sm">Plateforme d'évaluation en ligne</p>
        </div>

        {/* Formulaire */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
          <h1 className="text-white font-bold text-base mb-5">Connexion</h1>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-xs font-semibold text-[#8b949e]
                                 uppercase tracking-wide mb-1.5">
                Matricule
              </label>
              <input
                type="text"
                value={matricule}
                onChange={e => setMatricule(e.target.value)}
                placeholder="Ex: 22TIC0042"
                required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg
                           px-3 py-2.5 text-white text-sm placeholder-[#484f58]
                           outline-none focus:border-blue-500
                           focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e]
                                 uppercase tracking-wide mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg
                           px-3 py-2.5 text-white text-sm placeholder-[#484f58]
                           outline-none focus:border-blue-500
                           focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30
                             rounded-lg px-3 py-2">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500
                         text-white font-bold text-sm transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-xs text-[#8b949e] mt-4">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-blue-400 hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
