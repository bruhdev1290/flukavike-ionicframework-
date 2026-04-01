import React from 'react';
import { addOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { FluxerGuild } from '../../types/fluxer';
import './ServerRail.css';

interface Props {
  guilds: FluxerGuild[];
  activeGuildId: string | null;
  onGuildSelect: (guildId: string) => void;
  onAddServer?: () => void;
  cdnBase?: string;
}

export const ServerRail: React.FC<Props> = ({
  guilds,
  activeGuildId,
  onGuildSelect,
  onAddServer,
  cdnBase = 'https://cdn.fluxer.app',
}) => {
  const handleSelect = async (id: string) => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onGuildSelect(id);
  };

  return (
    <aside className="flx-server-rail">
      {/* DM / Home pill */}
      <button
        className={`flx-server-rail__icon flx-pressable${!activeGuildId ? ' flx-server-rail__icon--active' : ''}`}
        onClick={() => handleSelect('@me')}
        aria-label="Direct Messages"
      >
        <span className="flx-server-rail__home">💬</span>
      </button>

      <div className="flx-server-rail__divider" />

      {/* Guild list */}
      {guilds.map(guild => {
        const isActive = guild.id === activeGuildId;
        const iconUrl = guild.icon
          ? `${cdnBase}/icons/${guild.id}/${guild.icon}.webp?size=96`
          : null;

        return (
          <div key={guild.id} className="flx-server-rail__entry">
            {/* Active indicator pill */}
            <span className={`flx-server-rail__pip${isActive ? ' flx-server-rail__pip--active' : guild.unread ? ' flx-server-rail__pip--unread' : ''}`} />

            <button
              className={`flx-server-rail__icon flx-pressable${isActive ? ' flx-server-rail__icon--active' : ''}`}
              onClick={() => handleSelect(guild.id)}
              aria-label={guild.name}
              title={guild.name}
            >
              {iconUrl ? (
                <img src={iconUrl} alt={guild.name} className="flx-guild-icon" />
              ) : (
                <span className="flx-server-rail__abbr">
                  {guild.name.split(' ').map(w => w[0]).join('').slice(0, 3)}
                </span>
              )}

              {(guild.mention_count ?? 0) > 0 && (
                <span className="flx-server-rail__mention">
                  {guild.mention_count! > 99 ? '99+' : guild.mention_count}
                </span>
              )}
            </button>
          </div>
        );
      })}

      {/* Add server */}
      {onAddServer && (
        <button
          className="flx-server-rail__add flx-pressable"
          onClick={onAddServer}
          aria-label="Add a server"
        >
          <IonIcon icon={addOutline} />
        </button>
      )}
    </aside>
  );
};
