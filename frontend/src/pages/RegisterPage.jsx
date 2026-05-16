// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';

export default function RegisterPage() {
  const [form, setForm]   = useState({
    nom: '', prenom: '', matricule: '', email: '', filiere: 'TIC', password: '',
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register/', form);
      // Connexion automatique après inscription
      const res = await api.post('/auth/token/', {
        username: form.matricule,
        password: form.password,
      });
      localStorage.setItem('access_token',  res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('role', 'etudiant');
      navigate('/etudiant');
    } catch (err) {
      const data = err.response?.data;
      // Afficher le premier message d'erreur retourné par Django
      const msg = data
        ? Object.values(data).flat()[0]
        : "Erreur lors de l'inscription.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'prenom',    label: 'Prénom',        type: 'text',     placeholder: 'Jean-Pierre' },
    { name: 'nom',       label: 'Nom',            type: 'text',     placeholder: 'KAMGA' },
    { name: 'matricule', label: 'Matricule',      type: 'text',     placeholder: '22TIC0042' },
    { name: 'email',     label: 'Email',          type: 'email',    placeholder: 'jean@enset.cm' },
    { name: 'password',  label: 'Mot de passe',   type: 'password', placeholder: 'Min. 6 caractères' },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-3xl font-black text-white mb-1">
            ENSET <span className="text-blue-500">LMS</span>
          </div>
          <p className="text-[#8b949e] text-sm">Créer un compte étudiant</p>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
          <h1 className="text-white font-bold text-base mb-5">Inscription</h1>

          <form onSubmit={handleSubmit} className="space-y-3">

            {fields.map(f => (
              <div key={f.name}>
                <label className="block text-xs font-semibold text-[#8b949e]
                                   uppercase tracking-wide mb-1">
                  {f.label}
                </label>
                <input
                  name={f.name}
                  type={f.type}
                  value={form[f.name]}
                  onChange={handleChange}
                  placeholder={f.placeholder}
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg
                             px-3 py-2.5 text-white text-sm placeholder-[#484f58]
                             outline-none focus:border-blue-500
                             focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>
            ))}

            {/* Filière */}
            <div>
              <label className="block text-xs font-semibold text-[#8b949e]
                                 uppercase tracking-wide mb-1">
                Filière
              </label>
              <div className="flex gap-2">
                {['TIC', 'II'].map(f => (
                  <button
                    key={f} type="button"
                    onClick={() => setForm(p => ({ ...p, filiere: f }))}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-bold
                                transition-all
                      ${form.filiere === f
                        ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                        : 'border-[#30363d] bg-[#0d1117] text-[#8b949e]'
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30
                             rounded-lg px-3 py-2">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500
                         text-white font-bold text-sm transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Création du compte...' : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-xs text-[#8b949e] mt-4">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-blue-400 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
