import { Routes, Route } from 'react-router-dom';
import ScrollToTop from '../src/components/ScrollToTop';
import Home from '../src/pages/Home';
import StudyPage from '../src/pages/StudyPage';
import BreakPage from '../src/pages/BreakPage';
import VoicePage from '../src/pages/VoicePage';
import NotFound from '../src/pages/NotFound';
import ServerError from '../src/pages/ServerError';
import PrivacyPolicy from '../src/pages/PrivacyPolicy';
import TermsOfService from '../src/pages/TOS';
import Profile from '../src/pages/Profile';
import Premium from '../src/pages/Premium';
import StorytellingPage from './pages/StoryTellingPage';
import StudentDashboard from './pages/StudentDashboard';
import RecapPage from './pages/RecapPage';

// Importing Footer component for consistent layout
import Footer from '../src/components/Footer';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Main Routes - Home is default entry point */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />

        {/* Study & Learning Routes */}
        <Route path="/study" element={<StudyPage />} />
        <Route path="/break" element={<BreakPage />} />
        <Route path="/voice" element={<VoicePage />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/storytelling" element={<StorytellingPage />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/recap" element={<RecapPage />} />

        {/* Legal Routes */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* Error Routes */}
        <Route path="/error/502" element={<ServerError />} />
        <Route path="/server-error" element={<ServerError />} />

        {/* 404 - Must be last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;