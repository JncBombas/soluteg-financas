"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useFinanceContext } from "@/lib/useFinanceContext";

interface Category { id: string; name: string; type: string; group: string; }
interface BankAccount { id: string; name: string; type: string; }
interface CreditCard { id: string; name: string; brand: string; lastFourDigits: string | null; }

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTransaction?: any | null;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Dinheiro", icon: "💵" },
  { value: "DEBIT", label: "Débito", icon: "💳" },
  { value: "CREDIT", label: "Crédito", icon: "🏦" },
  { value: "PIX", label: "Pix", icon: "⚡" },
  { value: "BOLETO", label: "Boleto", icon: "🎫" },
  { value: "TRANSFER", label: "Transferência", icon: "↔️" },
];

const FREQUENCIES = [
  { value: "MONTHLY", label: "Mensal" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "YEARLY", label: "Anual" },
];

export function TransactionModal({ isOpen, onClose, onSuccess, editTransaction }: TransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const getToday = () => new Date().toISOString().split("T")[0];

  const { context: globalContext } = useFinanceContext();

  const [type, setType] = useState("EXPENSE");
  const [transactionMode, setTransactionMode] = useState("SINGLE");
  const [modalContext, setModalContext] = useState("PF");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(getToday());
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [creditCardId, setCreditCardId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [fee, setFee] = useState("");
  const [notes, setNotes] = useState("");
  const [installments, setInstallments] = useState("2");
  const [dueDay, setDueDay] = useState("");
  const [occurrences, setOccurrences] = useState("12");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [editScope, setEditScope] = useState("SINGLE");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      Promise.all([
        fetch("/api/categories").then(res => res.json()),
        fetch("/api/bank-accounts").then(res => res.json()),
        fetch("/api/credit-cards").then(res => res.json())
      ])
        .then(([cats, banks, cards]) => {
          setCategories(Array.isArray(cats) ? cats : []);
          setBankAccounts(Array.isArray(banks) ? banks : []);
          setCreditCards(Array.isArray(cards) ? cards : []);
        })
        .catch(err => console.error("Erro ao buscar dependências", err))
        .finally(() => setLoadingData(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (editTransaction) {
      setType(editTransaction.type);
      setAmount(editTransaction.amount.toString());
      setDescription(editTransaction.description);
      setCategoryId(editTransaction.categoryId || "");
      setDate(editTransaction.date.split("T")[0]);
      setPaymentMethod(editTransaction.paymentMethod || "CASH");
      setCreditCardId(editTransaction.creditCardId || "");
      setBankAccountId(editTransaction.bankAccountId || "");
      setFee(editTransaction.fee?.toString() || "");
      setNotes(editTransaction.notes || "");
      setTransactionMode("SINGLE");
      setEditScope("SINGLE");
      setModalContext(editTransaction.context || "PF");
    } else {
      setType("EXPENSE");
      setTransactionMode("SINGLE");
      setAmount("");
      setDescription("");
      setCategoryId("");
      setDate(getToday());
      setPaymentMethod("CASH");
      setCreditCardId("");
      setBankAccountId("");
      setFee("");
      setNotes("");
      setInstallments("2");
      setDueDay("");
      setOccurrences("12");
      setFrequency("MONTHLY");
      setEditScope("SINGLE");
      setModalContext(globalContext === "ALL" ? "PF" : globalContext);
    }
    setError(null);
  }, [editTransaction, isOpen, globalContext]);

  const isEditMode = editTransaction != null;
  const isGrouped = isEditMode && !!editTransaction?.transactionGroupId;

  const categoryOptions = categories.filter(c => c.type === type);
  const grupos = Array.from(new Set(categoryOptions.map(c => c.group)));

  const showCreditCard = paymentMethod === "CREDIT";
  const showBankAccount = !showCreditCard;
  const showFee = paymentMethod === "BOLETO" && type === "INCOME";
  const showInstallments = !isEditMode && transactionMode === "INSTALLMENT";
  const showDueDay = showInstallments && paymentMethod !== "CREDIT";
  const showRecurring = !isEditMode && transactionMode === "RECURRING";
  const showEditScope = isGrouped;

  // Auto-clear options that shouldn't persist across changes
  useEffect(() => {
    if (!showCreditCard) setCreditCardId("");
    if (!showBankAccount) setBankAccountId("");
  }, [showCreditCard, showBankAccount]);

  useEffect(() => {
    setCategoryId("");
  }, [type]);

  const handleSubmit = async () => {
    if (!amount || !description || !categoryId || !date) {
      setError("Preencha todos os campos obrigatórios (Valor, Descrição, Categoria, Data).");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        amount: parseFloat(amount.replace(',', '.')),
        description,
        type,
        paymentMethod,
        categoryId,
        context: modalContext,
        date: date + "T12:00:00.000Z",
        notes: notes || undefined,
      };

      if (fee) payload.fee = parseFloat(fee.replace(',', '.'));
      if (showCreditCard && creditCardId) payload.creditCardId = creditCardId;
      if (showBankAccount && bankAccountId) payload.bankAccountId = bankAccountId;

      if (!isEditMode) {
        payload.transactionMode = transactionMode;
        if (showInstallments) {
          payload.installments = parseInt(installments);
          if (dueDay) payload.dueDay = parseInt(dueDay);
        }
        if (showRecurring) {
          payload.occurrences = parseInt(occurrences);
          payload.frequency = frequency;
          if (dueDay) payload.dueDay = parseInt(dueDay);
        }
      } else if (isGrouped) {
        payload.editScope = editScope;
      }

      const url = isEditMode ? `/api/transactions/${editTransaction.id}` : "/api/transactions";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao salvar transação.");
      }
    } catch (err) {
      setError("Erro interno do sistema.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>{isEditMode ? "Editar Transação" : "Nova Transação"}</h3>
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

        {!isEditMode && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <button 
                className={type === "EXPENSE" ? "btn-primary" : "btn-secondary"} 
                style={{ flex: 1, backgroundColor: type === "EXPENSE" ? "var(--danger)" : undefined, boxShadow: type === "EXPENSE" ? "0 0 20px rgba(255, 71, 87, 0.3)" : undefined }}
                onClick={() => setType("EXPENSE")}
              >Despesa</button>
              <button 
                className={type === "INCOME" ? "btn-primary" : "btn-secondary"} 
                style={{ flex: 1 }}
                onClick={() => setType("INCOME")}
              >Receita</button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {["SINGLE", "INSTALLMENT", "RECURRING"].map((mode) => (
                <button 
                  key={mode}
                  onClick={() => setTransactionMode(mode)}
                  className={transactionMode === mode ? "" : "btn-secondary"}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', flex: 1,
                    background: transactionMode === mode ? 'var(--accent-primary)' : undefined,
                    color: transactionMode === mode ? 'var(--bg-primary)' : undefined,
                    border: transactionMode === mode ? 'none' : undefined,
                    cursor: 'pointer'
                  }}
                >
                  {mode === "SINGLE" ? "Simples" : mode === "INSTALLMENT" ? "Parcelado" : "Recorrente"}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Perfil:</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="modalContext" value="PF" checked={modalContext === "PF"} onChange={e => setModalContext(e.target.value)} style={{ accentColor: 'var(--accent-primary)' }} />
              Pessoal (PF)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="modalContext" value="PJ" checked={modalContext === "PJ"} onChange={e => setModalContext(e.target.value)} style={{ accentColor: 'var(--accent-primary)' }} />
              Empresarial (PJ)
            </label>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Valor (R$)*</label>
            <input type="number" step="0.01" placeholder="0,00" className="input-field" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Descrição*</label>
            <input type="text" placeholder="Ex: Mercado, Uber..." className="input-field" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Data*</label>
            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Categoria*</label>
            <select className="input-field" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">— Selecione —</option>
              {grupos.map(grupo => (
                <optgroup key={grupo} label={grupo}>
                  {categoryOptions.filter(c => c.group === grupo).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {categoryOptions.length === 0 && !loadingData && (
              <span style={{ display: 'block', marginTop: '0.2rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Nenhuma categoria encontrada.</span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Método de Pagamento</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {PAYMENT_METHODS.map(pm => (
              <button 
                key={pm.value} 
                onClick={() => setPaymentMethod(pm.value)}
                style={{
                  padding: '0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: 'pointer', border: 'none',
                  background: paymentMethod === pm.value ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                  color: paymentMethod === pm.value ? 'var(--bg-primary)' : 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <span>{pm.icon}</span> {pm.label}
              </button>
            ))}
          </div>
        </div>

        {showCreditCard && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cartão de Crédito</label>
            <select className="input-field" value={creditCardId} onChange={e => setCreditCardId(e.target.value)}>
              <option value="">— Selecione um cartão —</option>
              {creditCards.map(c => (
                <option key={c.id} value={c.id}>{c.name} ···{c.lastFourDigits}</option>
              ))}
            </select>
          </div>
        )}

        {showBankAccount && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Conta Bancária (opcional)</label>
            <select className="input-field" value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}>
              <option value="">— Sem vínculo —</option>
              {bankAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {showFee && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Taxa cobrada (R$)</label>
            <input type="number" step="0.01" placeholder="0,00" className="input-field" value={fee} onChange={e => setFee(e.target.value)} />
          </div>
        )}

        {showInstallments && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nº de Parcelas</label>
              <input type="number" min="2" max="72" className="input-field" value={installments} onChange={e => setInstallments(e.target.value)} />
            </div>
            {showDueDay && (
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Dia do Vencimento</label>
                <input type="number" min="1" max="28" placeholder="Ex: 5" className="input-field" value={dueDay} onChange={e => setDueDay(e.target.value)} />
              </div>
            )}
            {paymentMethod === "CREDIT" && (
              <div style={{ width: '100%', marginTop: '0.5rem' }}>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  O vencimento de cada parcela é calculado automaticamente pelo ciclo do cartão.
                </span>
              </div>
            )}
          </div>
        )}

        {showRecurring && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nº Ocorrências</label>
              <input type="number" min="1" max="120" className="input-field" value={occurrences} onChange={e => setOccurrences(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Frequência</label>
              <select className="input-field" value={frequency} onChange={e => setFrequency(e.target.value)}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Vencimento</label>
              <input type="number" min="1" max="28" placeholder="Dia" className="input-field" value={dueDay} onChange={e => setDueDay(e.target.value)} />
            </div>
          </div>
        )}

        {showEditScope && (
          <div className="glass-card" style={{ padding: '1rem', background: 'rgba(201,169,110,0.05)', border: '1px solid rgba(201,169,110,0.3)', marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Aplicar alteração a:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { value: "SINGLE", label: "Somente esta parcela" },
                { value: "THIS_AND_FOLLOWING", label: "Esta e as seguintes" },
                { value: "ALL", label: "Todas as parcelas" },
              ].map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="radio" 
                    name="editScope" 
                    value={opt.value} 
                    checked={editScope === opt.value} 
                    onChange={e => setEditScope(e.target.value)} 
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Observações (opcional)</label>
          <textarea className="input-field" rows={2} placeholder="Detalhes extras..." value={notes} onChange={e => setNotes(e.target.value)}></textarea>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={saving}>
            {saving ? "Salvando..." :
             isEditMode ? "Salvar Alteração" :
             transactionMode === "SINGLE" ? "Adicionar Transação" :
             transactionMode === "INSTALLMENT" ? "Criar Parcelamento" :
             "Criar Recorrência"}
          </button>
        </div>

      </div>
    </div>
  );
}
