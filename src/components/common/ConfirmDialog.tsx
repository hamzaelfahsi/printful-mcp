import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from './Button.js';
import { Modal } from './Modal.js';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  confirmVariant = 'danger',
  onConfirm,
  onClose
}) => {
  const isDanger = confirmVariant === 'danger';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="flex gap-4 items-start py-2">
        <div
          className={`p-3 rounded-xl shrink-0 ${
            isDanger ? 'bg-rose-950/60 text-rose-400 border border-rose-800/50' : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
          }`}
        >
          {isDanger ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
          <p className="text-xs text-slate-500 italic">
            Cette action sera tracée dans le journal d’audit de sécurité.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
        <Button variant="outline" size="sm" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant === 'warning' ? 'amber' : confirmVariant}
          size="sm"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};
