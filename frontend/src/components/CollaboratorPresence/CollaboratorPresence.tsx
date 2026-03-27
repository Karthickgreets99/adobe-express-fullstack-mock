/**
 * ADOBE EXPRESS - Collaborator Presence (FIXED VERSION)
 * WebSocket only, proper cleanup, merge by userId
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
    // FIX: WebSocket only - no redundant polling
    const socket = new WebSocket(`wss://presence.adobe-express.com?design=${designId}`);

    socket.onmessage = (event) => {
      const update: Collaborator = JSON.parse(event.data);
      // FIX: Merge by userId instead of appending forever
      setCollaborators(prev => {
        const exists = prev.find(c => c.userId === update.userId);
        if (exists) {
          return prev.map(c => c.userId === update.userId ? update : c);
        }
        return [...prev, update];
      });
    };

    socket.onclose = () => {
      console.log('Presence socket closed for design:', designId);
    };

    // FIX: Cleanup on unmount - no memory leak
    return () => {
      socket.close();
    };
  }, [designId]);

  return (
    <div className="presence-bar">
      {/* FIX: Use userId as stable key */}
      {collaborators.map(c => (
        <img key={c.userId} src={c.avatarUrl} alt={c.name} title={c.name} />
      ))}
    </div>
  );
}

export default CollaboratorPresence;
