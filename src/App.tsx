import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './lib/theme'
import Index from './pages/Index'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ThemeProvider>
  )
}
