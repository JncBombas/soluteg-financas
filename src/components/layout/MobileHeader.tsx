"use client";
import Image from "next/image";
import { Menu } from "lucide-react";
import styles from "./layout.module.css";
import { useSession } from "next-auth/react";

interface MobileHeaderProps {
  title: string;
  onMenuOpen: () => void;
}

export function MobileHeader({ title, onMenuOpen }: MobileHeaderProps) {
  const { data: session } = useSession();
  return (
    <header className={styles.mobileHeader}>
      <button className={styles.hamburger} onClick={onMenuOpen} aria-label="Abrir menu">
        <Menu size={24} />
      </button>
      <div className={styles.mobileHeaderLogo}>
        <Image src="/logo.png" alt="Soluteg" width={80} height={24} style={{ objectFit: 'contain' }} />
      </div>
      <div className={styles.mobileHeaderRight}>
        {session?.user?.image ? (
          <img src={session.user.image} alt="Avatar" className={styles.avatar} />
        ) : (
          <div className={styles.avatar} style={{ background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
            {session?.user?.name?.[0] || "U"}
          </div>
        )}
      </div>
    </header>
  );
}
