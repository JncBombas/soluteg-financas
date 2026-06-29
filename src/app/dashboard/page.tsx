"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArrowUpRight, ArrowDownRight, DollarSign, Plus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TransactionModal } from "@/components/TransactionModal";
import { toLocalISOString } from "@/lib/businessDays";
import Link from "next/link";

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [monthTransactions, setMonthTransactions] = useState<any[]>([]);
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = hoje.getMonth();
      const primeiroDiaMes = toLocalISOString(new Date(anoAtual, mesAtual, 1));
      const ultimoDiaMes = toLocalISOString(new Date(anoAtual, mesAtual + 1, 0));

      const hojeStr = toLocalISOString(hoje);
      const hojeMais30 = new Date(hoje);
      hojeMais30.setDate(hoje.getDate() + 30);
      const hojeMais30Str = toLocalISOString(hojeMais30);

      const [resMonth, resProjection, resPending] = await Promise.all([
        fetch(`/api/transactions?dateFrom=${primeiroDiaMes}&dateTo=${ultimoDiaMes}`),
        fetch(`/api/projections?months=12`),
        fetch(`/api/transactions?status=PENDING&dateFrom=${hojeStr}&dateTo=${hojeMais30Str}`)
      ]);

      if (resMonth.status === 401) {
        window.location.href = "/login";
        return;
      }

      const [dataMonth, dataProjection, dataPending] = await Promise.all([
        resMonth.json(), resProjection.json(), resPending.json()
      ]);

      setMonthTransactions(Array.isArray(dataMonth) ? dataMonth : []);
      setProjectionData(Array.isArray(dataProjection?.data) ? dataProjection.data : []);
      
      const pendings = Array.isArray(dataPending) ? dataPending : [];
      pendings.sort((a: any, b: any) => new Date(a.dueDate || a.date).getTime() - new Date(b.dueDate || b.date).getTime());
      setPendingTransactions(pendings.slice(0, 5) as any);
    } catch (error) {
      console.error("Erro ao buscar dados", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculations — considera apenas transações realizadas (PAID),
  // mantendo o saldo coerente com o saldo das contas. Pendentes aparecem
  // no card "Próximos Vencimentos".
  const paidMonthTransactions = monthTransactions.filter((t: any) => t.status === "PAID");
  const incomes = paidMonthTransactions.filter((t: any) => t.type === "INCOME").reduce((acc, t: any) => acc + t.amount, 0);
  const expenses = paidMonthTransactions.filter((t: any) => t.type === "EXPENSE").reduce((acc, t: any) => acc + t.amount, 0);
  const balance = incomes - expenses;

  const hoje = new Date();
  const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Projeção consolidada (PF + PJ) dos próximos 12 meses.
  const chartData = projectionData.map((r: any) => ({
    mes: r.label,
    receitas: (r.PF?.income || 0) + (r.PJ?.income || 0),
    despesas: (r.PF?.expense || 0) + (r.PJ?.expense || 0),
  }));

  return (
    <DashboardLayout title="Dashboard">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          Nova Transação Rápida
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="text-muted">Saldo Atual</h3>
            <div style={{ background: 'rgba(201, 169, 110, 0.1)', padding: '0.5rem', borderRadius: '50%' }}>
              <DollarSign size={24} color="var(--accent-primary)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-muted" style={{fontSize:'0.8rem'}}>Este mês ({nomeMes})</p>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="text-muted">Receitas (Total)</h3>
            <div style={{ background: 'rgba(201, 169, 110, 0.1)', padding: '0.5rem', borderRadius: '50%' }}>
              <ArrowUpRight size={24} color="var(--success)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            R$ {incomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-muted" style={{fontSize:'0.8rem'}}>Este mês ({nomeMes})</p>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="text-muted">Despesas (Total)</h3>
            <div style={{ background: 'rgba(255, 71, 87, 0.1)', padding: '0.5rem', borderRadius: '50%' }}>
              <ArrowDownRight size={24} color="var(--danger)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-muted" style={{fontSize:'0.8rem'}}>Este mês ({nomeMes})</p>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="text-muted">Próximos Vencimentos</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pendingTransactions.length === 0 ? (
              <p className="text-muted" style={{fontSize: '0.8rem'}}>Nenhum vencimento nos próximos 30 dias</p>
            ) : (
              pendingTransactions.map((t: any) => {
                const targetDate = new Date(t.dueDate || t.date);
                const diffTime = targetDate.getTime() - hoje.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const dateColor = diffDays <= 3 ? 'var(--danger)' : 'var(--text-muted)';
                return (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.description}
                      {t.isEstimated && <span style={{ color: 'var(--warning)', fontSize: '0.72rem' }}> · revisar</span>}
                    </span>
                    <span style={{ fontWeight: 'bold', color: t.type === 'EXPENSE' ? 'var(--danger)' : 'var(--success)' }}>
                      R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                    </span>
                    <span style={{ color: dateColor }}>{targetDate.toLocaleDateString('pt-BR')}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '350px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Projeção de Fluxo — próximos 12 meses</h3>
            <Link href="/projections" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
              Ver projeções →
            </Link>
          </div>
          <div style={{ width: '100%', height: isMobile ? '200px' : '250px' }}>
            {loading ? (
              <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <Loader2 className="spin" size={32} color="var(--accent-primary)" />
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                Nenhum dado encontrado para o ano.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="mes" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }} />
                  <Legend />
                  <Bar dataKey="receitas" fill="var(--success)" name="Receitas" />
                  <Bar dataKey="despesas" fill="var(--danger)" name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '350px' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Transações Recentes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <p className="text-muted text-center">Carregando...</p>
            ) : monthTransactions.length === 0 ? (
              <p className="text-muted text-center">Nenhuma transação encontrada.</p>
            ) : (
              monthTransactions.slice(0, 5).map((t: any) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>
                  <div>
                    <p style={{ fontWeight: '500' }}>{t.description}</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <p style={{ color: t.type === 'INCOME' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                    {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchTransactions()}
        editTransaction={null}
      />
    </DashboardLayout>
  );
}
