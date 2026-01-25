import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from "react-router-dom";
import App from './App';
import AuthProvider from './components/AuthProvider';
import ThemeProvider from './components/ThemeProvider';
import './styles/variables.css';

export function render(url) {
  return ReactDOMServer.renderToString(
    <StaticRouter location={url}>
        <ThemeProvider>
          <AuthProvider isServer={true}>
            {(user) => <App user={user} />}
          </AuthProvider>
        </ThemeProvider>
    </StaticRouter>
  );
}
