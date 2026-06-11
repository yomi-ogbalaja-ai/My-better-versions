import { useState } from 'react'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import StarshipGame from './components/StarshipGame'

export type Page = 'home' | 'game'

function App() {
  const [activePage, setActivePage] = useState<Page>('game')

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      {activePage === 'home' ? <MainContent /> : <StarshipGame />}
    </div>
  )
}

export default App
