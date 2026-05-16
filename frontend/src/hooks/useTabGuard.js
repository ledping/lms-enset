// src/hooks/useTabGuard.js
// Détecte quand l'étudiant quitte l'onglet pendant un CC
import { useEffect, useState } from 'react';

export function useTabGuard(isActive) {
  const [warnings, setWarnings] = useState(0);
  const MAX_WARNINGS = 3;

  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarnings(prev => {
          const next = prev + 1;
          if (next >= MAX_WARNINGS) {
            // Déclenche la soumission forcée dans CCInterface.jsx
            window.dispatchEvent(
              new CustomEvent('force-submit', { detail: { reason: 'tab-switch' } })
            );
          }
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive]);

  return {
    warnings,
    remainingWarnings: MAX_WARNINGS - warnings,
  };
}
