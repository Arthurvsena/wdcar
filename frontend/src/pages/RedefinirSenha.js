import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { LockKeyhole, CheckCircle2 } from 'lucide-react';
import api from '../api';
import { getErrorMessage } from '../utils/errors';

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao redefinir a senha'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-grafite-950 flex flex-col items-center justify-center p-5 transition-colors duration-200">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-laranja-600 rounded-2xl mb-4 shadow-lg shadow-laranja-600/30">
            <LockKeyhole size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nova senha</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">GiroCerto - Gestão de Oficinas</p>
        </div>

        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-2xl p-6 md:p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500/15 rounded-full">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Senha redefinida com sucesso! Redirecionando para o login...
              </p>
              <Link to="/login" className="inline-block text-sm text-laranja-600 dark:text-laranja-400 hover:underline">
                Ir para o login agora
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Link inválido. Solicite uma nova recuperação de senha.
              </p>
              <Link to="/esqueci-senha" className="inline-block text-sm text-laranja-600 dark:text-laranja-400 hover:underline">
                Recuperar senha
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Nova senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 transition-colors"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 transition-colors"
                  placeholder="Repita a senha"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors text-sm active:scale-[0.98]"
              >
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
