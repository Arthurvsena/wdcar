import React from 'react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg text-sm bg-gray-200 dark:bg-grafite-700 text-gray-900 dark:text-white disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-grafite-600"
      >
        Anterior
      </button>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg text-sm bg-gray-200 dark:bg-grafite-700 text-gray-900 dark:text-white disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-grafite-600"
      >
        Próximo
      </button>
    </div>
  );
}
