import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Feedback from './pages/Feedback';
import Roleplay from './pages/Roleplay';
import './index.css';

function App() {
  return (
    <Router>
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
