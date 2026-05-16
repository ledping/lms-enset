// src/pages/StudentPage.jsx
import { useNavigate } from 'react-router-dom';
import StudentDashboard from '../components/student/StudentDashboard';

export default function StudentPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return <StudentDashboard onLogout={handleLogout} />;
}


// ─────────────────────────────────────────────────────────────────────────────
// SAUVEGARDER CE BLOC DANS UN FICHIER SÉPARÉ : src/pages/TeacherPage.jsx
// ─────────────────────────────────────────────────────────────────────────────

// src/pages/TeacherPage.jsx
// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import SyntheseNotes from '../components/teacher/SyntheseNotes';
// import CoursUpload   from '../components/teacher/CoursUpload';
//
// export default function TeacherPage() {
//   const navigate = useNavigate();
//   const [onglet, setOnglet] = useState('synthese'); // 'synthese' | 'upload'
//
//   const handleLogout = () => { localStorage.clear(); navigate('/login'); };
//
//   return (
//     <div className="min-h-screen bg-[#0d1117] text-white">
//       <nav className="bg-[#161b22] border-b border-[#21262d] px-4 py-3 flex items-center gap-3">
//         <span className="font-black text-blue-500 flex-1">ENSET LMS — Enseignant</span>
//         <button
//           onClick={() => setOnglet('synthese')}
//           className={`text-xs px-3 py-1.5 rounded-lg transition-all
//             ${onglet === 'synthese' ? 'bg-blue-600 text-white' : 'text-[#8b949e] hover:text-white'}`}
//         >
//           Notes
//         </button>
//         <button
//           onClick={() => setOnglet('upload')}
//           className={`text-xs px-3 py-1.5 rounded-lg transition-all
//             ${onglet === 'upload' ? 'bg-blue-600 text-white' : 'text-[#8b949e] hover:text-white'}`}
//         >
//           Ajouter un cours
//         </button>
//         <button onClick={handleLogout} className="text-xs text-[#8b949e] hover:text-red-400">
//           Déconnexion
//         </button>
//       </nav>
//       <div className="p-4">
//         {onglet === 'synthese' && <SyntheseNotes />}
//         {onglet === 'upload'   && <CoursUpload onSuccess={() => setOnglet('synthese')} />}
//       </div>
//     </div>
//   );
// }
