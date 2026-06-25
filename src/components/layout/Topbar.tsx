"use client";

import { useSession } from "next-auth/react";
import styles from "./layout.module.css";
import { Bell, BellRing, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useFinanceContext } from "@/lib/useFinanceContext";
import { usePushNotifications } from "@/lib/usePushNotifications";

export function Topbar({ title }: { title: string }) {
  const { data: session } = useSession();
  const { context, setContext } = useFinanceContext();
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erro ao buscar notificações", err);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const labelVencimento = (item: any) => {
    const due = new Date(item.dueDate || item.date);
    due.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - hoje.getTime()) / 86400000);
    if (diff < 0) return { txt: `Vencido há ${Math.abs(diff)}d`, color: "var(--danger)" };
    if (diff === 0) return { txt: "Vence hoje", color: "var(--danger)" };
    if (diff === 1) return { txt: "Vence amanhã", color: "var(--warning)" };
    return { txt: `Vence em ${diff}d`, color: "var(--warning)" };
  };

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
              padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-glass)', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 500,
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
        <div style={{ position: 'relative' }}>
          <button className="btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', position: 'relative' }}
            onClick={() => setOpen(o => !o)} aria-label="Notificações">
            <Bell size={20} />
            {items.length > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18,
                background: 'var(--danger)', color: '#fff', borderRadius: '9px',
                fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', fontWeight: 700
              }}>
                {items.length > 9 ? '9+' : items.length}
              </span>
            )}
          </button>

          {open && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)', width: 320, maxWidth: '90vw',
              maxHeight: 420, overflowY: 'auto', zIndex: 500,
              background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)',
              borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.9rem' }}>Vencimentos próximos</strong>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {supported && (
                <button
                  onClick={() => (subscribed ? unsubscribe() : subscribe())}
                  disabled={loading}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', marginBottom: '0.75rem', color: subscribed ? 'var(--success)' : 'var(--accent-primary)' }}
                >
                  <BellRing size={16} />
                  {loading ? 'Aguarde...' : subscribed ? 'Notificações ativadas' : 'Ativar notificações'}
                </button>
              )}

              {items.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>
                  Nenhum vencimento próximo.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {items.map(item => {
                    const venc = labelVencimento(item);
                    return (
                      <a key={item.id} href="/transactions" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.description}
                              {item.isEstimated && <span style={{ color: 'var(--warning)', fontSize: '0.7rem' }}> · revisar valor</span>}
                            </p>
                            <span style={{ fontSize: '0.72rem', color: venc.color }}>{venc.txt}</span>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                            R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

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
