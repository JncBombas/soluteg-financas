"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

export function DashboardLayout({ children, title }: { children: React.ReactNode, title: string }) {
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/login");
    },
  });

  if (status === "loading") {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Carregando Segurança...</div>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Topbar title={title} />
        <div className="fade-in" style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
          {children}
        </div>
      </main>
      <PWAInstallBanner />
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
