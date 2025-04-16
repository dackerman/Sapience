import { useEffect, useRef } from "react";

interface IframeArticleProps {
  content: string;
  title: string;
}

export default function IframeArticle({ content, title }: IframeArticleProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDocument =
      iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDocument) return;

    // Create HTML content for the iframe
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            color: #374151;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
          }
          img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
          }
          pre {
            overflow-x: auto;
            background-color: #f3f4f6;
            padding: 0.75rem;
            border-radius: 0.375rem;
          }
          a {
            color: #2563eb;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
            line-height: 1.25;
          }
          p {
            margin-top: 0;
            margin-bottom: 1rem;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;

    // Write the content to the iframe
    iframeDocument.open();
    iframeDocument.write(htmlContent);
    iframeDocument.close();
  }, [content, title]);

  return (
    <div className="iframe-article-container" style={{ position: "relative" }}>
      <iframe
        ref={iframeRef}
        title={title}
        className="article-iframe"
        style={{
          width: "100%",
          height: "1000px",
          border: "none",
          overflow: "hidden",
          backgroundColor: "transparent",
        }}
      />
      {/* Gradient overlay to fade out content */}
      <div
        className="absolute inset-x-0 bottom-0 h-12"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
