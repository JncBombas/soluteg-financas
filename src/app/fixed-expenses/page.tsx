"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RecurringExpenseModal } from "@/components/RecurringExpenseModal";
import { useFinanceContext } from "@/lib/useFinanceContext";
import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, X, CalendarClock } from "lucide-react";

const METHOD_LABELS: Record<string, string> = {
  CASH: "💵 Dinheiro", DEBIT: "💳 Débito", CREDIT: "🏦 Crédito",
  PIX: "⚡ Pix", BOLETO: "🎫 Boleto", TRANSFER: "↔️ TED",
};
const FREQ_LABELS: Record<string, string> = { MONTHLY: "Mensal", WEEKLY: "Semanal", YEARLY: "Anual" };

export default function FixedExpensesPage() {
  const { context: globalContext } = useFinanceContext();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<any | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/recurring-expenses?context=${globalContext}`);
      if (res.status === 401) { window.location.href = "/login"; return; }
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar despesas fixas", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, [globalContext]);

  const openNew = () => { setEditExpense(null); setIsModalOpen(true); };
  const openEdit = (exp: any) => { setEditExpense(exp); setIsModalOpen(true); };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/recurring-expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDeleteId(null);
        fetchExpenses();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao excluir despesa fixa.");
        setConfirmDeleteId(null);
      }
    } catch {
      setError("Erro interno do sistema.");
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout title="Despesas Fixas">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Despesas Recorrentes</h3>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={20} /> Nova Despesa Fixa
        </button>
      </div>

      <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        As despesas fixas geram lançamentos automaticamente conforme o vencimento se aproxima (≈30 dias antes) e
        avisam você 3 dias antes e no dia do vencimento.
      </p>

      {error && (
        <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--danger)' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 className="spin" size={32} color="var(--accent-primary)" />
          </div>
        ) : expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
            <CalendarClock size={40} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
            <p>Nenhuma despesa fixa cadastrada.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {expenses.map(exp => (
              <div key={exp.id} className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', opacity: exp.isActive ? 1 : 0.55 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{exp.description}</span>
                    {exp.isVariable && (
                      <span style={{ background: 'rgba(255,165,0,0.12)', color: 'var(--warning)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem' }}>Variável</span>
                    )}
                    {!exp.isActive && (
                      <span style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem' }}>Inativa</span>
                    )}
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem' }}>{exp.context}</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {FREQ_LABELS[exp.frequency] || exp.frequency} · vence dia {exp.dueDay} · {METHOD_LABELS[exp.paymentMethod] || exp.paymentMethod}
                    {exp.category?.name ? ` · ${exp.category.name}` : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <p style={{ fontWeight: 'bold', color: 'var(--danger)' }}>
                    {exp.isVariable ? '~ ' : ''}R$ {Number(exp.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="action-edit" onClick={() => openEdit(exp)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.4rem' }}>
                    <Pencil size={18} />
                  </button>
                  <button className="action-delete" onClick={() => setConfirmDeleteId(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.4rem' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .action-edit:hover { color: var(--accent-primary) !important; }
        .action-delete:hover { color: var(--danger) !important; }
      `}</style>

      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <Trash2 size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '1rem' }}>Excluir Despesa Fixa?</h3>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              Os lançamentos previstos (ainda não pagos) serão removidos. O histórico já pago é mantido.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDeleteId(null)} disabled={deletingId === confirmDeleteId}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--danger)', boxShadow: '0 0 20px rgba(255, 71, 87, 0.3)' }}
                onClick={() => handleDelete(confirmDeleteId)} disabled={deletingId === confirmDeleteId}>
                {deletingId === confirmDeleteId ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      <RecurringExpenseModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditExpense(null); }}
        onSuccess={() => fetchExpenses()}
        editExpense={editExpense}
      />
    </DashboardLayout>
  );
}
