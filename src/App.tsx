import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AnimatePresence, motion } from 'framer-motion';
import { SessionProvider } from './contexts/SessionContext';

// Lazy load pages for performance
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const Persona = lazy(() => import('./pages/Persona').then(m => ({ default: m.Persona })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Todos = lazy(() => import('./pages/Todos').then(m => ({ default: m.Todos })));

// Loading component
function PageLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-center h-full"
    >
      <div className="flex items-center gap-2 text-[#666666]">
        <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-[#1A1A1A] rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </motion.div>
  );
}

// Page wrapper with animation
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

// Wrapper component to use useLocation hook
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route
            path="chat"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><Chat /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="persona"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><Persona /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><Settings /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="todos"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><Todos /></PageTransition>
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AnimatedRoutes />
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;
