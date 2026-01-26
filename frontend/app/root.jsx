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
    { property: "og:title", content: "RecipeLab - AI Recipe Generator" },
    { property: "og:description", content: "Generate delicious recipes instantly with AI." },
    { property: "og:image", content: "/og-image.svg" },
    { property: "og:url", content: "https://recipelab.app" },
    { property: "og:site_name", content: "RecipeLab" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "RecipeLab - AI Recipe Generator" },
    { name: "twitter:description", content: "Generate delicious recipes instantly with AI." },
    { name: "twitter:image", content: "/og-image.svg" },
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
