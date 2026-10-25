import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast.show) return null;

  return (
    <div className="toast-container" role="alert">
      <div className={`toast-bubble ${toast.type}`}>
        {toast.type === 'success' && <CheckCircle2 size={18} color="#219763" />}
        {toast.type === 'error' && <AlertCircle size={18} color="#df2145" />}
        {toast.type === 'info' && <Info size={18} color="#1267df" />}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
