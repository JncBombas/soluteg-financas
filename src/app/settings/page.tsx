"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Shield, Monitor, Bell, Tag, Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

// Types
interface Category {
  id: string;
  name: string;
  type: string;
  nature: string;
  context: string;
  group: string;
  isDefault: boolean;
}

const GROUPS = [
  "Alimentação", "Educação", "Habitação", "Impostos", "Investimentos",
  "Lazer", "Renda", "Saúde", "Serviços", "Transporte", "Vestuário",
  "Outros", "Personalizado"
];

const typeLabel = (type: string) => type === "INCOME" ? "Receita" : "Despesa";
const natureLabel = (nature: string) => nature === "FIXED" ? "Fixa" : "Variável";
const contextLabel = (context: string) => context === "PERSONAL" ? "Pessoal" : "PJ";

const getBadgeStyle = (field: string, value: string) => {
  if (field === 'type') {
    return value === 'INCOME' 
      ? { background: 'rgba(0,255,136,0.1)', color: 'var(--success)' }
      : { background: 'rgba(255,71,87,0.1)', color: 'var(--danger)' };
  }
  if (field === 'nature') {
    return value === 'FIXED'
      ? { background: 'rgba(201,169,110,0.1)', color: 'var(--accent-primary)' }
      : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' };
  }
  if (field === 'context') {
    return value === 'PERSONAL'
      ? { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }
      : { background: 'rgba(255,165,0,0.1)', color: 'var(--warning)' };
  }
  return {};
};

export default function SettingsPage() {
  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState("");
  const [filterContext, setFilterContext] = useState("");
  
  // Create State
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Outros", customGroup: "" });
  const [savingCat, setSavingCat] = useState(false);
  
  // Edit & Delete State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Outros", customGroup: "" });
  const [deletingCat, setDeletingCat] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCats(false);
    }
  };

  const handleCreateCategory = async () => {
    setSavingCat(true);
    setCatError(null);
    try {
      const finalGroup = newForm.group === "Personalizado" ? newForm.customGroup : newForm.group;
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newForm.name,
          type: newForm.type,
          nature: newForm.nature,
          context: newForm.context,
          group: finalGroup
        })
      });
      
      if (res.ok) {
        setShowNewForm(false);
        setNewForm({ name: "", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Outros", customGroup: "" });
        fetchCategories();
      } else {
        const err = await res.json();
        setCatError(err.error || "Erro ao criar categoria");
      }
    } catch (error: any) {
      setCatError("Erro interno ao criar categoria");
    } finally {
      setSavingCat(false);
    }
  };

  const handleEditCategory = async (id: string) => {
    setSavingCat(true);
    setCatError(null);
    try {
      const finalGroup = editForm.group === "Personalizado" ? editForm.customGroup : editForm.group;
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          type: editForm.type,
          nature: editForm.nature,
          context: editForm.context,
          group: finalGroup
        })
      });

      if (res.ok) {
        setEditingCatId(null);
        fetchCategories();
      } else {
        const err = await res.json();
        setCatError(err.error || "Erro ao editar categoria");
      }
    } catch (error: any) {
      setCatError("Erro interno ao editar categoria");
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setDeletingCat(true);
    setCatError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchCategories();
      } else {
        const err = await res.json();
        setCatError(err.error || "Erro ao excluir categoria");
      }
    } catch (error: any) {
      setCatError("Erro interno ao excluir categoria");
    } finally {
      setDeletingCat(false);
    }
  };

  const filtered = categories
    .filter(c => filterType === "" || c.type === filterType)
    .filter(c => filterContext === "" || c.context === filterContext);

  const startEdit = (c: Category) => {
    setEditingCatId(c.id);
    const isCustom = !GROUPS.includes(c.group);
    setEditForm({
      name: c.name,
      type: c.type,
      nature: c.nature,
      context: c.context,
      group: isCustom ? "Personalizado" : c.group,
      customGroup: isCustom ? c.group : ""
    });
  };

  return (
    <DashboardLayout title="Configurações">
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* NOVA SEÇÃO: CATEGORIAS */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Tag size={24} color="var(--accent-primary)" />
              Categorias
            </h3>
            <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setShowNewForm(!showNewForm)}>
              <Plus size={16} /> Nova Categoria
            </button>
          </div>

          {catError && (
            <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--danger)' }}>{catError}</span>
              <button onClick={() => setCatError(null)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
          )}

          {showNewForm && (
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 600 }}>Nova Categoria</h4>
                <button onClick={() => setShowNewForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <input 
                  type="text" placeholder="Nome da Categoria" className="input-field" 
                  value={newForm.name} onChange={e => setNewForm({...newForm, name: e.target.value})}
                />
                <select className="input-field" value={newForm.type} onChange={e => setNewForm({...newForm, type: e.target.value})} style={{ appearance: 'none' }}>
                  <option value="EXPENSE">Despesa</option>
                  <option value="INCOME">Receita</option>
                </select>
                <select className="input-field" value={newForm.nature} onChange={e => setNewForm({...newForm, nature: e.target.value})} style={{ appearance: 'none' }}>
                  <option value="VARIABLE">Variável</option>
                  <option value="FIXED">Fixa</option>
                </select>
                <select className="input-field" value={newForm.context} onChange={e => setNewForm({...newForm, context: e.target.value})} style={{ appearance: 'none' }}>
                  <option value="PERSONAL">Pessoal</option>
                  <option value="BUSINESS">PJ</option>
                </select>
                <select className="input-field" value={newForm.group} onChange={e => setNewForm({...newForm, group: e.target.value})} style={{ appearance: 'none' }}>
                  {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {newForm.group === "Personalizado" && (
                  <input 
                    type="text" placeholder="Nome do Grupo" className="input-field" 
                    value={newForm.customGroup} onChange={e => setNewForm({...newForm, customGroup: e.target.value})}
                  />
                )}
              </div>
              <button 
                className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} 
                onClick={handleCreateCategory} disabled={savingCat || !newForm.name}
              >
                {savingCat ? "Salvando..." : "Salvar Categoria"}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className={filterType === "" ? "btn-primary" : "btn-secondary"} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setFilterType("")}>Todas</button>
              <button className={filterType === "INCOME" ? "btn-primary" : "btn-secondary"} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setFilterType("INCOME")}>Receitas</button>
              <button className={filterType === "EXPENSE" ? "btn-primary" : "btn-secondary"} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setFilterType("EXPENSE")}>Despesas</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className={filterContext === "" ? "btn-primary" : "btn-secondary"} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setFilterContext("")}>Todas</button>
              <button className={filterContext === "PERSONAL" ? "btn-primary" : "btn-secondary"} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setFilterContext("PERSONAL")}>Pessoal</button>
              <button className={filterContext === "BUSINESS" ? "btn-primary" : "btn-secondary"} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setFilterContext("BUSINESS")}>PJ</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {loadingCats ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 className="spin" size={32} color="var(--accent-primary)" />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Nenhuma categoria encontrada.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem' }}>Nome</th>
                    <th style={{ padding: '1rem' }}>Tipo</th>
                    <th style={{ padding: '1rem' }}>Natureza</th>
                    <th style={{ padding: '1rem' }}>Contexto</th>
                    <th style={{ padding: '1rem' }}>Grupo</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      {editingCatId === c.id ? (
                        <>
                          <td style={{ padding: '0.5rem' }}>
                            <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="input-field" style={{ padding: '0.4rem' }} />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} className="input-field" style={{ padding: '0.4rem', appearance: 'none' }}>
                              <option value="INCOME">Receita</option>
                              <option value="EXPENSE">Despesa</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <select value={editForm.nature} onChange={e => setEditForm({...editForm, nature: e.target.value})} className="input-field" style={{ padding: '0.4rem', appearance: 'none' }}>
                              <option value="FIXED">Fixa</option>
                              <option value="VARIABLE">Variável</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <select value={editForm.context} onChange={e => setEditForm({...editForm, context: e.target.value})} className="input-field" style={{ padding: '0.4rem', appearance: 'none' }}>
                              <option value="PERSONAL">Pessoal</option>
                              <option value="BUSINESS">PJ</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <select value={editForm.group} onChange={e => setEditForm({...editForm, group: e.target.value})} className="input-field" style={{ padding: '0.4rem', appearance: 'none' }}>
                                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                              {editForm.group === "Personalizado" && (
                                <input type="text" placeholder="Nome..." value={editForm.customGroup} onChange={e => setEditForm({...editForm, customGroup: e.target.value})} className="input-field" style={{ padding: '0.4rem' }} />
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                            <button onClick={() => handleEditCategory(c.id)} disabled={savingCat} style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', marginRight: '0.5rem' }}>
                              <Check size={18} />
                            </button>
                            <button onClick={() => setEditingCatId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                              <X size={18} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '1rem', fontWeight: '500' }}>
                            {c.name} {c.isDefault && <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>(padrão)</span>}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ ...getBadgeStyle('type', c.type), padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{typeLabel(c.type)}</span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ ...getBadgeStyle('nature', c.nature), padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{natureLabel(c.nature)}</span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ ...getBadgeStyle('context', c.context), padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{contextLabel(c.context)}</span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{c.group}</span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <button className="action-edit" onClick={() => startEdit(c)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: '0.5rem' }}>
                              <Pencil size={16} />
                            </button>
                            <button className="action-delete" onClick={() => handleDeleteCategory(c.id)} disabled={deletingCat} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* SEÇÕES EXISTENTES MANTIDAS */}
        <section style={{ marginBottom: '3rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Shield size={24} color="var(--accent-primary)" />
            Segurança & Acesso
          </h3>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontWeight: '500' }}>Autenticação em 2 Fatores (SSO)</p>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Gerenciado automaticamente pelo Google</p>
              </div>
              <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Seguro</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: '500' }}>Criptografia de Banco de Dados</p>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Proteção Zod + Prisma Active</p>
              </div>
              <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Ativo</span>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Monitor size={24} color="var(--accent-primary)" />
            Preferências de Interface
          </h3>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: '500' }}>Tema de Cores</p>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Glassmorphism Cyberpunk</p>
              </div>
              <span style={{ background: 'var(--bg-primary)', padding: '0.2rem 1rem', borderRadius: '1rem', border: '1px solid var(--border-glass)' }}>Escuro</span>
            </div>
          </div>
        </section>
        
        <section>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Bell size={24} color="var(--accent-primary)" />
            Notificações
          </h3>
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p className="text-muted">As notificações por e-mail e alertas de limites de orçamento estarão disponíveis na próxima atualização.</p>
          </div>
        </section>

      </div>
      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .action-edit:hover { color: var(--accent-primary) !important; }
        .action-delete:hover { color: var(--danger) !important; }
      `}</style>
    </DashboardLayout>
  );
}
