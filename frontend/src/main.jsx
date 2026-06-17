import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App.jsx'
import Admin from './Admin.jsx'
import MyTickets from './pages/MyTickets.jsx'
import RefundTracker from './pages/RefundTracker.jsx'
import FlightTracker from './pages/FlightTracker.jsx'
import Auth from './components/Auth.jsx'

import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom"

const ProtectedLayout = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AuthRoute = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  return <Auth onAuthSuccess={() => navigate('/', { replace: true })} />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthRoute />} />
        
        <Route path="/" element={<ProtectedLayout><App /></ProtectedLayout>} />
        <Route path="/admin" element={<Admin />} />
        
        <Route path="/my-tickets" element={<ProtectedLayout><MyTickets /></ProtectedLayout>} />
        <Route path="/refunds" element={<ProtectedLayout><RefundTracker /></ProtectedLayout>} />
        <Route path="/flight-tracker" element={<ProtectedLayout><FlightTracker /></ProtectedLayout>} />
        
        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)