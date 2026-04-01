import React, { useState } from 'react';
import { FluxerMessage } from '../../types/fluxer';
import { Avatar } from '../ui/Avatar';
import { MessageReactions } from './MessageReactions';
import './MessageItem.css';

interface Props {
  message: FluxerMessage;
  isGrouped: boolean; // true = consecutive message from same author within 7 min — hide avatar/name
  onReactionToggle?: (messageId: string, emoji: string) => void;
  cdnBase?: string;
}

function formatTimestamp(iso: string, relative = false): string {
  const date = new Date(iso);
  const now   = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (relative) {
    if (diffMin < 1)  return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)  return `${diffHr}h ago`;
  }

  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today at ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${timeStr}`;

  return `${date.toLocaleDateString()} ${timeStr}`;
}

export const MessageItem: React.FC<Props> = ({
  message,
  isGrouped,
  onReactionToggle,
  cdnBase = 'https://cdn.fluxer.app',
}) => {
  const [hovered, setHovered] = useState(false);
  const [showAbsolute, setShowAbsolute] = useState(false);

  return (
    <article
      className={`flx-message${isGrouped ? ' flx-message--grouped' : ''} flx-fade-in`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar column — hidden for grouped messages */}
      <div className="flx-message__avatar-col">
        {!isGrouped ? (
          <Avatar user={message.author} size="md" cdnBase={cdnBase} />
        ) : (
          /* Grouped: show compact timestamp on hover */
          <span className={`flx-message__compact-time${hovered ? ' flx-message__compact-time--visible' : ''}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Content column */}
      <div className="flx-message__content">
        {!isGrouped && (
          <div className="flx-message__header">
            <span className="flx-message__author">{message.author.username}</span>
            <button
              className="flx-message__timestamp"
              onClick={() => setShowAbsolute(v => !v)}
              title={showAbsolute ? 'Show relative' : 'Show exact time'}
            >
              {formatTimestamp(message.timestamp, !showAbsolute)}
            </button>
          </div>
        )}

        <p className="flx-message__text">{message.content}</p>

        {(message.reactions?.length ?? 0) > 0 && (
          <MessageReactions
            reactions={message.reactions!}
            onToggle={emoji => onReactionToggle?.(message.id, emoji)}
          />
        )}
      </div>

      {/* Ephemeral action bar — Ivory-style, appears on hover */}
      {hovered && (
        <div className="flx-message__actions flx-fade-in">
          <button className="flx-message__action" title="Add reaction">😊</button>
          <button className="flx-message__action" title="Reply">↩</button>
          <button className="flx-message__action" title="More">···</button>
        </div>
      )}
    </article>
  );
};
