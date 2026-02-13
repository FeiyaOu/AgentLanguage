import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Feedback from './pages/Feedback';
import Roleplay from './pages/Roleplay';
import ThemeToggle from './components/ThemeToggle';
import './index.css';

function App() {
  return (
    <Router>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/roleplay" element={<Roleplay />} />
      </Routes>
    </Router>
  );
}

export default App;
