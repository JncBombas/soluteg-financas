"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TransactionModal } from "@/components/TransactionModal";
import { useState, useEffect } from "react";
import { Loader2, Plus, Check, Pencil, Trash2, X } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
  PAID:      { label: "Pago",      color: "var(--success)", bg: "rgba(0,255,136,0.1)" },
  PENDING:   { label: "Pendente",  color: "var(--warning)", bg: "rgba(255,165,0,0.1)" },
  OVERDUE:   { label: "Vencido",   color: "var(--danger)",  bg: "rgba(255,71,87,0.1)" },
  CANCELLED: { label: "Cancelado", color: "var(--text-muted)", bg: "rgba(255,255,255,0.05)" }
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "💵 Dinheiro", DEBIT: "💳 Débito", CREDIT: "🏦 Crédito",
  PIX: "⚡ Pix", BOLETO: "🎫 Boleto", TRANSFER: "↔️ TED"
};

// Estado exibido derivado por data: pendentes futuros são "Previstos",
// pendentes no passado são "Vencidos", e no dia/futuro próximo "A vencer".
function getStatusDisplay(t: any): { label: string, color: string, bg: string } {
  if (t.status === "PENDING") {
    const due = new Date(t.dueDate ?? t.date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    if (dueDay.getTime() > today.getTime()) return { label: "Previsto", color: "#5b8def", bg: "rgba(91,141,239,0.12)" };
    if (dueDay.getTime() < today.getTime()) return STATUS_CONFIG.OVERDUE;
    return { label: "A vencer", color: "var(--warning)", bg: "rgba(255,165,0,0.1)" };
  }
  return STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
}

const hoje = new Date();
const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

export default function TransactionsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<any | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [togglingPayId, setTogglingPayId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState(primeiroDia);
  const [filterDateTo, setFilterDateTo] = useState(ultimoDia);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append("type", filterType);
      if (filterStatus) params.append("status", filterStatus);
      if (filterMethod) params.append("paymentMethod", filterMethod);
      if (filterDateFrom) params.append("dateFrom", filterDateFrom);
      if (filterDateTo) params.append("dateTo", filterDateTo);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar transações", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterType, filterStatus, filterMethod, filterDateFrom, filterDateTo]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const togglePaid = async (transaction: any) => {
    setTogglingPayId(transaction.id);
    const action = transaction.status === "PAID" ? "UNPAY" : "PAY";
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingPayId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDeleteId(null);
        fetchTransactions();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao excluir transação.");
        setConfirmDeleteId(null);
      }
    } catch (err) {
      setError("Erro interno do sistema.");
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (transaction: any) => {
    setEditTransaction(transaction);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditTransaction(null);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setFilterType("");
    setFilterStatus("");
    setFilterMethod("");
    setFilterDateFrom(primeiroDia);
    setFilterDateTo(ultimoDia);
  };

  const clearAllFilters = () => {
    setFilterType("");
    setFilterStatus("");
    setFilterMethod("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  return (
    <DashboardLayout title="Transações">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Histórico de Transações</h3>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={20} />
          Nova Transação
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

      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Período de:</label>
            <input type="date" className="input-field" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Até:</label>
            <input type="date" className="input-field" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Tipo:</label>
            <select className="input-field" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Todos</option>
              <option value="INCOME">Receitas</option>
              <option value="EXPENSE">Despesas</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Status:</label>
            <select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="OVERDUE">Vencido</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Método:</label>
            <select className="input-field" value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={clearFilters}>
            Mês Atual
          </button>
          <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', opacity: 0.7, borderColor: 'var(--border-glass)' }} onClick={clearAllFilters}>
            Limpar Tudo
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 className="spin" size={32} color="var(--accent-primary)" />
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {transactions.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
                Nenhuma transação encontrada.
              </p>
            ) : transactions.map(t => {
              const targetDateStr = t.dueDate ?? t.date;
              const dateObj = new Date(targetDateStr);
              const isOverdue = dateObj < new Date() && t.status === "PENDING";
              const statusConf = getStatusDisplay(t);

              return (
                <div key={t.id} className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t.category?.name || '—'}
                      </p>
                    </div>
                    <p style={{ fontWeight: 'bold', fontSize: '1.05rem', color: t.type === 'INCOME' ? 'var(--success)' : 'var(--danger)', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
                      {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                      📅 {dateObj.toLocaleDateString('pt-BR')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {METHOD_LABELS[t.paymentMethod] || t.paymentMethod}
                    </span>
                    {t.occurrenceNumber && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {t.occurrenceNumber}/{t.occurrenceTotal}
                      </span>
                    )}
                    <span style={{ background: statusConf.bg, color: statusConf.color, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem' }}>
                      {statusConf.label}
                    </span>
                    {t.isEstimated && (
                      <span style={{ background: 'rgba(255,165,0,0.12)', color: 'var(--warning)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem' }}>
                        Revisar valor
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.25rem', borderTop: '1px solid var(--border-glass)' }}>
                    <button disabled={togglingPayId === t.id} onClick={() => togglePaid(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }}
                      title={t.status === 'PAID' ? 'Desmarcar' : 'Marcar como pago'}>
                      <Check size={18} color={t.status === 'PAID' ? 'var(--success)' : 'var(--text-muted)'} />
                    </button>
                    <button onClick={() => openEdit(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', color: 'var(--text-muted)' }}>
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => setConfirmDeleteId(t.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', color: 'var(--text-muted)' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Vencimento</th>
                <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Descrição</th>
                <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Categoria</th>
                <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Método</th>
                <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Parcela</th>
                <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Status</th>
                <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Valor</th>
                <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              ) : (
                transactions.map(t => {
                  const targetDateStr = t.dueDate ?? t.date;
                  const dateObj = new Date(targetDateStr);
                  const isOverdue = dateObj < new Date() && t.status === "PENDING";
                  const statusConf = getStatusDisplay(t);

                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '0.8rem', color: isOverdue ? 'var(--danger)' : undefined }}>
                        {dateObj.toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '0.8rem', fontWeight: 500 }}>{t.description}</td>
                      <td style={{ padding: '0.8rem' }}>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                          {t.category?.name || "—"}
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem' }}>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', display: 'inline-block', marginBottom: (t.creditCard || t.bankAccount) ? '0.2rem' : '0' }}>
                          {METHOD_LABELS[t.paymentMethod] || t.paymentMethod}
                        </span>
                        {(t.creditCard || t.bankAccount) && (
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {t.creditCard?.name || t.bankAccount?.name}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.8rem', color: 'var(--text-muted)' }}>
                        {t.occurrenceNumber ? `${t.occurrenceNumber}/${t.occurrenceTotal}` : "—"}
                      </td>
                      <td style={{ padding: '0.8rem' }}>
                        <span style={{ background: statusConf.bg, color: statusConf.color, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.85rem' }}>
                          {statusConf.label}
                        </span>
                        {t.isEstimated && (
                          <span style={{ background: 'rgba(255,165,0,0.12)', color: 'var(--warning)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', marginLeft: '0.4rem' }}>
                            Revisar valor
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold', color: t.type === 'INCOME' ? 'var(--success)' : 'var(--danger)' }}>
                        {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                      </td>
                      <td style={{ padding: '0.8rem', textAlign: 'right' }}>
                        <button 
                          disabled={togglingPayId === t.id}
                          onClick={() => togglePaid(t)}
                          title={t.status === "PAID" ? "Desmarcar como pago" : "Marcar como pago"}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '0.5rem' }}
                        >
                          <Check size={18} color={t.status === "PAID" ? "var(--success)" : "var(--text-muted)"} />
                        </button>
                        <button 
                          className="action-edit"
                          onClick={() => openEdit(t)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '0.5rem', color: 'var(--text-muted)' }}
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          className="action-delete"
                          onClick={() => setConfirmDeleteId(t.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        tbody tr:hover { background: rgba(255,255,255,0.02); }
        .action-edit:hover { color: var(--accent-primary) !important; }
        .action-delete:hover { color: var(--danger) !important; }
      `}</style>

      {confirmDeleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <Trash2 size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '1rem' }}>Excluir Transação?</h3>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              Tem certeza que deseja excluir esta transação? Esta ação não poderá ser desfeita.
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

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditTransaction(null); }}
        onSuccess={() => fetchTransactions()}
        editTransaction={editTransaction}
      />
    </DashboardLayout>
  );
}
