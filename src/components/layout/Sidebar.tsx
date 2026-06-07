"use client";

import Link from "next/link";
import { LayoutDashboard, Receipt, PieChart, Settings, LogOut, CreditCard, CalendarDays, Wallet } from "lucide-react";
import styles from "./layout.module.css";
import { signOut } from "next-auth/react";
import { useFinanceContext } from "@/lib/useFinanceContext";

export function Sidebar() {
  const { context, setContext } = useFinanceContext();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <img src="/logo.png" alt="Soluteg" style={{ height: '32px', width: 'auto' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Finanças</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '4px', padding: '0 1rem', marginBottom: '1rem' }}>
        <button 
          onClick={() => setContext('PF')}
          style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, background: context === 'PF' ? 'var(--accent-primary)' : 'transparent', color: context === 'PF' ? '#0a0a0a' : 'var(--text-muted)', borderColor: context === 'PF' ? 'var(--accent-primary)' : 'var(--border-glass)' }}
        >PF</button>
        <button 
          onClick={() => setContext('PJ')}
          style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, background: context === 'PJ' ? 'var(--accent-primary)' : 'transparent', color: context === 'PJ' ? '#0a0a0a' : 'var(--text-muted)', borderColor: context === 'PJ' ? 'var(--accent-primary)' : 'var(--border-glass)' }}
        >PJ</button>
        <button 
          onClick={() => setContext('ALL')}
          style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, background: context === 'ALL' ? 'var(--accent-primary)' : 'transparent', color: context === 'ALL' ? '#0a0a0a' : 'var(--text-muted)', borderColor: context === 'ALL' ? 'var(--accent-primary)' : 'var(--border-glass)' }}
        >Todos</button>
      </div>

      <nav className={styles.nav}>
        <Link href="/dashboard" className={styles.navLink}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/calendar" className={styles.navLink}>
          <CalendarDays size={20} />
          <span>Calendário</span>
        </Link>
        <Link href="/transactions" className={styles.navLink}>
          <Receipt size={20} />
          <span>Transações</span>
        </Link>
        <Link href="/cards" className={styles.navLink}>
          <CreditCard size={20} />
          <span>Cartões</span>
        </Link>
        <Link href="/accounts" className={styles.navLink}>
          <Wallet size={20} />
          <span>Contas</span>
        </Link>
        <Link href="/reports" className={styles.navLink}>
          <PieChart size={20} />
          <span>Relatórios</span>
        </Link>
        <Link href="/settings" className={styles.navLink}>
          <Settings size={20} />
          <span>Configurações</span>
        </Link>
      </nav>

      <div className={styles.sidebarFooter}>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className={styles.logoutBtn}>
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
