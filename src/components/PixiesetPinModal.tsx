import React, { useState } from 'react';
import { KeyRound, Lock, X } from 'lucide-react';

interface PixiesetPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  expectedPin: string;
  onSuccess: () => void;
}

export const PixiesetPinModal: React.FC<PixiesetPinModalProps> = ({
  isOpen,
  onClose,
  expectedPin,
  onSuccess,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === expectedPin.trim()) {
      setError(null);
      onSuccess();
    } else {
      setError('Invalid download PIN. Please check with your photographer.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-zinc-950">
            <Lock size={18} />
            <h3 className="font-serif text-lg font-medium">Download PIN Required</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-zinc-600">
          This gallery requires a 4-digit download PIN to retrieve high-resolution images. Enter the PIN provided by Paul Photography.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}

          <div className="relative">
            <KeyRound
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="password"
              maxLength={8}
              required
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter 4-digit PIN"
              className="w-full rounded-lg border border-zinc-300 py-2.5 pl-9 pr-3.5 text-center font-mono text-sm tracking-widest text-zinc-950 placeholder:tracking-normal focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-300 bg-white py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-zinc-950 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Unlock Downloads
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
