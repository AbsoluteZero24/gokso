import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.onerror = function (msg, url, line, col, error) {
  console.error("GLOBAL ERROR:", msg, url, line, col, error);
  // Optional: document.body.innerHTML = "<h1>Application Error</h1><p>" + msg + "</p>";
};

console.log("Main.jsx: Initializing application...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("FATAL: Root element not found!");
} else {
  console.log("Main.jsx: Root element found, mounting React...");
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
