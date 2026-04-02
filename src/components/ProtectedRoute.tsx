import React from 'react';
import { Route, Redirect, RouteProps } from 'react-router-dom';
import { IonPage, IonContent, IonSpinner } from '@ionic/react';
import { useAuth } from '../hooks/useAuth';

interface Props extends RouteProps {
  component: React.ComponentType<any>;
}

const ProtectedRoute: React.FC<Props> = ({ component: Component, ...rest }) => {
  const { authState } = useAuth();

  // Still booting (splash visible) — render nothing to avoid flash
  if (authState === 'initializing' || authState === 'authenticating') {
    return (
      <Route
        {...rest}
        render={() => (
          <IonPage>
            <IonContent className="ion-padding" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IonSpinner name="crescent" />
            </IonContent>
          </IonPage>
        )}
      />
    );
  }

  return (
    <Route
      {...rest}
      render={props =>
        authState === 'authenticated'
          ? <Component {...props} />
          : <Redirect to={{ pathname: '/login', state: { from: props.location } }} />
      }
    />
  );
};

export default ProtectedRoute;
