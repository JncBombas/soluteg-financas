"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useFinanceContext } from "@/lib/useFinanceContext";

interface Category { id: string; name: string; type: string; group: string; }
interface BankAccount { id: string; name: string; type: string; }
interface CreditCard { id: string; name: string; brand: string; lastFourDigits: string | null; }

interface RecurringTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editExpense?: any | null;
}

const PAYMENT_METHODS = [
  { value: "BOLETO", label: "Boleto", icon: "🎫" },
  { value: "PIX", label: "Pix", icon: "⚡" },
  { value: "DEBIT", label: "Débito", icon: "💳" },
  { value: "CREDIT", label: "Crédito", icon: "🏦" },
  { value: "CASH", label: "Dinheiro", icon: "💵" },
  { value: "TRANSFER", label: "Transferência", icon: "↔️" },
];

const FREQUENCIES = [
  { value: "MONTHLY", label: "Mensal" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "YEARLY", label: "Anual" },
];

export function RecurringTransactionModal({ isOpen, onClose, onSuccess, editExpense }: RecurringTransactionModalProps) {
  const { context: globalContext } = useFinanceContext();

  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const getToday = () => new Date().toISOString().split("T")[0];

  const [description, setDescription] = useState("");
  const [type, setType] = useState("EXPENSE");
  const [amount, setAmount] = useState("");
  const [isVariable, setIsVariable] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("BOLETO");
  const [dueDay, setDueDay] = useState("5");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [context, setContext] = useState("PF");
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [creditCardId, setCreditCardId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      Promise.all([
        fetch("/api/categories").then(res => res.json()),
        fetch("/api/bank-accounts").then(res => res.json()),
        fetch("/api/credit-cards").then(res => res.json()),
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
    if (editExpense) {
      setDescription(editExpense.description || "");
      setType(editExpense.type || "EXPENSE");
      setAmount(editExpense.amount?.toString() || "");
      setIsVariable(!!editExpense.isVariable);
      setPaymentMethod(editExpense.paymentMethod || "BOLETO");
      setDueDay(editExpense.dueDay?.toString() || "5");
      setFrequency(editExpense.frequency || "MONTHLY");
      setStartDate(editExpense.startDate ? editExpense.startDate.split("T")[0] : getToday());
      setEndDate(editExpense.endDate ? editExpense.endDate.split("T")[0] : "");
      setIsActive(editExpense.isActive ?? true);
      setContext(editExpense.context || "PF");
      setCategoryId(editExpense.categoryId || "");
      setBankAccountId(editExpense.bankAccountId || "");
      setCreditCardId(editExpense.creditCardId || "");
    } else {
      setDescription("");
      setType("EXPENSE");
      setAmount("");
      setIsVariable(false);
      setPaymentMethod("BOLETO");
      setDueDay("5");
      setFrequency("MONTHLY");
      setStartDate(getToday());
      setEndDate("");
      setIsActive(true);
      setContext(globalContext === "ALL" ? "PF" : globalContext);
      setCategoryId("");
      setBankAccountId("");
      setCreditCardId("");
    }
    setError(null);
  }, [editExpense, isOpen, globalContext]);

  const isEditMode = editExpense != null;
  const showCreditCard = paymentMethod === "CREDIT";
  const categoryOptions = categories.filter(c => c.type === type);
  const grupos = Array.from(new Set(categoryOptions.map(c => c.group)));

  useEffect(() => {
    if (showCreditCard) setBankAccountId("");
    else setCreditCardId("");
  }, [showCreditCard]);

  const handleSubmit = async () => {
    if (!description || !amount || !dueDay || !startDate) {
      setError("Preencha os campos obrigatórios (Descrição, Valor, Dia de vencimento, Início).");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        description,
        amount: parseFloat(amount.replace(",", ".")),
        type,
        isVariable,
        paymentMethod,
        dueDay: parseInt(dueDay),
        frequency,
        startDate,
        endDate: endDate || null,
        isActive,
        context,
        categoryId: categoryId || null,
        bankAccountId: showCreditCard ? null : (bankAccountId || null),
        creditCardId: showCreditCard ? (creditCardId || null) : null,
      };

      const url = isEditMode ? `/api/recurring-transactions/${editExpense.id}` : "/api/recurring-transactions";
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
        setError(data.error || "Erro ao salvar transação fixa.");
      }
    } catch {
      setError("Erro interno do sistema.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const labelStyle = { display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' } as const;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0,
    }}>
      <div className="glass-card" style={{
        width: '100%', maxWidth: '560px', maxHeight: '92vh', overflowY: 'auto',
        padding: '1.5rem', borderRadius: '20px 20px 0 0', margin: '0 auto',
      }}>
        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 1rem auto' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>{isEditMode ? "Editar Transação Fixa" : "Nova Transação Fixa"}</h3>
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

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Perfil:</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="reContext" value="PF" checked={context === "PF"} onChange={e => setContext(e.target.value)} style={{ accentColor: 'var(--accent-primary)' }} />
              Pessoal (PF)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="reContext" value="PJ" checked={context === "PJ"} onChange={e => setContext(e.target.value)} style={{ accentColor: 'var(--accent-primary)' }} />
              Empresarial (PJ)
            </label>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Tipo*</label>
            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
              <button onClick={() => setType("EXPENSE")} className={type === "EXPENSE" ? "btn-primary" : ""}
                style={{ flex: 1, padding: '0.5rem', background: type === "EXPENSE" ? 'var(--danger)' : 'transparent', color: type === "EXPENSE" ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>
                Despesa
              </button>
              <button onClick={() => setType("INCOME")} className={type === "INCOME" ? "btn-primary" : ""}
                style={{ flex: 1, padding: '0.5rem', background: type === "INCOME" ? 'var(--success)' : 'transparent', color: type === "INCOME" ? 'var(--bg-primary)' : 'var(--text-primary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>
                Receita
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Descrição*</label>
            <input type="text" placeholder="Ex: Aluguel, Internet..." className="input-field" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>{isVariable ? "Valor estimado (R$)*" : "Valor (R$)*"}</label>
            <input type="number" step="0.01" placeholder="0,00" className="input-field" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Dia do Vencimento*</label>
            <input type="number" min="1" max="28" placeholder="Ex: 5" className="input-field" value={dueDay} onChange={e => setDueDay(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Frequência</label>
            <select className="input-field" value={frequency} onChange={e => setFrequency(e.target.value)}>
              {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Início*</label>
            <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Fim (opcional)</label>
            <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Categoria</label>
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
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Método de Pagamento</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.value} onClick={() => setPaymentMethod(pm.value)}
                style={{
                  padding: '0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: 'pointer', border: 'none',
                  background: paymentMethod === pm.value ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                  color: paymentMethod === pm.value ? 'var(--bg-primary)' : 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                <span>{pm.icon}</span> {pm.label}
              </button>
            ))}
          </div>
        </div>

        {showCreditCard ? (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Cartão de Crédito</label>
            <select className="input-field" value={creditCardId} onChange={e => setCreditCardId(e.target.value)}>
              <option value="">— Selecione um cartão —</option>
              {creditCards.map(c => <option key={c.id} value={c.id}>{c.name} ···{c.lastFourDigits}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Conta Bancária (opcional)</label>
            <select className="input-field" value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}>
              <option value="">— Sem vínculo —</option>
              {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={isVariable} onChange={e => setIsVariable(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
            Valor variável (ex.: luz, água) — pedirá revisão do valor antes do vencimento
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
            Ativa (gera lançamentos e alertas)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={saving || loadingData}>
            {saving ? "Salvando..." : isEditMode ? "Salvar" : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
