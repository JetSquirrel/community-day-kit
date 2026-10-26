import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './i18n'
/* vendored before index.css so Tailwind utilities win ties over .ann base styles */
import './styles/neat-annotations.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
