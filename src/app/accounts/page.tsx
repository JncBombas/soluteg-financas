"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Wallet } from "lucide-react";
import { useFinanceContext } from "@/lib/useFinanceContext";
import { TransferModal } from "@/components/TransferModal";

interface BankAccountData {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  color: string;
  icon?: string;
  isActive: boolean;
  currentBalance: number;
  context: string;
  servicePackageName?: string | null;
  servicePackageAmount?: number | string | null;
  overdraftLimit?: number | string | null;
}

const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Conta Corrente", icon: "🏦" },
  { value: "SAVINGS", label: "Poupança", icon: "🐷" },
  { value: "DIGITAL", label: "Conta Digital", icon: "📱" },
  { value: "INVESTMENT", label: "Investimentos", icon: "📈" },
];

const PALETTE = [
  "#1A1F71","#252525","#00A4E0","#006FCF","#B22222",
  "#1a7a4a","#7B2D8B","#C9A96E","#2C3E50","#E74C3C"
];

const initialForm = {
  name: "", type: "CHECKING", initialBalance: "0", color: "#1a7a4a", context: "PF",
  servicePackageName: "", servicePackageAmount: "", overdraftLimit: ""
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<BankAccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountData | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const { context: globalContext } = useFinanceContext();

  useEffect(() => {
    fetchAccounts();
  }, [globalContext]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`/api/bank-accounts?context=${globalContext}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar contas", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({...initialForm, context: globalContext === "ALL" ? "PF" : globalContext});
    setEditingAccount(null);
    setShowForm(false);
    setError(null);
  };

  const startEdit = (account: BankAccountData) => {
    setForm({
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance.toString(),
      color: account.color || PALETTE[5],
      context: account.context || "PF",
      servicePackageName: account.servicePackageName || "",
      servicePackageAmount: account.servicePackageAmount ? account.servicePackageAmount.toString() : "",
      overdraftLimit: account.overdraftLimit ? account.overdraftLimit.toString() : ""
    });
    setEditingAccount(account);
    setShowForm(true);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = editingAccount ? `/api/bank-accounts/${editingAccount.id}` : "/api/bank-accounts";
      const method = editingAccount ? "PUT" : "POST";
      
      const payload: any = {
        name: form.name,
        type: form.type,
        initialBalance: parseFloat(form.initialBalance.replace(',', '.')),
        color: form.color,
        context: form.context
      };

      if (form.servicePackageName) {
        payload.servicePackageName = form.servicePackageName;
        payload.servicePackageAmount = form.servicePackageAmount ? parseFloat(form.servicePackageAmount.replace(',', '.')) : 0;
      }
      if (form.overdraftLimit) {
        payload.overdraftLimit = parseFloat(form.overdraftLimit.replace(',', '.'));
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        resetForm();
        fetchAccounts();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao salvar conta bancária.");
      }
    } catch (err) {
      setError("Erro interno do sistema.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDeleteId(null);
        fetchAccounts();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao excluir conta.");
        setConfirmDeleteId(null);
      }
    } catch (err) {
      setError("Erro interno do sistema.");
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const totalPatrimony = accounts.reduce((acc, account) => acc + (account.currentBalance || 0), 0);
  const patrimonyColor = totalPatrimony > 0 ? "var(--success)" : totalPatrimony < 0 ? "var(--danger)" : "var(--accent-primary)";

  return (
    <DashboardLayout title="Contas Bancárias">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Minhas Contas</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" onClick={() => setIsTransferOpen(true)}>
            ↔️ Transferir
          </button>
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={20} />
            Adicionar Conta
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '2rem', textAlign: 'center' }}>
        <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Patrimônio Total</p>
        <h2 style={{ fontSize: '3rem', fontWeight: 'bold', color: patrimonyColor, marginBottom: '0.5rem' }}>
          R$ {totalPatrimony.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </h2>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>
          {accounts.length} conta(s) cadastrada(s)
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--danger)' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
      )}

      {showForm && (
        <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>{editingAccount ? "Editar Conta" : "Nova Conta"}</h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Perfil:</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name="accContext" value="PF" checked={form.context === "PF"} onChange={e => setForm({...form, context: e.target.value})} style={{ accentColor: 'var(--accent-primary)' }} />
                Pessoal (PF)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name="accContext" value="PJ" checked={form.context === "PJ"} onChange={e => setForm({...form, context: e.target.value})} style={{ accentColor: 'var(--accent-primary)' }} />
                Empresarial (PJ)
              </label>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <input 
                type="text" placeholder="Nome da conta (ex: Nubank, Itaú...)" className="input-field"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            <div>
              <select className="input-field" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                {ACCOUNT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <input 
                type="number" step="0.01" placeholder="0,00" className="input-field"
                value={form.initialBalance} onChange={e => setForm({...form, initialBalance: e.target.value})}
              />
              <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem', lineHeight: 1.4 }}>
                Este é o saldo inicial da conta. O saldo atual é calculado automaticamente com base nas transações vinculadas.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Cor da Conta:</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {PALETTE.map(cor => (
                <div 
                  key={cor}
                  onClick={() => setForm({...form, color: cor})}
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%', background: cor,
                    cursor: 'pointer', border: form.color === cor ? '3px solid white' : '3px solid transparent',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Pacote de serviços (opcional)</label>
              <input type="text" placeholder="Ex: Conta Digital Nubank" className="input-field" value={form.servicePackageName} onChange={e => setForm({...form, servicePackageName: e.target.value})} />
            </div>
            {form.servicePackageName && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Custo mensal do pacote (R$)</label>
                <input type="number" min="0" step="0.01" placeholder="0,00" className="input-field" value={form.servicePackageAmount} onChange={e => setForm({...form, servicePackageAmount: e.target.value})} />
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Limite de cheque especial (R$)</label>
              <input type="number" min="0" step="0.01" placeholder="0,00" className="input-field" value={form.overdraftLimit} onChange={e => setForm({...form, overdraftLimit: e.target.value})} />
            </div>
          </div>

          <div className="modal-footer-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary" style={{ flex: '1 1 120px' }} onClick={resetForm} disabled={saving}>Cancelar</button>
            <button className="btn-primary" style={{ flex: '1 1 120px' }} onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      <div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 className="spin" size={32} color="var(--accent-primary)" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '3rem' }}>Nenhuma conta cadastrada.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {accounts.map(account => {
              const accType = ACCOUNT_TYPES.find(t => t.value === account.type) || ACCOUNT_TYPES[0];
              const balanceColor = account.currentBalance > 0 ? 'var(--success)' : account.currentBalance < 0 ? 'var(--danger)' : 'var(--text-primary)';
              
              return (
                <div key={account.id} className="glass-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${account.color || PALETTE[5]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {accType.icon} {account.name}
                      </span>
                      <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>{accType.label}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => startEdit(account)}>
                        <Pencil size={16} />
                      </button>
                      <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setConfirmDeleteId(account.id)}
                              onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
                              onMouseOut={e => e.currentTarget.style.color = ''}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div style={{ borderBottom: '1px solid var(--border-glass)', margin: '1rem 0' }} />

                  <div>
                    <span className="text-muted" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem' }}>Saldo Atual</span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.8rem', color: balanceColor }}>
                      R$ {account.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    
                    {account.servicePackageName && (
                      <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.25rem'}}>
                        📦 {account.servicePackageName}
                        {Number(account.servicePackageAmount) > 0 ? ` — R$ ${Number(account.servicePackageAmount).toLocaleString('pt-BR',{minimumFractionDigits:2})}/mês` : ''}
                      </p>
                    )}

                    {Number(account.overdraftLimit) > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        {account.currentBalance >= 0 ? (
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>Cheque especial: R$ {Number(account.overdraftLimit).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                        ) : Math.abs(account.currentBalance) <= Number(account.overdraftLimit) ? (
                          <span style={{ background: '#F59E0B', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>✓ No limite</span>
                        ) : (
                          <span style={{ background: 'var(--danger)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>⚠️ Acima do limite</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '1rem', fontSize: '0.8rem' }} className="text-muted">
                    Saldo inicial: R$ {account.initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <Trash2 size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '1rem' }}>Excluir Conta?</h3>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              Tem certeza que deseja excluir esta conta bancária? Esta ação não poderá ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDeleteId(null)} disabled={deletingId === confirmDeleteId}>
                Cancelar
              </button>
              <button className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--danger)', boxShadow: '0 0 20px rgba(255, 71, 87, 0.3)' }} 
                      onClick={() => handleDelete(confirmDeleteId)} disabled={deletingId === confirmDeleteId}>
                {deletingId === confirmDeleteId ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={() => fetchAccounts()}
      />
    </DashboardLayout>
  );
}
