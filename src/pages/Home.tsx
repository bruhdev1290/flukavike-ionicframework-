import React, { useState, useEffect } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
} from '@ionic/react';
import { AppShell } from '../components/layout/AppShell';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';
import { FluxerGuild, FluxerCategory, FluxerMessage } from '../types/fluxer';
import './Home.css';

// Stub data — replace with real gateway/API data
const STUB_GUILDS: FluxerGuild[] = [
  { id: '1', name: 'Fluxer HQ', icon: null, owner_id: '0', unread: true, mention_count: 3 },
  { id: '2', name: 'Dev Corner', icon: null, owner_id: '0' },
];

const STUB_CATEGORIES: FluxerCategory[] = [
  {
    id: 'cat-1', name: 'Text Channels', position: 0,
    channels: [
      { id: 'ch-1', name: 'general',   type: 'text', unread: true, mention_count: 2 },
      { id: 'ch-2', name: 'off-topic', type: 'text' },
      { id: 'ch-3', name: 'announcements', type: 'announcement' },
    ],
  },
  {
    id: 'cat-2', name: 'Voice Channels', position: 1,
    channels: [
      { id: 'ch-4', name: 'General Voice', type: 'voice' },
    ],
  },
];

const STUB_MESSAGES: FluxerMessage[] = [
  {
    id: '1', channel_id: 'ch-1',
    author: { id: '100', username: 'alice', discriminator: '0001', avatar: null },
    content: 'hey everyone! excited to try out flukavike 🎉',
    timestamp: new Date(Date.now() - 12 * 60_000).toISOString(),
    reactions: [{ count: 5, me: false, emoji: { name: '🎉' } }],
  },
  {
    id: '2', channel_id: 'ch-1',
    author: { id: '100', username: 'alice', discriminator: '0001', avatar: null },
    content: 'the UI is looking really clean',
    timestamp: new Date(Date.now() - 11 * 60_000).toISOString(),
  },
  {
    id: '3', channel_id: 'ch-1',
    author: { id: '101', username: 'bob', discriminator: '0042', avatar: null },
    content: 'agreed! love the Discord + Ivory aesthetic. That tab bar animation is chef\'s kiss',
    timestamp: new Date(Date.now() - 8 * 60_000).toISOString(),
    reactions: [
      { count: 3, me: true,  emoji: { name: '👌' } },
      { count: 7, me: false, emoji: { name: '❤️' } },
    ],
  },
  {
    id: '4', channel_id: 'ch-1',
    author: { id: '102', username: 'carol', discriminator: '0007', avatar: null },
    content: 'the spring animations feel so native on iOS. can\'t believe this is Ionic',
    timestamp: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
];

const Home: React.FC = () => {
  const [activeGuildId, setActiveGuildId]     = useState<string | null>('1');
  const [activeChannelId, setActiveChannelId] = useState<string | null>('ch-1');
  const [messages, setMessages]               = useState<FluxerMessage[]>(STUB_MESSAGES);
  const [error, setError]                     = useState<Error | null>(null);

  useEffect(() => {
    console.log('[Home] Component mounted');
    return () => console.log('[Home] Component unmounting');
  }, []);

  // Error boundary for this component
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error('[Home] Global error:', e.error);
      setError(e.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <h1>Something went wrong</h1>
          <pre>{error.message}</pre>
        </IonContent>
      </IonPage>
    );
  }

  const activeChannel = STUB_CATEGORIES
    .flatMap(c => c.channels)
    .find(c => c.id === activeChannelId);

  const handleSend = (content: string) => {
    const newMsg: FluxerMessage = {
      id: Date.now().toString(),
      channel_id: activeChannelId ?? '',
      author: { id: 'me', username: 'you', discriminator: '0000', avatar: null },
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMsg]);
  };

  return (
    <IonPage>
      <AppShell
        guilds={STUB_GUILDS}
        categories={STUB_CATEGORIES}
        activeGuildId={activeGuildId}
        activeChannelId={activeChannelId}
        onGuildSelect={setActiveGuildId}
        onChannelSelect={setActiveChannelId}
      >
        <IonHeader className="flx-channel-header">
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton />
            </IonButtons>
            <IonTitle>
              {activeChannel ? `# ${activeChannel.name}` : 'Fluxer'}
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="flx-channel-view">
          <MessageList messages={messages} />
          <MessageInput
            channelName={activeChannel?.name}
            onSend={handleSend}
          />
        </div>
      </AppShell>
    </IonPage>
  );
};

export default Home;
