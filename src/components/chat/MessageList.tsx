import React, { useEffect, useRef } from 'react';
import { IonContent } from '@ionic/react';
import { FluxerMessage } from '../../types/fluxer';
import { MessageItem } from './MessageItem';
import { SkeletonMessage } from '../ui/SkeletonMessage';
import './MessageList.css';

const GROUP_THRESHOLD_MS = 7 * 60 * 1_000; // 7 minutes

function shouldGroup(prev: FluxerMessage, curr: FluxerMessage): boolean {
  if (prev.author.id !== curr.author.id) return false;
  const diff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
  return diff < GROUP_THRESHOLD_MS;
}

interface Props {
  messages: FluxerMessage[];
  loading?: boolean;
  onReactionToggle?: (messageId: string, emoji: string) => void;
  cdnBase?: string;
}

export const MessageList: React.FC<Props> = ({
  messages,
  loading = false,
  onReactionToggle,
  cdnBase,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flx-message-list">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonMessage key={i} lines={i % 3 === 0 ? 1 : 2} showAvatar={i % 3 !== 2} />
        ))}
      </div>
    );
  }

  return (
    <IonContent className="flx-message-list-content">
      <div className="flx-message-list">
        {messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const isGrouped = !!prev && shouldGroup(prev, msg);
          return (
            <MessageItem
              key={msg.id}
              message={msg}
              isGrouped={isGrouped}
              onReactionToggle={onReactionToggle}
              cdnBase={cdnBase}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
    </IonContent>
  );
};
