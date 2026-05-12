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
};
