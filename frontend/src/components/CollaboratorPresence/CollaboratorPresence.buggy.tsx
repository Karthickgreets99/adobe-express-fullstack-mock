/**
 * ADOBE EXPRESS - Collaborator Presence (BUGGY VERSION)
 * CODE DIAGNOSE EXERCISE: Memory leak + logic bugs
 * Difficulty: P1 - Memory/Reliability
 */
import React, { useState, useEffect } from 'react';

interface Collaborator {
  userId: string;
  name: string;
  avatarUrl: string;
  lastSeen: Date;
}

function CollaboratorPresence({ designId }: { designId: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    // BUG 1: No cleanup - interval never cleared = memory leak
    const interval = setInterval(() => {
      fetch(`/api/designs/${designId}/presence`)
        .then(r => r.json())
        .then(data => setCollaborators(data));
    }, 2000);

    // BUG 2: WebSocket never closed - new socket on every re-mount
    const socket = new WebSocket('wss://presence.adobe-express.com');
    socket.onmessage = (event) => {
      const update = JSON.parse(event.data);
      // BUG 3: Appends forever instead of merging by userId
      setCollaborators(prev => [...prev, update]);
    };

    // BUG 4: Polling + WebSocket together is redundant
  }, []);

  return (
    <div className="presence-bar">
      {/* BUG 5: key=index - unstable if order changes */}
      {collaborators.map((c, index) => (
        <img key={index} src={c.avatarUrl} alt={c.name} title={c.name} />
      ))}
    </div>
  );
}

export default CollaboratorPresence;
