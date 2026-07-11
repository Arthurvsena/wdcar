import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench } from 'lucide-react';
import { getErrorMessage } from '../utils/errors';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao autenticar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-grafite-950 flex flex-col items-center justify-center p-5 transition-colors duration-200">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-laranja-600 rounded-2xl mb-4 shadow-lg shadow-laranja-600/30">
            <Wrench size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GiroCerto</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gestão de Oficinas</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Entrar</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 transition-colors"
              placeholder="Seu usuário"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 transition-colors"
              placeholder="Sua senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors text-sm active:scale-[0.98]"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="text-center">
            <Link to="/esqueci-senha" className="text-sm text-gray-500 dark:text-gray-400 hover:text-laranja-500 transition-colors">
              Esqueci minha senha
            </Link>
          </div>
        </form>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          © 2026 Criado e desenvolvido por Nexus Tech
        </p>
      </div>
    </div>
  );
}
