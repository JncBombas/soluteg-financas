"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PieChart, FileText } from "lucide-react";

export default function ReportsPage() {
  return (
    <DashboardLayout title="Relatórios">
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ background: 'rgba(201, 169, 110, 0.1)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <PieChart size={48} color="var(--accent-primary)" />
        </div>
        <h2 style={{ marginBottom: '1rem' }}>Relatórios Inteligentes (Em Breve)</h2>
        <p className="text-muted" style={{ maxWidth: '500px', lineHeight: '1.6' }}>
          A nossa Inteligência Artificial vai analisar os seus padrões de gastos e gerar relatórios completos em PDF, gráficos de pizza por categoria e sugestões de economia automáticas nesta página.
        </p>
        
        <button className="btn-secondary" style={{ marginTop: '2rem', opacity: 0.5, cursor: 'not-allowed' }}>
          <FileText size={20} />
          Exportar Excel (Em Desenvolvimento)
        </button>
      </div>
    </DashboardLayout>
  );
}
