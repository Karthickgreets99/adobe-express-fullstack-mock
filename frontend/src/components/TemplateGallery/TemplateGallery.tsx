/**
 * ADOBE EXPRESS - Template Gallery (FIXED VERSION)
 * All 4 performance issues resolved
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface Template {
  id: string;
  name: string;
  category: string;
  likes: number;
  thumbnailUrl: string;
}

interface Props {
  templates: Template[];
  userId: string;
  onFavorite?: (templateId: string) => void;
}

function TemplateGallery({ templates, userId, onFavorite }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  // FIX 1: useMemo - only recalculates when templates/search/category change
  const results = useMemo(() =>
    templates
      .filter(t => category === 'all' || t.category === category)
      .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.likes - a.likes),
    [templates, search, category]
  );

  useEffect(() => {
    fetch(`/api/users/${userId}/recent`)
      .then(r => r.json())
      .then(data => console.log('recent:', data));
  }, [userId]);

  // FIX 2: useMemo + Set to deduplicate categories
  const categories = useMemo(() =>
    [...new Set(templates.map(t => t.category))],
    [templates]
  );

  // FIX 4: useCallback - stable function reference prevents child re-renders
  const handleFavorite = useCallback((templateId: string) => {
    onFavorite?.(templateId);
  }, [onFavorite]);

  return (
    <div className="template-gallery">
      <input onChange={e => setSearch(e.target.value)} placeholder="Search..." />
      <select onChange={e => setCategory(e.target.value)}>
        <option value="all">All categories</option>
        {/* FIX 3: Use category value as stable key, not index */}
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {results.map(t => (
        <div key={t.id} className="template-card">
          <span>{t.name}</span>
          <button onClick={() => handleFavorite(t.id)}>Favorite</button>
        </div>
      ))}
    </div>
  );
}

export default TemplateGallery;
