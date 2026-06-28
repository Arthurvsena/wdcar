import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-grafite-800 ${className}`}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
            {theme === 'dark' ? (
                <Sun size={20} className="text-gray-400 hover:text-yellow-400 transition-colors" />
            ) : (
                <Moon size={20} className="text-gray-600 hover:text-laranja-600 transition-colors" />
            )}
        </button>
    );
}