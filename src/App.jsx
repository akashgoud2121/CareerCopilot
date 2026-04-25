import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";

// Lazy load pages for performance
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const ConnectGemini = lazy(() => import("./pages/ConnectGemini"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ResumeBuilder = lazy(() => import("./pages/ResumeBuilder"));
const Settings = lazy(() => import("./pages/Settings"));
const Certificate = lazy(() => import("./pages/Certificate"));

import ScrollToTop from "./components/common/ScrollToTop";
import SmoothScroll from "./components/layout/SmoothScroll";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Loading fallback component
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-white">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
  </div>
);


function App() {
  return (

    <HelmetProvider>
      <SmoothScroll>
        <div className="flex min-h-screen flex-col">
          <ScrollToTop />
          <Navbar />
          <main className="flex-1">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/connect-gemini" element={<ConnectGemini />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/resume-builder" 
                  element={
                    <ProtectedRoute>
                      <ResumeBuilder />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/certificate" 
                  element={
                    <ProtectedRoute>
                      <Certificate />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </SmoothScroll>
    </HelmetProvider>
  );
}


export default App;