"use client";
import { usePWAInstall } from "@/lib/usePWAInstall";
import { Download, X } from "lucide-react";
import { useState } from "react";

export function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '1rem',
      right: '1rem',
      zIndex: 300,
      background: 'var(--bg-secondary)',
      border: '1px solid var(--accent-primary)',
      borderRadius: '12px',
      padding: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: '0 4px 24px rgba(201, 169, 110, 0.2)',
      backdropFilter: 'blur(12px)'
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        overflow: 'hidden', flexShrink: 0
      }}>
        <img src="/icons/icon-72x72.png" alt="Soluteg Finanças" style={{ width: '100%', height: '100%' }} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Instalar Soluteg Finanças</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Adicione à tela inicial para acesso rápido
        </div>
      </div>

      <button
        onClick={install}
        className="btn-primary"
        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', flexShrink: 0 }}
      >
        <Download size={16} />
        Instalar
      </button>

      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }}
      >
        <X size={18} />
      </button>
    </div>
  );
}
