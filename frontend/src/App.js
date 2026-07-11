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
import Perfil from './pages/Perfil';
import HealthReport from './pages/HealthReport';
import Mecanico from './pages/Mecanico';
import CashRegister from './pages/CashRegister';
import Fornecedores from './pages/Fornecedores';
import Compras from './pages/Compras';
import Garantia from './pages/Garantia';
import HistoricoVeiculo from './pages/HistoricoVeiculo';
import Relatorios from './pages/Relatorios';
import Setup from './pages/Setup';
import EsqueciSenha from './pages/EsqueciSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import DevPanel from './pages/DevPanel';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/orcamento/:token" element={<ClientView />} />
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <Setup />
          </ProtectedRoute>
        }
      />
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
                <Route path="/saude" element={<HealthReport />} />
                <Route path="/mecanico" element={<Mecanico />} />
                <Route path="/caixa" element={<CashRegister />} />
                <Route path="/fornecedores" element={<Fornecedores />} />
                <Route path="/compras" element={<Compras />} />
                <Route path="/garantia" element={<Garantia />} />
                <Route path="/historico" element={<HistoricoVeiculo />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/dev" element={<DevPanel />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route
                  path="/configuracoes"
                  element={
                    <ProtectedRoute allowedRoles={['master', 'admin']}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}