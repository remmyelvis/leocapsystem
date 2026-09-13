import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './pages/globals.css'; 
import { AuthProvider } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MetricsProvider } from './components/global/MetricsProvider';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={null}>
        <MetricsProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MetricsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
