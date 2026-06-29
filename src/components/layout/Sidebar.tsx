"use client";
import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, Receipt, PieChart, Settings, LogOut,
         CreditCard, CalendarDays, Wallet, Download, X, CalendarClock, TrendingUp } from "lucide-react";
import styles from "./layout.module.css";
import { signOut } from "next-auth/react";
import { useFinanceContext } from "@/lib/useFinanceContext";
import { usePWAInstall } from "@/lib/usePWAInstall";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { context, setContext } = useFinanceContext();
  const { canInstall, install } = usePWAInstall();

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.sidebarTopRow}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="Soluteg" style={{ height: '28px', width: 'auto' }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '3px', display: 'block' }}>Finanças</span>
        </div>
        <button className={styles.closeSidebar} onClick={onClose} aria-label="Fechar menu">
          <X size={20} />
        </button>
      </div>

      <div className={styles.contextSelector}>
        {(['PF', 'PJ', 'ALL'] as const).map(c => (
          <button key={c} onClick={() => setContext(c)}
            className={`${styles.contextBtn} ${context === c ? styles.contextBtnActive : ''}`}>
            {c === 'ALL' ? 'Todos' : c}
          </button>
        ))}
      </div>

      <nav className={styles.nav}>
        {[
          { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { href: '/projections', icon: TrendingUp, label: 'Projeções' },
          { href: '/calendar', icon: CalendarDays, label: 'Calendário' },
          { href: '/transactions', icon: Receipt, label: 'Transações Avulsas' },
          { href: '/fixed-transactions', icon: CalendarClock, label: 'Transações Fixas' },
          { href: '/cards', icon: CreditCard, label: 'Cartões' },
          { href: '/accounts', icon: Wallet, label: 'Contas' },
          { href: '/reports', icon: PieChart, label: 'Relatórios' },
          { href: '/settings', icon: Settings, label: 'Configurações' },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={styles.navLink} onClick={handleNavClick}>
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        {canInstall && (
          <button onClick={install} className={styles.logoutBtn}
            style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
            <Download size={20} />
            <span>Instalar App</span>
          </button>
        )}
        <button onClick={() => signOut({ callbackUrl: '/login' })} className={styles.logoutBtn}>
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
