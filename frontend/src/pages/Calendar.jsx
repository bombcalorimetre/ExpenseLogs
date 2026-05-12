import React, { useEffect, useState } from 'react';
import { analyticsAPI, transactionsAPI } from '../../services/api';
import Header from '../Layout/Header';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function Calendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [calData, setCalData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTxs, setSelectedTxs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [overview, setOverview] = useState(null);
  const [velocity, setVelocity] = useState([]);

  useEffect(() => {
    const monthStr = String(month + 1).padStart(2, '0');
    Promise.all([
      analyticsAPI.calendar(year, monthStr),
      analyticsAPI.goals(),
      analyticsAPI.overview(),
      analyticsAPI.spendingVelocity(),
    ]).then(([cal, g, ov, vel]) => {
      setCalData(cal.data);
      setGoals(g.data);
      setOverview(ov.data);
      setVelocity(vel.data);
    });
  }, [year, month]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleDayClick = async (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    const res = await transactionsAPI.list({ from: dateStr, to: dateStr, limit: 20 });
    setSelectedTxs(res.data.transactions);
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calMap = {};
  calData.forEach(d => { calMap[d.date] = d; });

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selDateObj = selectedDate ? calMap[selectedDate] : null;
  const selDow = selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  // Budget progress
  const monthlySpent = overview?.current_month?.total_expense || 0;
  const monthlyBudget = 2500;
  const budgetPct = Math.min(100, (monthlySpent / monthlyBudget * 100)).toFixed(0);

  return (
    <div style={styles.page}>
      <Header title="Expense Calendar" />
      <div style={styles.content}>
        <div style={styles.grid}>
          {/* Calendar */}
          <div style={styles.calCard}>
            {/* Month nav */}
            <div style={styles.monthNav}>
              <button onClick={prevMonth} style={styles.navBtn}>‹</button>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                {MONTHS[month]} {year}
              </span>
              <button onClick={nextMonth} style={styles.navBtn}>›</button>
            </div>
            {/* Day headers */}
            <div style={styles.dayHeaders}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '8px 0' }}>{d}</div>
              ))}
            </div>
            {/* Cells */}
            <div style={styles.calGrid}>
              {cells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const data = calMap[dateStr];
                const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                const isSelected = selectedDate === dateStr;
                return (
                  <div
                    key={day}
                    onClick={() => handleDayClick(day)}
                    style={{
                      ...styles.calCell,
                      ...(isSelected ? styles.calCellSelected : {}),
                      ...(isToday && !isSelected ? styles.calCellToday : {}),
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400 }}>{day}</span>
                    {data && (
                      <div style={{ marginTop: 2 }}>
                        {data.expenses > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>
                            -{fmt(data.expenses)}
                          </div>
                        )}
                        {data.income > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>
                            +{fmt(data.income)}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 2, marginTop: 2, justifyContent: 'center' }}>
                          {Array(Math.min(3, data.count)).fill(0).map((_, j) => (
                            <div key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: j === 0 ? 'var(--accent)' : j === 1 ? 'var(--blue)' : 'var(--red)' }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Velocity chart */}
            <div style={styles.velocitySection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Spending Momentum</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily expense velocity (30 days)</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
                {velocity.slice(-30).map((d, i) => {
                  const maxSpent = Math.max(...velocity.map(v => v.spent), 1);
                  const pct = (d.spent / maxSpent) * 100;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{ height: `${Math.max(4, pct)}%`, background: pct > 70 ? 'var(--accent)' : 'rgba(0,212,170,0.3)', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} />
                    </div>
                  );
                })}
                {velocity.length === 0 && Array(30).fill(0).map((_, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ height: `${10 + Math.random() * 40}%`, background: 'rgba(0,212,170,0.2)', borderRadius: '2px 2px 0 0' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={styles.rightPanel}>
            {/* Selected day */}
            {selectedDate ? (
              <div style={styles.dayCard}>
                <div style={styles.dayHeader}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>{selDow}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selDateObj?.count || 0} Transactions</div>
                  </div>
                  {selDateObj && (
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>
                      -{fmt(selDateObj.expenses)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  {selectedTxs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>No transactions this day</div>
                  ) : selectedTxs.map(tx => (
                    <div key={tx.id} style={styles.txRow}>
                      <div style={{ ...styles.txIcon, background: tx.category_color ? `${tx.category_color}22` : 'var(--bg-card-hover)' }}>
                        {tx.category_icon || '💳'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.merchant}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.category_name} • {tx.time || ''}</div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: tx.type === 'income' ? 'var(--accent)' : 'var(--red)' }}>
                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ ...styles.dayCard, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, minHeight: 140 }}>
                <span style={{ fontSize: 28 }}>📅</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click a day to see transactions</span>
              </div>
            )}

            {/* Monthly budget */}
            <div style={styles.budgetCard}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>MONTHLY BUDGET</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Spent so far</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>${monthlySpent.toFixed(2)} / $2,500.00</span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ width: `${budgetPct}%`, height: '100%', background: Number(budgetPct) > 85 ? 'var(--red)' : 'var(--accent)', borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>
                ↓ {Math.abs(overview?.mom_change || 12)}% lower than last month
              </div>
            </div>

            {/* Goals */}
            {goals.slice(0, 1).map(goal => (
              <div key={goal.id} style={styles.goalCard}>
                <div style={styles.goalBadge}>FINANCIAL GOAL</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{goal.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{goal.description}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700 }}>${(goal.current_amount || 0).toLocaleString()}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Goal: ${(goal.target_amount || 0).toLocaleString()}</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ width: `${Math.min(100, (goal.current_amount / goal.target_amount) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  content: { flex: 1, overflow: 'auto', padding: 24 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18, height: '100%' },
  calCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', flexDirection: 'column' },
  monthNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, cursor: 'pointer', padding: '2px 8px', borderRadius: 6 },
  dayHeaders: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, flex: 1, marginTop: 4 },
  calCell: {
    padding: '8px 4px', minHeight: 64, border: '1px solid transparent', borderRadius: 8,
    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
    transition: 'all 0.15s', fontSize: 12,
  },
  calCellSelected: { background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)' },
  calCellToday: { background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)' },
  velocitySection: { marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' },
  rightPanel: { display: 'flex', flexDirection: 'column', gap: 14 },
  dayCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 },
  dayHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 10, borderBottom: '1px solid var(--border)' },
  txRow: { display: 'flex', alignItems: 'center', gap: 10 },
  txIcon: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 },
  budgetCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 },
  progressBar: { height: 6, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' },
  goalCard: {
    background: 'linear-gradient(135deg, rgba(0,212,170,0.08), rgba(79,142,247,0.06))',
    border: '1px solid rgba(0,212,170,0.2)', borderRadius: 'var(--radius-lg)', padding: 18,
  },
  goalBadge: {
    display: 'inline-block', background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.25)',
    borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: 'var(--accent)',
    letterSpacing: '0.08em', marginBottom: 10,
  },
};
