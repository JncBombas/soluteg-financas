"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState, useEffect } from "react";
import { CreditCard, Plus, Pencil, Trash2, Loader2, X } from "lucide-react";

interface InvoiceTransaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: string;
  paymentMethod: string;
  status: string;
  occurrenceNumber?: number | null;
  occurrenceTotal?: number | null;
  category: { name: string };
}

interface CreditCardData {
  id: string;
  name: string;
  brand: string;
  lastFourDigits: string | null;
  closingDay: number;
  dueDay: number;
  limit: number;
  color: string;
  isActive: boolean;
  currentInvoice: number;
  invoiceDueDate?: string;
  cycleStart?: string;
  cycleEnd?: string;
}

const BRANDS = [
  { value: "VISA", label: "Visa" },
  { value: "MASTERCARD", label: "Mastercard" },
  { value: "ELO", label: "Elo" },
  { value: "AMEX", label: "American Express" },
  { value: "HIPERCARD", label: "Hipercard" },
  { value: "OTHER", label: "Outra" },
];

const BRAND_COLORS: Record<string, string> = {
  VISA: "#1A1F71",
  MASTERCARD: "#252525",
  ELO: "#00A4E0",
  AMEX: "#006FCF",
  HIPERCARD: "#B22222",
  OTHER: "#C9A96E"
};

const PALETTE = [
  "#1A1F71","#252525","#00A4E0","#006FCF","#B22222",
  "#1a7a4a","#7B2D8B","#C9A96E","#2C3E50","#E74C3C"
];

const initialForm = {
  name: "", brand: "VISA", lastFourDigits: "", closingDay: "",
  dueDay: "", limit: "", color: "#1A1F71"
};

export default function CardsPage() {
  const [cards, setCards] = useState<CreditCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardData | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [invoiceTransactions, setInvoiceTransactions] = useState<Record<string, InvoiceTransaction[]>>({});
  const [loadingInvoice, setLoadingInvoice] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await fetch("/api/credit-cards");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar cartões", err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (card: CreditCardData) => {
    setForm({
      name: card.name,
      brand: card.brand,
      lastFourDigits: card.lastFourDigits || "",
      closingDay: card.closingDay.toString(),
      dueDay: card.dueDay.toString(),
      limit: card.limit.toString(),
      color: card.color || BRAND_COLORS[card.brand] || PALETTE[0]
    });
    setEditingCard(card);
    setShowForm(true);
    setError(null);
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingCard(null);
    setShowForm(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = editingCard ? `/api/credit-cards/${editingCard.id}` : "/api/credit-cards";
      const method = editingCard ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          closingDay: parseInt(form.closingDay),
          dueDay: parseInt(form.dueDay),
          limit: parseFloat(form.limit.replace(',', '.'))
        }),
      });
      
      if (res.ok) {
        resetForm();
        fetchCards();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao salvar cartão.");
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
      const res = await fetch(`/api/credit-cards/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDeleteId(null);
        fetchCards();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao excluir cartão.");
        setConfirmDeleteId(null);
      }
    } catch (err) {
      setError("Erro interno do sistema.");
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleInvoice = async (cardId: string) => {
    if (expandedCardId === cardId) {
      setExpandedCardId(null);
      return;
    }
    setExpandedCardId(cardId);
    
    if (invoiceTransactions[cardId]) {
      return;
    }
    
    setLoadingInvoice(prev => ({ ...prev, [cardId]: true }));
    try {
      const res = await fetch(`/api/credit-cards/${cardId}`);
      if (res.ok) {
        const data = await res.json();
        setInvoiceTransactions(prev => ({ ...prev, [cardId]: data.invoiceTransactions || [] }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvoice(prev => ({ ...prev, [cardId]: false }));
    }
  };

  const renderCardVisual = (card: CreditCardData) => {
    const brandLabel = BRANDS.find(b => b.value === card.brand)?.label || card.brand;
    const bgColor = card.color || BRAND_COLORS[card.brand] || PALETTE[0];
    
    return (
      <div style={{
        width: '280px', height: '170px', flexShrink: 0,
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}99)`,
        borderRadius: '16px', padding: '1.5rem',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        color: 'white', userSelect: 'none',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{card.name}</span>
          <span style={{ opacity: 0.8, fontSize: '0.85rem' }}>{brandLabel}</span>
        </div>
        <div>
          <span style={{ letterSpacing: '4px', fontSize: '1.1rem', fontFamily: 'monospace' }}>
            **** **** **** {card.lastFourDigits || "????"}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            Fecha dia {card.closingDay} · Vence dia {card.dueDay}
          </span>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout title="Cartões de Crédito">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Meus Cartões</h2>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={20} />
          Adicionar Cartão
        </button>
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
          <h3 style={{ marginBottom: '1.5rem' }}>{editingCard ? "Editar Cartão" : "Novo Cartão"}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <input 
              type="text" placeholder="Nome do cartão (ex: Nubank)" className="input-field"
              value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            />
            <select className="input-field" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}>
              {BRANDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <input 
              type="text" placeholder="Últimos 4 dígitos (0000)" className="input-field" maxLength={4}
              value={form.lastFourDigits} onChange={e => setForm({...form, lastFourDigits: e.target.value})}
            />
            <input 
              type="number" placeholder="Limite (R$)" className="input-field"
              value={form.limit} onChange={e => setForm({...form, limit: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <input 
              type="number" placeholder="Dia de fechamento (1-28)" className="input-field" min="1" max="28"
              value={form.closingDay} onChange={e => setForm({...form, closingDay: e.target.value})}
            />
            <input 
              type="number" placeholder="Dia de vencimento (1-28)" className="input-field" min="1" max="28"
              value={form.dueDay} onChange={e => setForm({...form, dueDay: e.target.value})}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Cor do Cartão:</label>
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

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={resetForm} disabled={saving}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
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
        ) : cards.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '3rem' }}>Nenhum cartão cadastrado.</p>
        ) : (
          cards.map(card => (
            <div key={card.id} className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                
                {renderCardVisual(card)}

                <div style={{ flex: 1, minWidth: '300px' }}>
                  <p className="text-muted" style={{ marginBottom: '0.2rem' }}>Fatura Atual</p>
                  <p style={{ 
                    fontSize: '2rem', fontWeight: 'bold', 
                    color: card.currentInvoice > 0 ? 'var(--danger)' : 'var(--success)' 
                  }}>
                    R$ {card.currentInvoice.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                  </p>
                  
                  <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <p>Vencimento da fatura: <strong style={{color:'var(--text-primary)'}}>{new Date(card.invoiceDueDate || '').toLocaleDateString('pt-BR')}</strong></p>
                    <p>Fechamento: <strong style={{color:'var(--text-primary)'}}>{card.cycleEnd ? new Date(card.cycleEnd).toLocaleDateString('pt-BR') : `Dia ${card.closingDay}`}</strong></p>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                      <span className="text-muted">Limite utilizado</span>
                      <span>R$ {card.currentInvoice.toLocaleString('pt-BR', {minimumFractionDigits:2})} de R$ {card.limit.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        background: (card.currentInvoice / card.limit) >= 0.8 ? 'var(--danger)' : 'var(--accent-primary)',
                        width: `${Math.min((card.currentInvoice / card.limit) * 100, 100)}%`
                      }} />
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => toggleInvoice(card.id)}>
                      {expandedCardId === card.id ? "Ocultar Fatura" : "Ver Fatura"}
                    </button>
                    <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => startEdit(card)}>
                      <Pencil size={18} />
                    </button>
                    <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setConfirmDeleteId(card.id)} 
                            onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
                            onMouseOut={e => e.currentTarget.style.color = ''}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* TRANSAÇÕES DA FATURA */}
              {expandedCardId === card.id && (
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem' }}>Transações da Fatura Atual</h4>
                  
                  {loadingInvoice[card.id] ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                      <Loader2 className="spin" size={24} color="var(--accent-primary)" />
                    </div>
                  ) : invoiceTransactions[card.id]?.length === 0 || !invoiceTransactions[card.id] ? (
                    <p className="text-muted">Nenhuma transação nesta fatura.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                            <th style={{ padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Data</th>
                            <th style={{ padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Descrição</th>
                            <th style={{ padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Categoria</th>
                            <th style={{ padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Parcela</th>
                            <th style={{ padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 'normal', textAlign: 'right' }}>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceTransactions[card.id].map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.5rem', fontSize: '0.9rem' }}>{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                              <td style={{ padding: '0.5rem' }}>{t.description}</td>
                              <td style={{ padding: '0.5rem' }}>
                                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                  {t.category?.name || 'Geral'}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {t.occurrenceNumber ? `${t.occurrenceNumber}/${t.occurrenceTotal || '?'}` : '-'}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--danger)', fontWeight: 'bold' }}>
                                - R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
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
            <h3 style={{ marginBottom: '1rem' }}>Excluir Cartão?</h3>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              Tem certeza que deseja excluir este cartão de crédito? Esta ação não poderá ser desfeita.
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
    </DashboardLayout>
  );
}
