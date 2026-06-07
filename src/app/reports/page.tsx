"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2 } from "lucide-react";
import { 
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend 
} from 'recharts';

const CHART_COLORS = [
  '#C9A96E','#00ff88','#ff4757','#3742fa','#ffa502',
  '#00d2d3','#ff6b81','#a29bfe','#55efc4','#fdcb6e'
];

const METHOD_LABELS: Record<string, string> = {
  CASH:'Dinheiro', DEBIT:'Débito', CREDIT:'Crédito',
  PIX:'Pix', BOLETO:'Boleto', TRANSFER:'Transferência'
};

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | '3months' | 'year' | 'custom'>('month');
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [contextFilter, setContextFilter] = useState<'ALL' | 'PF' | 'PJ'>('ALL');

  const calcularDatas = (p: string, fromStr: string, toStr: string) => {
    const hoje = new Date();
    let from = "";
    let to = "";
    
    if (p === 'month') {
      from = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      to = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (p === '3months') {
      from = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1).toISOString().split('T')[0];
      to = new Date().toISOString().split('T')[0];
    } else if (p === 'year') {
      from = `${hoje.getFullYear()}-01-01`;
      to = `${hoje.getFullYear()}-12-31`;
    } else if (p === 'custom') {
      from = fromStr;
      to = toStr;
    }
    
    return { from, to };
  };

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const { from, to } = calcularDatas(period, customFrom, customTo);
      
      const params = new URLSearchParams();
      if (from) params.append('dateFrom', from);
      if (to) params.append('dateTo', to);
      if (contextFilter !== 'ALL') params.append('context', contextFilter);

      try {
        const res = await fetch(`/api/transactions?${params.toString()}`);
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        const data = await res.json();
        setTransactions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar dados do relatório", err);
      } finally {
        setLoading(false);
      }
    };

    if (period === 'custom' && (!customFrom || !customTo)) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    fetchReports();
  }, [period, customFrom, customTo, contextFilter]);

  const incomeTotal = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const balance = incomeTotal - expenseTotal;
  const biggestExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((max, t) => t.amount > max ? t.amount : max, 0);

  const expensesByCategory: Record<string, number> = {};
  transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
    const cat = t.category?.name || 'Sem categoria';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
  });
  const topCategory = Object.entries(expensesByCategory).sort((a,b) => b[1] - a[1])[0]?.[0] || '—';

  const txCount = transactions.length;

  const categoryPieData = (() => {
    const sorted = Object.entries(expensesByCategory).sort((a,b) => b[1]-a[1]);
    if (sorted.length <= 8) return sorted.map(([name, value]) => ({ name, value }));
    const top7 = sorted.slice(0, 7).map(([name, value]) => ({ name, value }));
    const outros = sorted.slice(7).reduce((acc, [,v]) => acc + v, 0);
    return [...top7, { name: 'Outros', value: outros }];
  })();

  const methodData: Record<string, number> = {};
  transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
    const label = METHOD_LABELS[t.paymentMethod] || t.paymentMethod;
    methodData[label] = (methodData[label] || 0) + t.amount;
  });
  const methodPieData = Object.entries(methodData).map(([name, value]) => ({ name, value }));

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const monthlyData = meses.map(mes => ({ mes, receitas: 0, despesas: 0 }));
  transactions.forEach(t => {
    const m = new Date(t.date).getMonth();
    if (t.type === 'INCOME') monthlyData[m].receitas += t.amount;
    else monthlyData[m].despesas += t.amount;
  });
  const monthlyDataFilled = monthlyData.filter(m => m.receitas > 0 || m.despesas > 0);

  const sortedTx = [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let accumulated = 0;
  const balanceEvolution = sortedTx.map(t => {
    accumulated += t.type === 'INCOME' ? t.amount : -t.amount;
    return {
      data: new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      saldo: parseFloat(accumulated.toFixed(2))
    };
  });

  const top10Expenses = [...transactions]
    .filter(t => t.type === 'EXPENSE')
    .sort((a,b) => b.amount - a.amount)
    .slice(0, 10);

  return (
    <DashboardLayout title="Relatórios">
      {/* SEÇÃO 1 - Filtros */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Período</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className={period === 'month' ? 'btn-primary' : 'btn-secondary'} 
                      style={period === 'month' ? { background: 'var(--accent-primary)', color: '#0a0a0a', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' } : { padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' }} 
                      onClick={() => setPeriod('month')}>Este Mês</button>
              <button className={period === '3months' ? 'btn-primary' : 'btn-secondary'} 
                      style={period === '3months' ? { background: 'var(--accent-primary)', color: '#0a0a0a', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' } : { padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' }} 
                      onClick={() => setPeriod('3months')}>3 Meses</button>
              <button className={period === 'year' ? 'btn-primary' : 'btn-secondary'} 
                      style={period === 'year' ? { background: 'var(--accent-primary)', color: '#0a0a0a', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' } : { padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' }} 
                      onClick={() => setPeriod('year')}>Este Ano</button>
              <button className={period === 'custom' ? 'btn-primary' : 'btn-secondary'} 
                      style={period === 'custom' ? { background: 'var(--accent-primary)', color: '#0a0a0a', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' } : { padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' }} 
                      onClick={() => setPeriod('custom')}>Personalizado</button>
            </div>
          </div>

          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>De:</label>
                <input type="date" className="input-field" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Até:</label>
                <input type="date" className="input-field" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Perfil</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className={contextFilter === 'PF' ? 'btn-primary' : 'btn-secondary'} 
                      style={contextFilter === 'PF' ? { background: 'var(--accent-primary)', color: '#0a0a0a', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' } : { padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' }} 
                      onClick={() => setContextFilter('PF')}>PF</button>
              <button className={contextFilter === 'PJ' ? 'btn-primary' : 'btn-secondary'} 
                      style={contextFilter === 'PJ' ? { background: 'var(--accent-primary)', color: '#0a0a0a', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' } : { padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' }} 
                      onClick={() => setContextFilter('PJ')}>PJ</button>
              <button className={contextFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'} 
                      style={contextFilter === 'ALL' ? { background: 'var(--accent-primary)', color: '#0a0a0a', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' } : { padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' }} 
                      onClick={() => setContextFilter('ALL')}>Todos</button>
            </div>
          </div>
          
          <div style={{ marginLeft: 'auto', paddingBottom: '0.4rem' }}>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>{txCount} transações encontradas</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <Loader2 className="spin" size={40} color="var(--accent-primary)" />
        </div>
      ) : (
        <>
          {/* SEÇÃO 2 - Resumo Executivo */}
          <div className="summary-grid">
            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h4 className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Total de Receitas</h4>
              <div style={{ color: 'var(--success)', fontSize: '1.8rem', fontWeight: 'bold' }}>
                R$ {incomeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>no período</div>
            </div>
            
            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h4 className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Total de Despesas</h4>
              <div style={{ color: 'var(--danger)', fontSize: '1.8rem', fontWeight: 'bold' }}>
                R$ {expenseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>no período</div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h4 className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Saldo do Período</h4>
              <div style={{ color: balance >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '1.8rem', fontWeight: 'bold' }}>
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>no período</div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h4 className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Maior Despesa</h4>
              <div style={{ color: 'var(--danger)', fontSize: '1.8rem', fontWeight: 'bold' }}>
                R$ {biggestExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>no período</div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h4 className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Categoria Top</h4>
              <div style={{ color: 'var(--text-primary)', fontSize: '1.4rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {topCategory}
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>maior gasto</div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h4 className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Nº de Transações</h4>
              <div style={{ color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: 'bold' }}>
                {txCount}
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>no período</div>
            </div>
          </div>

          {/* SEÇÃO 3 - Gráficos */}
          <div className="reports-grid">
            {/* GRÁFICO A */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Despesas por Categoria</h3>
              <div style={{ width: '100%', height: '300px' }}>
                {categoryPieData.length === 0 ? (
                  <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }} className="text-muted">
                    Nenhuma despesa no período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={60} paddingAngle={2}>
                        {categoryPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}`} 
                               contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* GRÁFICO B */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Receitas vs Despesas por Mês</h3>
              <div style={{ width: '100%', height: '300px' }}>
                {monthlyDataFilled.length === 0 ? (
                  <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }} className="text-muted">
                    Nenhuma transação no período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyDataFilled}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="mes" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                      <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                      <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}`} 
                               contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="receitas" fill="var(--success)" name="Receitas" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="despesas" fill="var(--danger)" name="Despesas" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* GRÁFICO C */}
            <div className="glass-panel span-2" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Evolução do Saldo</h3>
              <div style={{ width: '100%', height: '250px' }}>
                {balanceEvolution.length === 0 ? (
                  <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }} className="text-muted">
                    Nenhuma transação no período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={balanceEvolution}>
                      <defs>
                        <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="data" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                      <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                      <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}`} 
                               contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="saldo" stroke="var(--accent-primary)" strokeWidth={3} fill="url(#saldoGradient)" name="Saldo Acumulado" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* GRÁFICO D */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Por Método de Pagamento</h3>
              <div style={{ width: '100%', height: '300px' }}>
                {methodPieData.length === 0 ? (
                  <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }} className="text-muted">
                    Nenhuma despesa no período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={methodPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={60} paddingAngle={2}>
                        {methodPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}`} 
                               contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 4 - Top 10 Maiores Despesas */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Top 10 Maiores Despesas</h3>
            {top10Expenses.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">
                Nenhuma despesa no período
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Nº</th>
                      <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Descrição</th>
                      <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Categoria</th>
                      <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Data</th>
                      <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal', textAlign: 'right' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10Expenses.map((t, idx) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '0.8rem' }}>
                          <span style={{ background: CHART_COLORS[idx % CHART_COLORS.length], color: '#0a0a0a', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {idx + 1}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem', fontWeight: 500 }}>{t.description}</td>
                        <td style={{ padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.category?.name || "Sem categoria"}</td>
                        <td style={{ padding: '0.8rem', color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '0.8rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>
                          R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .reports-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .span-2 {
          grid-column: span 2;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .reports-grid {
            grid-template-columns: 1fr;
          }
          .span-2 {
            grid-column: span 1;
          }
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
