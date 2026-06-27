import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import DashboardHome from './pages/DashboardHome';
import Clients from './pages/Clients';
import Parts from './pages/Parts';
import Services from './pages/Services';
import ServiceOrders from './pages/ServiceOrders';
import ServiceOrderDetail from './pages/ServiceOrderDetail';
import Finance from './pages/Finance';
import Analytics from './pages/Analytics';
import ClientView from './pages/ClientView';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/orcamento/:token" element={<ClientView />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardHome />} />
                <Route path="/clientes" element={<Clients />} />
                <Route path="/pecas" element={<Parts />} />
                <Route path="/servicos" element={<Services />} />
                <Route path="/os" element={<ServiceOrders />} />
                <Route path="/os/:id" element={<ServiceOrderDetail />} />
                <Route path="/financeiro" element={<Finance />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/configuracoes" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
