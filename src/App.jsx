import { Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import LandingPage from "./pages/LandingPage";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ConnectGemini from "./pages/ConnectGemini";
import HowItWorks from "./pages/HowItWorks";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import ResumeBuilder from "./pages/ResumeBuilder";
import Settings from "./pages/Settings";

import ScrollToTop from "./components/common/ScrollToTop";
import SmoothScroll from "./components/layout/SmoothScroll";

function App() {
  return (
    <SmoothScroll>
      <div className="flex min-h-screen flex-col">
        <ScrollToTop />
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/connect-gemini" element={<ConnectGemini />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/resume-builder" element={<ResumeBuilder />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </SmoothScroll>


  );
}

export default App;