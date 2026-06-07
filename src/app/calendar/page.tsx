"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ChevronLeft, ChevronRight, X, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const ano = currentDate.getFullYear();
      const mes = currentDate.getMonth();
      const primeiroDia = new Date(ano, mes, 1).toISOString().split('T')[0];
      const ultimoDia = new Date(ano, mes + 1, 0).toISOString().split('T')[0];
      
      try {
        const [resTrans, resCards] = await Promise.all([
          fetch(`/api/transactions?dateFrom=${primeiroDia}&dateTo=${ultimoDia}`),
          fetch(`/api/credit-cards`)
        ]);

        if (resTrans.status === 401 || resCards.status === 401) {
          window.location.href = "/login";
          return;
        }

        const dataTrans = await resTrans.json();
        const dataCards = await resCards.json();

        setTransactions(Array.isArray(dataTrans) ? dataTrans : []);
        setCreditCards(Array.isArray(dataCards) ? dataCards : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentDate]);

  const buildCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay(); 
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({
        day: daysInPrevMonth - startingDayOfWeek + 1 + i,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true
      });
    }
    
    const remaining = days.length % 7;
    if (remaining > 0) {
      for (let i = 1; i <= 7 - remaining; i++) {
        days.push({
          day: i,
          month: month + 1,
          year: month === 11 ? year + 1 : year,
          isCurrentMonth: false
        });
      }
    }
    
    return days;
  };

  const getEventsForDay = (day: number, month: number, year: number) => {
    return transactions.filter(t => {
      const targetDateStr = t.dueDate ?? t.date;
      const d = new Date(targetDateStr);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const getCardMarkersForDay = (day: number) => {
    const markers: any[] = [];
    creditCards.forEach(card => {
      if (card.closingDay === day) {
        markers.push({ type: 'CLOSING', cardName: card.name, color: card.color });
      }
      if (card.dueDay === day) {
        markers.push({ type: 'DUE', cardName: card.name, color: card.color });
      }
    });
    return markers;
  };

  const prevMonth = () => {
    setSelectedDay(null);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setSelectedDay(null);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const calendarDays = buildCalendarDays(currentDate);
  const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const formattedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const hoje = new Date();

  // Details Panel Data
  let dayEvents: any[] = [];
  let dayMarkers: any[] = [];
  let dayIncomes = 0;
  let dayExpenses = 0;
  
  if (selectedDay) {
    dayEvents = getEventsForDay(selectedDay, currentDate.getMonth(), currentDate.getFullYear());
    dayMarkers = getCardMarkersForDay(selectedDay);
    
    dayEvents.forEach(e => {
      if (e.type === 'INCOME') dayIncomes += e.amount;
      else dayExpenses += e.amount;
    });
  }
  const dayBalance = dayIncomes - dayExpenses;

  const STATUS_CONFIG: Record<string, string> = {
    PAID: "Pago", PENDING: "Pendente", OVERDUE: "Vencido", CANCELLED: "Cancelado"
  };

  return (
    <DashboardLayout title="Calendário">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Calendário Financeiro</h2>
      </div>

      <div className="calendar-layout">
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button className="btn-secondary" style={{ padding: '0.4rem 1rem' }} onClick={prevMonth}>
              <ChevronLeft size={18} /> Anterior
            </button>
            <h3 style={{ margin: 0 }}>{formattedMonthName}</h3>
            <button className="btn-secondary" style={{ padding: '0.4rem 1rem' }} onClick={nextMonth}>
              Próximo <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
            {WEEKDAYS.map(wd => (
              <div key={wd} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem' }}>
                {wd}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0', minHeight: '400px', alignItems: 'center' }}>
              <Loader2 className="spin" size={32} color="var(--accent-primary)" />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', flex: 1 }}>
              {calendarDays.map((d, idx) => {
                const isToday = d.day === hoje.getDate() && d.month === hoje.getMonth() && d.year === hoje.getFullYear();
                const isSelected = selectedDay === d.day && d.isCurrentMonth;
                const events = d.isCurrentMonth ? getEventsForDay(d.day, d.month, d.year) : [];
                const markers = d.isCurrentMonth ? getCardMarkersForDay(d.day) : [];

                return (
                  <div
                    key={idx}
                    className="calendar-cell"
                    onClick={() => {
                      if (d.isCurrentMonth) setSelectedDay(isSelected ? null : d.day);
                    }}
                    style={{
                      borderRadius: '8px',
                      border: isToday ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                      boxShadow: isToday ? '0 0 8px var(--accent-glow)' : 'none',
                      minHeight: '100px',
                      padding: '0.5rem',
                      cursor: d.isCurrentMonth ? 'pointer' : 'default',
                      position: 'relative',
                      opacity: d.isCurrentMonth ? 1 : 0.25,
                      background: isSelected ? 'rgba(201, 169, 110, 0.08)' : 'transparent',
                    }}
                  >
                    <span style={{ 
                      position: 'absolute', top: '0.5rem', right: '0.5rem', 
                      fontSize: '0.9rem', fontWeight: 'bold', 
                      color: isToday ? 'var(--accent-primary)' : 'var(--text-muted)' 
                    }}>
                      {d.day}
                    </span>

                    <div className="markers-container" style={{ marginTop: '1.2rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {markers.map((m, mIdx) => {
                        const firstName = m.cardName.split(' ')[0];
                        if (m.type === 'CLOSING') {
                          return (
                            <div key={`m-${mIdx}`} className="marker-pill" style={{ background: 'rgba(255,255,255,0.05)', color: m.color || 'var(--text-muted)' }}>
                              🔒 {firstName}
                            </div>
                          );
                        } else {
                          return (
                            <div key={`m-${mIdx}`} className="marker-pill" style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--danger)' }}>
                              📅 {firstName}
                            </div>
                          );
                        }
                      })}
                    </div>

                    <div className="events-container" style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {events.slice(0, 3).map((e, eIdx) => {
                        let bg = 'rgba(255,255,255,0.05)';
                        let color = 'var(--text-muted)';
                        
                        if (e.type === 'INCOME') {
                          bg = 'rgba(0,255,136,0.1)'; color = 'var(--success)';
                        } else if (e.type === 'EXPENSE') {
                          if (e.status === 'PENDING') { bg = 'rgba(255,165,0,0.08)'; color = 'var(--warning)'; }
                          else if (e.status === 'OVERDUE') { bg = 'rgba(255,71,87,0.1)'; color = 'var(--danger)'; }
                        }

                        const desc = e.description.length > 12 ? e.description.substring(0, 12) + '...' : e.description;
                        return (
                          <div key={`e-${eIdx}`} className="event-pill" style={{ background: bg, color }}>
                            <span className="event-text">{desc} R$ {e.amount.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                            <div className="event-dot" style={{ backgroundColor: color }}></div>
                          </div>
                        );
                      })}
                      {events.length > 3 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px' }}>
                          +{events.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedDay && (
          <div className="glass-card" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{selectedDay} de {currentDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</h3>
              <button onClick={() => setSelectedDay(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Receitas</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--success)' }}>+R$ {dayIncomes.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Despesas</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--danger)' }}>-R$ {dayExpenses.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Saldo Dia</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: dayBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  R$ {Math.abs(dayBalance).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                </div>
              </div>
            </div>

            {dayMarkers.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Cartões</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {dayMarkers.map((m, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {m.type === 'CLOSING' ? (
                         <><span style={{ color: m.color || 'var(--text-muted)' }}>🔒</span> {m.cardName} — Fatura fecha hoje</>
                      ) : (
                         <><span style={{ color: 'var(--danger)' }}>📅</span> {m.cardName} — Fatura vence hoje</>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>Lançamentos</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {dayEvents.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>Nenhum lançamento neste dia.</p>
                ) : (
                  dayEvents.map((e, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {e.type === 'INCOME' ? <ArrowUpRight size={16} color="var(--success)" /> : <ArrowDownRight size={16} color="var(--danger)" />}
                        <div>
                          <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {e.description}
                            <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                              {STATUS_CONFIG[e.status] || e.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.category?.name || "Sem categoria"}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: e.type === 'INCOME' ? 'var(--success)' : 'var(--danger)' }}>
                        R$ {e.amount.toLocaleString('pt-BR',{minimumFractionDigits:2})}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ color: 'var(--success)' }}>●</span> Receita</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ color: 'var(--warning)' }}>●</span> Pendente</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ color: 'var(--danger)' }}>●</span> Vencido</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ color: 'var(--text-muted)' }}>●</span> Pago</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span>🔒</span> Fechamento de fatura</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span>📅</span> Vencimento de fatura</div>
        </div>
      </div>

      <style jsx>{`
        .calendar-layout {
          display: grid;
          grid-template-columns: ${selectedDay ? '1fr 320px' : '1fr'};
          gap: 1.5rem;
          transition: all 0.3s ease;
        }
        
        .calendar-cell:hover {
          background: rgba(255,255,255,0.03) !important;
        }

        .marker-pill {
          padding: 0.1rem 0.3rem;
          border-radius: 4px;
          font-size: 0.65rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .event-pill {
          padding: 0.1rem 0.3rem;
          border-radius: 4px;
          font-size: 0.7rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .event-dot {
          display: none;
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .calendar-layout {
            grid-template-columns: 1fr;
          }
          .calendar-cell {
            min-height: 60px !important;
          }
          .event-text {
            display: none;
          }
          .event-pill {
            background: transparent !important;
            padding: 0 !important;
            display: flex;
            justify-content: center;
          }
          .event-dot {
            display: block;
          }
          .marker-pill {
            font-size: 0.55rem;
            text-align: center;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
