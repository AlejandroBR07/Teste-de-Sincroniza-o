
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDestructive = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
        <div className="p-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${isDestructive ? 'bg-red-100' : 'bg-blue-100'}`}>
            <i className={`fas ${isDestructive ? 'fa-exclamation-triangle text-red-600' : 'fa-info text-blue-600'} text-2xl`}></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition shadow-sm w-full"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-lg text-white font-bold focus:ring-2 focus:ring-offset-2 transition shadow-lg w-full ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-red-200' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 shadow-blue-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
