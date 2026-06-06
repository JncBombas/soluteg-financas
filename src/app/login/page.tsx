"use client";

import { signIn } from "next-auth/react";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={`glass-card ${styles.loginCard}`}>
        <div className={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <img src="/logo.png" alt="Soluteg" style={{ height: '48px', width: 'auto' }} />
          </div>
          <h2 style={{ color: 'var(--accent-primary)', fontSize: '1rem', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Finanças</h2>
          <p>Gerencie suas finanças com segurança e praticidade.</p>
        </div>

        <button 
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className={styles.googleBtn}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={24} height={24} />
          <span>Continuar com Google</span>
        </button>

        <div className={styles.divider}>
          <span>Segurança em 1º Lugar</span>
        </div>

        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
          Seus dados são criptografados ponta-a-ponta e nunca são compartilhados.
        </p>
      </div>
    </div>
  );
}
