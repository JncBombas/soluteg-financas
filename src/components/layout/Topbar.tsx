"use client";

import { useSession } from "next-auth/react";
import styles from "./layout.module.css";
import { Bell } from "lucide-react";

export function Topbar({ title }: { title: string }) {
  const { data: session } = useSession();

  return (
    <header className={styles.topbar}>
      <div>
        <h1 style={{ fontSize: '1.8rem' }}>{title}</h1>
        <p className="text-muted" style={{ marginTop: '0.2rem' }}>Bem-vindo de volta, {session?.user?.name || "Usuário"}</p>
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
