import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header({ title, subtitle, actions }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/history?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header style={styles.header}>
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          style={styles.search}
          placeholder="Search transactions, reports..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </form>
      <div style={styles.right}>
        {actions}
        <button style={styles.iconBtn} title="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span style={styles.badge} />
        </button>
        <button style={styles.iconBtn} title="Help">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-secondary)', flexShrink: 0,
  },
  searchForm: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 380 },
  search: {
    background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)',
    fontSize: 13, width: '100%',
  },
  right: { display: 'flex', alignItems: 'center', gap: 6 },
  iconBtn: {
    background: 'none', border: 'none', color: 'var(--text-secondary)',
    cursor: 'pointer', padding: '6px', borderRadius: 8, display: 'flex',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
    transition: 'var(--transition)',
  },
  badge: {
    position: 'absolute', top: 6, right: 6, width: 6, height: 6,
    borderRadius: '50%', background: 'var(--accent)',
  },
};
