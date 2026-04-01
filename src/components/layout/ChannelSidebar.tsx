import React, { useState } from 'react';
import { chevronDown, chevronForward, volumeHighOutline, chatboxOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { FluxerGuild, FluxerCategory, FluxerChannel } from '../../types/fluxer';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import './ChannelSidebar.css';

interface Props {
  guild: FluxerGuild | null;
  categories: FluxerCategory[];
  activeChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
}

const ChannelRow: React.FC<{
  channel: FluxerChannel;
  isActive: boolean;
  onClick: () => void;
}> = ({ channel, isActive, onClick }) => (
  <button
    className={`flx-channel-row flx-pressable${isActive ? ' flx-channel-row--active' : ''}${channel.unread ? ' flx-channel-row--unread' : ''}`}
    onClick={onClick}
    aria-label={channel.name}
  >
    <IonIcon
      icon={channel.type === 'voice' ? volumeHighOutline : chatboxOutline}
      className="flx-channel-row__icon"
    />
    <span className="flx-channel-row__name">{channel.name}</span>
    {(channel.mention_count ?? 0) > 0 && (
      <span className="flx-channel-row__badge">{channel.mention_count}</span>
    )}
  </button>
);

export const ChannelSidebar: React.FC<Props> = ({
  guild,
  categories,
  activeChannelId,
  onChannelSelect,
}) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { user, logout } = useAuth();

  const toggleCategory = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside className="flx-channel-sidebar">
      {/* Guild header */}
      <div className="flx-channel-sidebar__header">
        <span className="flx-channel-sidebar__guild-name">{guild?.name ?? 'Direct Messages'}</span>
      </div>

      {/* Channel list */}
      <div className="flx-channel-sidebar__list">
        {categories.map(cat => (
          <div key={cat.id} className="flx-category">
            <button
              className="flx-category__header"
              onClick={() => toggleCategory(cat.id)}
            >
              <IonIcon
                icon={collapsed[cat.id] ? chevronForward : chevronDown}
                className="flx-category__chevron"
              />
              <span className="flx-category__name">{cat.name.toUpperCase()}</span>
            </button>

            {!collapsed[cat.id] && cat.channels.map(ch => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                isActive={ch.id === activeChannelId}
                onClick={() => onChannelSelect(ch.id)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Current user bar */}
      {user && (
        <div className="flx-user-bar">
          <Avatar user={user} status="online" size="sm" />
          <div className="flx-user-bar__info">
            <span className="flx-user-bar__name">{user.username}</span>
            <span className="flx-user-bar__tag">#{user.discriminator}</span>
          </div>
          <button className="flx-user-bar__logout flx-pressable" onClick={logout} title="Log out">
            ↩
          </button>
        </div>
      )}
    </aside>
  );
};
