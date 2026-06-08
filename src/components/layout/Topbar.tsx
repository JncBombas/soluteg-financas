"use client";

import { useSession } from "next-auth/react";
import styles from "./layout.module.css";
import { Bell } from "lucide-react";
import { useFinanceContext } from "@/lib/useFinanceContext";

export function Topbar({ title }: { title: string }) {
  const { data: session } = useSession();
  const { context, setContext } = useFinanceContext();

  return (
    <header className={styles.topbar}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        <p className="text-muted" style={{ marginTop: '0.2rem' }}>Bem-vindo de volta, {session?.user?.name || "Usuário"}</p>
      </div>

      <div className={styles.contextMobile}>
        {['PF','PJ','ALL'].map(c => (
          <button key={c}
            onClick={() => setContext(c as any)}
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-glass)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 500,
              background: context === c ? 'var(--accent-primary)' : 'transparent',
              color: context === c ? '#0a0a0a' : 'var(--text-muted)',
              borderColor: context === c ? 'var(--accent-primary)' : 'var(--border-glass)'
            }}
          >
            {c === 'ALL' ? 'Todos' : c}
          </button>
        ))}
      </div>

      <div className={styles.userInfo}>
        <button className="btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <Bell size={20} />
        </button>
        {session?.user?.image ? (
          <img src={session.user.image} alt="Avatar" className={styles.avatar} />
        ) : (
          <div className={styles.avatar} style={{ background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {session?.user?.name?.[0] || "U"}
          </div>
        )}
      </div>
    </header>
  );
}
