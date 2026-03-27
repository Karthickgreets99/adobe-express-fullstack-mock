/**
 * ADOBE EXPRESS - Template Gallery (BUGGY VERSION)
 * CODE DIAGNOSE EXERCISE: Find the 4 performance bugs
 * Difficulty: P1 - Performance
 */
import React, { useState, useEffect } from 'react';

interface Template {
  id: string;
  name: string;
  category: string;
  likes: number;
  thumbnailUrl: string;
}

function TemplateGallery({ templates, userId }: { templates: Template[]; userId: string }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  // BUG 1: Runs on every render - needs useMemo([templates, search, category])
  const results = templates
    .filter(t => category === 'all' || t.category === category)
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.likes - a.likes);

  useEffect(() => {
    fetch(`/api/users/${userId}/recent`)
      .then(r => r.json())
      .then(data => console.log('recent:', data));
  }, [userId]);

  // BUG 2: Recalculates every render AND has duplicate categories
  const categories = templates.map(t => t.category);

  return (
    <div>
      <input onChange={e => setSearch(e.target.value)} placeholder="Search..." />
      <select onChange={e => setCategory(e.target.value)}>
        {/* BUG 3: key=index is an anti-pattern */}
        {categories.map((c, i) => <option key={i}>{c}</option>)}
      </select>
      {results.map(t => (
        <div key={t.id}>
          <span>{t.name}</span>
          {/* BUG 4: New function reference every render - forces TemplateCard re-render */}
          <button onClick={() => console.log('fav', t.id, userId)}>Favorite</button>
        </div>
      ))}
    </div>
  );
}

export default TemplateGallery;
