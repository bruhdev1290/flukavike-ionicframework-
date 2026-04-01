import React from 'react';
import { Route, Redirect, RouteProps } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Props extends RouteProps {
  component: React.ComponentType<any>;
}

const ProtectedRoute: React.FC<Props> = ({ component: Component, ...rest }) => {
  const { authState } = useAuth();

  // Still booting (splash visible) — render nothing to avoid flash
  if (authState === 'initializing' || authState === 'authenticating') return null;

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
