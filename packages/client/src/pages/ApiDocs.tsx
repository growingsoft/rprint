import React, { useEffect, useRef } from 'react';
import '../styles/ApiDocs.css';

declare global {
  interface Window {
    SwaggerUIBundle: any;
    SwaggerUIStandalonePreset: any;
  }
}

export const ApiDocs: React.FC = () => {
  const swaggerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Load Swagger UI CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(cssLink);

    // Load Swagger UI JS
    const bundleScript = document.createElement('script');
    bundleScript.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
    bundleScript.async = true;

    const presetScript = document.createElement('script');
    presetScript.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js';
    presetScript.async = true;

    bundleScript.onload = () => {
      presetScript.onload = () => {
        if (window.SwaggerUIBundle && swaggerRef.current) {
          window.SwaggerUIBundle({
            url: '/api/openapi.yaml',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              window.SwaggerUIBundle.presets.apis,
              window.SwaggerUIStandalonePreset
            ],
            plugins: [
              window.SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: 'BaseLayout',
            defaultModelsExpandDepth: 1,
            defaultModelExpandDepth: 1,
            docExpansion: 'list',
            filter: true,
            tryItOutEnabled: true,
            persistAuthorization: true
          });
        }
      };
      document.body.appendChild(presetScript);
    };

    document.body.appendChild(bundleScript);

    return () => {
      // Cleanup scripts on unmount
      const scripts = document.querySelectorAll('script[src*="swagger-ui"]');
      scripts.forEach(s => s.remove());
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    // For Swagger UI, we need to expand and scroll to the tag
    const element = document.querySelector(`[data-tag="${sectionId}"]`) ||
                    document.getElementById(sectionId) ||
                    document.querySelector(`#operations-tag-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Try to expand the section if it's collapsed
      const expandBtn = element.querySelector('.expand-operation');
      if (expandBtn) (expandBtn as HTMLElement).click();
    }
  };

  return (
    <div className="api-docs-page">
      <div className="api-docs-header">
        <h1>API Documentation</h1>
        <p>RPrint Remote Printing API - Print from anywhere to printers connected to growingsoft.net</p>
      </div>

      <div className="api-docs-quicklinks">
        <button onClick={() => scrollToSection('Authentication')}>Authentication</button>
        <button onClick={() => scrollToSection('Print_Jobs')}>Print Jobs</button>
        <button onClick={() => scrollToSection('Printers')}>Printers</button>
        <button onClick={() => scrollToSection('Webhooks')}>Webhooks</button>
        <a href="/api/openapi.yaml" download className="download-link">Download OpenAPI Spec</a>
        <a href="https://github.com/growingsoft/rprint" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>

      <div id="swagger-ui" ref={swaggerRef} className="swagger-container"></div>
    </div>
  );
};
