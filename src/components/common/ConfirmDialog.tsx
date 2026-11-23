import React from 'react';
import { AlertTriangle, Trash2, Check } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      icon: <Trash2 className="w-6 h-6 text-rose-600" />,
      btn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 shadow-md',
    },
    warning: {
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 shadow-md',
    },
    primary: {
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      icon: <Check className="w-6 h-6 text-blue-600" />,
      btn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 shadow-md',
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="flex flex-col items-center text-center">
        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${currentVariant.iconBg}`}>
          {currentVariant.icon}
        </div>
        <p className="text-sm text-slate-600 mb-6 max-w-sm leading-relaxed">{message}</p>
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-center"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full sm:w-auto px-4 py-2.5 text-sm font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${currentVariant.btn}`}
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
