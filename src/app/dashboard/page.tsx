"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArrowUpRight, ArrowDownRight, DollarSign, Plus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TransactionModal } from "@/components/TransactionModal";

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/transactions");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar dados", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const incomes = transactions.filter((t: any) => t.type === "INCOME").reduce((acc, t: any) => acc + t.amount, 0);
  const expenses = transactions.filter((t: any) => t.type === "EXPENSE").reduce((acc, t: any) => acc + t.amount, 0);
  const balance = incomes - expenses;

  const chartData = [...transactions].reverse().map((t: any) => ({
    name: new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    valor: t.type === "INCOME" ? t.amount : -t.amount
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
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '350px' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Evolução do Saldo</h3>
          <div style={{ width: '100%', height: '250px' }}>
            {loading ? (
              <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <Loader2 className="spin" size={32} color="var(--accent-primary)" />
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                Adicione transações para ver o gráfico
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }} />
                  <Line type="monotone" dataKey="valor" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-primary)' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '350px' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Transações Recentes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <p className="text-muted text-center">Carregando...</p>
            ) : transactions.length === 0 ? (
              <p className="text-muted text-center">Nenhuma transação encontrada.</p>
            ) : (
              transactions.slice(0, 5).map((t: any) => (
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
