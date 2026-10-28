import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// The page shell for the web build. These tags are what let an iPhone treat the site as
// an installable app: "Add to Home Screen" then opens it full-screen with its own icon.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
        />
        <title>CUS Shift</title>
        <meta name="description" content="Check in and out, see your shift and break times." />
        <meta name="theme-color" content="#090b11" />

        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="CUS Shift" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body{background:#090b11;overscroll-behavior:none;-webkit-tap-highlight-color:transparent}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
