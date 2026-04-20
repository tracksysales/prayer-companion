import React from 'react';
import ReactDOM from 'react-dom/client';
import ReactGA from 'react-ga4';
import { clarity } from 'clarity-js';
import App from './App.jsx';
import './index.css';

ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID);

if (import.meta.env.PROD) {
  clarity.start({ projectId: import.meta.env.VITE_CLARITY_PROJECT_ID });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
