// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentPage  from './pages/StudentPage';
import TeacherPage  from './pages/TeacherPage';

// Protège les routes : redirige vers /login si pas connecté
function PrivateRoute({ children }) {
  const token = localStorage.getItem('access_token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Routes protégées */}
        <Route path="/etudiant"   element={<PrivateRoute><StudentPage /></PrivateRoute>} />
        <Route path="/enseignant" element={<PrivateRoute><TeacherPage /></PrivateRoute>} />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
