import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { DollarSign, Wrench, Package, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function HealthReport() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/health').then(({ data }) => setHealth(data)).catch(() => {
      setError('Erro ao carregar relatório');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500 dark:text-gray-400 text-sm">
        Carregando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-400 text-sm">
        {error}
      </div>
    );
  }

  const getFinanceiroStatus = () => {
    const saldo = health?.financeiro?.saldo ?? 0;
    if (saldo >= 0) {
      return { color: 'border-green-500', bg: 'bg-green-500/10', icon: CheckCircle, textColor: 'text-green-400', label: 'Bom', trend: '🟢' };
    }
    return { color: 'border-red-500', bg: 'bg-red-500/10', icon: AlertTriangle, textColor: 'text-red-400', label: 'Crítico', trend: '🔴' };
  };

  const getOficinaStatus = () => {
    const abertas = health?.oficina?.os_abertas ?? 0;
    const finalizadas = health?.oficina?.os_finalizadas ?? 0;
    if (abertas > finalizadas) {
      return { color: 'border-yellow-500', bg: 'bg-yellow-500/10', icon: Clock, textColor: 'text-yellow-400', label: 'Atenção', trend: '🟡' };
    }
    return { color: 'border-green-500', bg: 'bg-green-500/10', icon: CheckCircle, textColor: 'text-green-400', label: 'Bom', trend: '🟢' };
  };

  const getEstoqueStatus = () => {
    const abaixo = health?.estoque?.pecas_abaixo_minimo ?? 0;
    if (abaixo > 0) {
      return { color: 'border-red-500', bg: 'bg-red-500/10', icon: AlertTriangle, textColor: 'text-red-400', label: 'Crítico', trend: '🔴' };
    }
    return { color: 'border-green-500', bg: 'bg-green-500/10', icon: CheckCircle, textColor: 'text-green-400', label: 'Bom', trend: '🟢' };
  };

  const financeiro = getFinanceiroStatus();
  const oficina = getOficinaStatus();
  const estoque = getEstoqueStatus();

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Saúde da Oficina</h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Visão geral do estado da oficina</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`bg-white dark:bg-grafite-900 border-2 ${financeiro.color} rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${financeiro.bg} rounded-xl flex items-center justify-center`}>
              <DollarSign size={24} className={financeiro.textColor} />
            </div>
            <span className="text-2xl">{financeiro.trend}</span>
          </div>
          <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Financeiro</h3>
          <p className={`text-sm font-medium ${financeiro.textColor} mt-1`}>{financeiro.label}</p>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-grafite-800">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Entradas</span>
              <span className="text-green-400 font-medium">R$ {(health?.financeiro?.total_entradas ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500 dark:text-gray-400">Saídas</span>
              <span className="text-red-400 font-medium">R$ {(health?.financeiro?.total_saidas ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500 dark:text-gray-400">Saldo</span>
              <span className={`font-bold ${(health?.financeiro?.saldo ?? 0) >= 0 ? 'text-laranja-600 dark:text-laranja-400' : 'text-red-400'}`}>
                R$ {(health?.financeiro?.saldo ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className={`bg-white dark:bg-grafite-900 border-2 ${oficina.color} rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${oficina.bg} rounded-xl flex items-center justify-center`}>
              <Wrench size={24} className={oficina.textColor} />
            </div>
            <span className="text-2xl">{oficina.trend}</span>
          </div>
          <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Oficina</h3>
          <p className={`text-sm font-medium ${oficina.textColor} mt-1`}>{oficina.label}</p>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-grafite-800">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Abertas</span>
              <span className="text-laranja-400 font-medium">{health?.oficina?.os_abertas ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500 dark:text-gray-400">Finalizadas</span>
              <span className="text-green-400 font-medium">{health?.oficina?.os_finalizadas ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500 dark:text-gray-400">Em espera</span>
              <span className="text-orange-400 font-medium">{health?.oficina?.os_espera ?? 0}</span>
            </div>
          </div>
        </div>

        <div className={`bg-white dark:bg-grafite-900 border-2 ${estoque.color} rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${estoque.bg} rounded-xl flex items-center justify-center`}>
              <Package size={24} className={estoque.textColor} />
            </div>
            <span className="text-2xl">{estoque.trend}</span>
          </div>
          <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Estoque</h3>
          <p className={`text-sm font-medium ${estoque.textColor} mt-1`}>{estoque.label}</p>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-grafite-800">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total peças</span>
              <span className="text-purple-400 font-medium">{health?.estoque?.total_pecas ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500 dark:text-gray-400">Abaixo mínimo</span>
              <span className={`font-medium ${(health?.estoque?.pecas_abaixo_minimo ?? 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {health?.estoque?.pecas_abaixo_minimo ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500 dark:text-gray-400">Sem estoque</span>
              <span className="text-red-400 font-medium">{health?.estoque?.pecas_sem_estoque ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-xl p-4">
        <h3 className="text-gray-900 dark:text-white font-semibold text-sm mb-3">Resumo Geral</h3>
        <div className="flex items-center gap-3">
          <span className="text-3xl">
            {financeiro.trend === '🟢' && oficina.trend === '🟢' && estoque.trend === '🟢' ? '🟢' :
             (financeiro.trend === '🔴' || oficina.trend === '🔴' || estoque.trend === '🔴') ? '🔴' : '🟡'}
          </span>
          <div>
            <p className="text-gray-900 dark:text-white font-medium">
              {financeiro.trend === '🟢' && oficina.trend === '🟢' && estoque.trend === '🟢' ? 'Oficina saudável' :
               (financeiro.trend === '🔴' || oficina.trend === '🔴' || estoque.trend === '🔴') ? 'Atenção necessária' : 'Possíveis melhorias'}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              {(health?.estoque?.pecas_abaixo_minimo ?? 0) > 0 && `${health.estoque.pecas_abaixo_minimo} peça(s) abaixo do mínimo`}
              {(health?.financeiro?.saldo ?? 0) < 0 && ` • Saldo negativo: R$ ${Math.abs(health.financeiro.saldo).toFixed(2)}`}
            </p>
          </div>
          <Link
            to="/pecas"
            className="ml-auto text-xs text-laranja-600 dark:text-laranja-400 hover:text-laranja-500"
          >
            Ver peças →
          </Link>
        </div>
      </div>
    </div>
  );
}