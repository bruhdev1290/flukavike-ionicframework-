import React, { useState, ReactNode } from 'react';
import { IonContent, IonMenu, IonPage, IonSplitPane } from '@ionic/react';
import { ServerRail } from './ServerRail';
import { ChannelSidebar } from './ChannelSidebar';
import { BottomTabBar } from './BottomTabBar';
import { FluxerGuild, FluxerCategory } from '../../types/fluxer';
import './AppShell.css';

interface Props {
  guilds: FluxerGuild[];
  categories: FluxerCategory[];
  activeGuildId: string | null;
  activeChannelId: string | null;
  onGuildSelect: (id: string) => void;
  onChannelSelect: (id: string) => void;
  children: ReactNode;
}

export const AppShell: React.FC<Props> = ({
  guilds,
  categories,
  activeGuildId,
  activeChannelId,
  onGuildSelect,
  onChannelSelect,
  children,
}) => {
  const activeGuild = guilds.find(g => g.id === activeGuildId) ?? null;

  return (
    <IonPage className="flx-app-shell">
      {/* Desktop: side-by-side layout via IonSplitPane */}
      <IonSplitPane contentId="main-content" when="lg">
        <IonMenu contentId="main-content" menuId="sidebar" className="flx-sidebar-menu">
          <IonContent>
            <div className="flx-sidebar">
              <ServerRail
                guilds={guilds}
                activeGuildId={activeGuildId}
                onGuildSelect={onGuildSelect}
              />
              <ChannelSidebar
                guild={activeGuild}
                categories={categories}
                activeChannelId={activeChannelId}
                onChannelSelect={onChannelSelect}
              />
            </div>
          </IonContent>
        </IonMenu>

        <IonPage id="main-content" className="flx-main-content">
          {children}
          {/* Mobile: bottom tab bar */}
          <BottomTabBar />
        </IonPage>
      </IonSplitPane>
    </IonPage>
  );
};
