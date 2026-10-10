import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

const updateInterval = 60 * 60 * 1000;

registerSW({
  immediate: true,
  onRegisteredSW: (swUrl, registration) => {
    if (!registration) return;
    const checkForUpdates = async () => {
      if (registration.installing || !navigator.onLine) return;
      try {
        const response = await fetch(swUrl, {
          cache: 'no-store',
          headers: { cache: 'no-store', 'cache-control': 'no-cache' },
        });
        if (response.ok) await registration.update();
      } catch {
        // Keep serving the installed app when offline or when the host is unavailable.
      }
    };

    void checkForUpdates();
    window.setInterval(() => void checkForUpdates(), updateInterval);
    window.addEventListener('focus', () => void checkForUpdates());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void checkForUpdates();
    });
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
