import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import AuthProvider from "./components/AuthProvider";
import ThemeProvider from "./components/ThemeProvider";
import "./styles/variables.css";
import "./styles/index.css";

export function meta() {
  return [
    { title: "RecipeLab" },
    { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "theme-color", content: "#212121", media: "(prefers-color-scheme: dark)" },
    { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
  ];
}

export function links() {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" },
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  ];
}

export function Layout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <script
            dangerouslySetInnerHTML={{
                __html: `
                (function () {
                var saved = localStorage.getItem('darkMode');
                var isDark = saved !== null ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                })();
                `
            }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
      <ThemeProvider>
        <AuthProvider>
            <Outlet />
        </AuthProvider>
      </ThemeProvider>
  );
}
