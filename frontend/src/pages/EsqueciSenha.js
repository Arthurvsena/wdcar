import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, MailCheck } from 'lucide-react';
import api from '../api';
import { getErrorMessage } from '../utils/errors';

export default function EsqueciSenha() {
  const [identificador, setIdentificador] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { identificador: identificador.trim() });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao solicitar recuperação'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-grafite-950 flex flex-col items-center justify-center p-5 transition-colors duration-200">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-laranja-600 rounded-2xl mb-4 shadow-lg shadow-laranja-600/30">
            <KeyRound size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recuperar senha</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">GiroCerto - Gestão de Oficinas</p>
        </div>

        <div className="bg-white dark:bg-grafite-900 border border-gray-200 dark:border-grafite-800 rounded-2xl p-6 md:p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500/15 rounded-full">
                <MailCheck size={28} className="text-green-500" />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Se o usuário informado tiver um email cadastrado, você receberá um link para redefinir a senha.
                Verifique também a caixa de spam.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-laranja-600 dark:text-laranja-400 hover:underline">
                <ArrowLeft size={16} />
                Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Informe o seu usuário ou o email cadastrado e enviaremos um link de recuperação.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Usuário ou email</label>
                <input
                  type="text"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-grafite-800 border border-gray-300 dark:border-grafite-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-laranja-500 transition-colors"
                  placeholder="Seu usuário ou email"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-laranja-600 hover:bg-laranja-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors text-sm active:scale-[0.98]"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>

              <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-laranja-500 transition-colors">
                <ArrowLeft size={16} />
                Voltar ao login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
