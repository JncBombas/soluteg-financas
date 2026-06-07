"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

interface BankAccount {
  id: string;
  name: string;
  type: string;
  color?: string;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferModal({ isOpen, onClose, onSuccess }: TransferModalProps) {
  const getToday = () => new Date().toISOString().split("T")[0];

  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getToday());
  const [description, setDescription] = useState("Transferência");
  const [notes, setNotes] = useState("");

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      fetch("/api/bank-accounts")
        .then(res => res.json())
        .then(data => setBankAccounts(Array.isArray(data) ? data : []))
        .catch(err => console.error("Erro ao carregar contas", err))
        .finally(() => setLoadingData(false));
        
      setFromAccountId("");
      setToAccountId("");
      setAmount("");
      setDate(getToday());
      setDescription("Transferência");
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!fromAccountId || !toAccountId || !amount || !date || !description) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (fromAccountId === toAccountId) {
      setError("Conta de origem e destino não podem ser iguais.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        fromAccountId,
        toAccountId,
        amount: parseFloat(amount.replace(',', '.')),
        date: date + "T12:00:00.000Z",
        description,
        notes: notes || undefined
      };

      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao realizar transferência.");
      }
    } catch (err) {
      setError("Erro interno do sistema.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>↔️</span> Transferência entre Contas
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--danger)' }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        )}

        {loadingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 className="spin" size={32} color="var(--accent-primary)" />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Conta de Origem*</label>
              <select className="input-field" value={fromAccountId} onChange={e => setFromAccountId(e.target.value)}>
                <option value="">— Selecione a conta —</option>
                {bankAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Conta de Destino*</label>
              <select className="input-field" value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
                <option value="">— Selecione a conta —</option>
                {bankAccounts.filter(a => a.id !== fromAccountId).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Valor (R$)*</label>
                <input type="number" step="0.01" min="0.01" placeholder="0,00" className="input-field" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Data*</label>
                <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Descrição*</label>
              <input type="text" className="input-field" value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Observações (opcional)</label>
              <textarea className="input-field" rows={2} placeholder="Detalhes extras..." value={notes} onChange={e => setNotes(e.target.value)}></textarea>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={saving}>
                {saving ? "Transferindo..." : "Transferir"}
              </button>
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
