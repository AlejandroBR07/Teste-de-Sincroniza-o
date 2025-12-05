
import React, { useEffect } from 'react';
import { Notification } from '../types';

interface ToastContainerProps {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {notifications.map((note) => (
        <Toast key={note.id} note={note} onClose={() => removeNotification(note.id)} />
      ))}
    </div>
  );
};

const Toast: React.FC<{ note: Notification; onClose: () => void }> = ({ note, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, note.duration || 4000);
    return () => clearTimeout(timer);
  }, [note, onClose]);

  const bgColors = {
    success: 'bg-emerald-600',
    error: 'bg-rose-600',
    info: 'bg-blue-600',
    warning: 'bg-amber-500',
  };

  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    info: 'fas fa-info-circle',
    warning: 'fas fa-exclamation-triangle',
  };

  return (
    <div className={`pointer-events-auto min-w-[300px] max-w-sm ${bgColors[note.type]} text-white p-4 rounded-lg shadow-xl shadow-gray-300/50 flex items-start gap-3 animate-slide-in transform transition-all duration-300`}>
      <i className={`${icons[note.type]} mt-1 text-lg`}></i>
      <div className="flex-1">
        <h4 className="font-bold text-sm">{note.title}</h4>
        <p className="text-xs opacity-90 mt-0.5 leading-tight">{note.message}</p>
      </div>
      <button onClick={onClose} className="text-white/60 hover:text-white transition">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};
