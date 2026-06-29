"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState, useEffect, useMemo } from "react";
import { ComposedChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { Loader2, TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";

type Bucket = { income: number; expense: number };
type MonthRow = { month: string; label: string; PF: Bucket; PJ: Bucket };
type ContextView = "ALL" | "PF" | "PJ";

const HORIZONTES = [6, 12, 18, 24];
const BRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function ProjectionsPage() {
  const [horizon, setHorizon] = useState(12);
  const [view, setView] = useState<ContextView>("ALL");
  const [showReceitas, setShowReceitas] = useState(true);
  const [showDespesas, setShowDespesas] = useState(true);
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/projections?months=${horizon}`);
        if (res.status === 401) { window.location.href = "/login"; return; }
        const json = await res.json();
        setRows(Array.isArray(json?.data) ? json.data : []);
        setAccounts(Array.isArray(json?.accounts) ? json.accounts : []);
      } catch (err) {
        console.error("Erro ao buscar projeções", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [horizon]);

  // Aplica o seletor de contexto (PF / PJ / Consolidado) a cada mês.
  const chartData = useMemo(() => {
    return rows.map((r) => {
      const receitas = (view === "PJ" ? 0 : r.PF.income) + (view === "PF" ? 0 : r.PJ.income);
      const despesas = (view === "PJ" ? 0 : r.PF.expense) + (view === "PF" ? 0 : r.PJ.expense);
      return { label: r.label, receitas, despesas, saldo: receitas - despesas };
    });
  }, [rows, view]);

  const totais = useMemo(() => {
    const receitas = chartData.reduce((a, d) => a + d.receitas, 0);
    const despesas = chartData.reduce((a, d) => a + d.despesas, 0);
    const piorSaldo = chartData.length ? Math.min(...chartData.map((d) => d.saldo)) : 0;
    return { receitas, despesas, saldo: receitas - despesas, piorSaldo };
  }, [chartData]);

  // Contas filtradas pelo contexto selecionado.
  const accountsView = useMemo(
    () => accounts.filter((a) => view === "ALL" || a.context === view),
    [accounts, view]
  );

  // Série de saldo projetado das contas (uma linha por conta), alinhada aos meses.
  const accountsChartData = useMemo(() => {
    return rows.map((r, i) => {
      const row: Record<string, any> = { label: r.label };
      accountsView.forEach((a) => { row[a.id] = a.balances?.[i] ?? null; });
      return row;
    });
  }, [rows, accountsView]);

  return (
    <DashboardLayout title="Projeções">
      <div style={{ marginBottom: "1.5rem" }}>
        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
          Visão de fluxo futuro com base nas transações fixas ativas e nos lançamentos já agendados.
          Use os filtros para alternar entre PF, PJ e consolidado.
        </p>
      </div>

      {/* Controles */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase" }}>Horizonte</label>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {HORIZONTES.map((h) => (
              <button key={h} onClick={() => setHorizon(h)}
                className={horizon === h ? "btn-primary" : "btn-secondary"}
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.82rem" }}>
                {h}m
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase" }}>Contexto</label>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {([["ALL", "Consolidado"], ["PF", "PF"], ["PJ", "PJ"]] as const).map(([v, lbl]) => (
              <button key={v} onClick={() => setView(v)}
                className={view === v ? "btn-primary" : "btn-secondary"}
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.82rem" }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase" }}>Séries</label>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", height: "32px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="checkbox" checked={showReceitas} onChange={(e) => setShowReceitas(e.target.checked)} />
              <span style={{ color: "var(--success)" }}>Receitas</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="checkbox" checked={showDespesas} onChange={(e) => setShowDespesas(e.target.checked)} />
              <span style={{ color: "var(--danger)" }}>Despesas</span>
            </label>
          </div>
        </div>
      </div>

      {/* Resumo do período */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
            <TrendingUp size={16} color="var(--success)" /> Receitas projetadas
          </div>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold", color: "var(--success)" }}>{BRL(totais.receitas)}</p>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
            <TrendingDown size={16} color="var(--danger)" /> Despesas projetadas
          </div>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold", color: "var(--danger)" }}>{BRL(totais.despesas)}</p>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
            <Wallet size={16} color="var(--accent-primary)" /> Saldo do período
          </div>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold", color: totais.saldo >= 0 ? "var(--success)" : "var(--danger)" }}>{BRL(totais.saldo)}</p>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.4rem" }}>Pior saldo mensal</div>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold", color: totais.piorSaldo >= 0 ? "var(--success)" : "var(--danger)" }}>{BRL(totais.piorSaldo)}</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="glass-panel" style={{ padding: "1.5rem", minHeight: "400px" }}>
        <h3 style={{ marginBottom: "1.5rem" }}>
          Projeção de Fluxo — próximos {horizon} meses {view !== "ALL" ? `(${view})` : "(Consolidado)"}
        </h3>
        <div style={{ width: "100%", height: isMobile ? "300px" : "380px" }}>
          {loading ? (
            <div style={{ display: "flex", height: "100%", justifyContent: "center", alignItems: "center" }}>
              <Loader2 className="spin" size={32} color="var(--accent-primary)" />
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ display: "flex", height: "100%", justifyContent: "center", alignItems: "center", color: "var(--text-muted)" }}>
              Nenhuma projeção encontrada. Cadastre transações fixas ou lançamentos futuros.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toLocaleString("pt-BR")}k`} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-glass)" }}
                  formatter={(value: any, name: any) => [BRL(Number(value)), name]}
                />
                <Legend />
                {showReceitas && <Bar dataKey="receitas" fill="var(--success)" name="Receitas" />}
                {showDespesas && <Bar dataKey="despesas" fill="var(--danger)" name="Despesas" />}
                <Line type="monotone" dataKey="saldo" stroke="var(--accent-primary)" strokeWidth={2} name="Saldo" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Projeção de saldo das contas */}
      <div className="glass-panel" style={{ padding: "1.5rem", minHeight: "300px", marginTop: "1.5rem" }}>
        <h3 style={{ marginBottom: "1.5rem" }}>Saldo projetado das contas</h3>

        {loading ? (
          <div style={{ display: "flex", height: "240px", justifyContent: "center", alignItems: "center" }}>
            <Loader2 className="spin" size={32} color="var(--accent-primary)" />
          </div>
        ) : accountsView.length === 0 ? (
          <div style={{ display: "flex", height: "120px", justifyContent: "center", alignItems: "center", color: "var(--text-muted)", textAlign: "center" }}>
            Nenhuma conta {view !== "ALL" ? `(${view}) ` : ""}cadastrada. As fixas sem conta vinculada não entram nesta visão.
          </div>
        ) : (
          <>
            <div style={{ width: "100%", height: isMobile ? "240px" : "300px", marginBottom: "1.5rem" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accountsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toLocaleString("pt-BR")}k`} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-glass)" }}
                    formatter={(value: any, name: any) => [BRL(Number(value)), name]}
                  />
                  <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" />
                  {accountsView.map((a) => (
                    <Line key={a.id} type="monotone" dataKey={a.id} name={a.name}
                      stroke={a.color || "var(--accent-primary)"} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
              {accountsView.map((a) => {
                const finalBalance = a.balances?.length ? a.balances[a.balances.length - 1] : a.currentBalance;
                const negativa = a.minBalance < 0;
                return (
                  <div key={a.id} className="glass-card" style={{ padding: "1rem", borderLeft: `3px solid ${a.color || "var(--accent-primary)"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 600 }}>{a.name}</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", padding: "0.1rem 0.4rem", borderRadius: "var(--radius-full)" }}>{a.context}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      <span>Hoje</span><span>{BRL(a.currentBalance)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Em {horizon}m</span>
                      <span style={{ fontWeight: "bold", color: finalBalance >= 0 ? "var(--success)" : "var(--danger)" }}>{BRL(finalBalance)}</span>
                    </div>
                    {negativa && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.6rem", fontSize: "0.75rem", color: "var(--danger)" }}>
                        <AlertTriangle size={14} />
                        Fica negativo {a.firstNegativeLabel ? `em ${a.firstNegativeLabel}` : ""} (mín. {BRL(a.minBalance)})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </DashboardLayout>
  );
}
