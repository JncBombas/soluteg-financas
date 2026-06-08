"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { Topbar } from "./Topbar";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

export function DashboardLayout({ children, title }: { children: React.ReactNode, title: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { status } = useSession({
    required: true,
    onUnauthenticated() { redirect("/login"); },
  });

  if (status === "loading") {
    return (
      <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'1rem' }}>
        <img src="/logo.png" alt="Soluteg" style={{ height: 32, opacity: 0.7 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <main className="main-content">
        <div className="desktop-topbar">
          <Topbar title={title} />
        </div>
        <MobileHeader title={title} onMenuOpen={() => setSidebarOpen(true)} />
        <h1 className="mobile-page-title">{title}</h1>
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
          {children}
        </div>
      </main>
      <PWAInstallBanner />
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
