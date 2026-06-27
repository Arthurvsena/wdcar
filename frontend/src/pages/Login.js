import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [oficinaName, setOficinaName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password, oficinaName || 'Minha Oficina');
      } else {
        await login(username, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grafite-950 flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-laranja-600 rounded-2xl mb-4 shadow-lg shadow-laranja-600/30">
            <Wrench size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">WDOcar</h1>
          <p className="text-gray-400 text-sm mt-1">Gestão de Oficina Mecânica</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-grafite-900 border border-grafite-800 rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            {isRegister ? 'Criar Conta' : 'Entrar'}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-grafite-800 border border-grafite-700 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-laranja-500 transition-colors"
              placeholder="Seu usuário"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-grafite-800 border border-grafite-700 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-laranja-500 transition-colors"
              placeholder="Sua senha"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nome da Oficina</label>
              <input
                type="text"
                value={oficinaName}
                onChange={(e) => setOficinaName(e.target.value)}
                className="w-full bg-grafite-800 border border-grafite-700 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-laranja-500 transition-colors"
                placeholder="Minha Oficina"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors text-sm active:scale-[0.98]"
          >
            {loading ? 'Entrando...' : isRegister ? 'Criar Conta' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-xs text-gray-400 hover:text-laranja-400 transition-colors py-2"
          >
            {isRegister ? 'Já tem conta? Entre' : 'Não tem conta? Cadastre-se'}
          </button>
        </form>
      </div>
    </div>
  );
}
