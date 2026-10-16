export function GET() {
  // Página independiente para que los estilos y React internos de Swagger no
  // interfieran con el dashboard. Los recursos se sirven desde esta aplicación.
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Swagger · Aqua Monitor</title>
  <link rel="stylesheet" href="/api/docs/assets/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .docs-header { padding: 18px 24px; background: #102e40; color: white; font: 14px/1.7 Arial,sans-serif; }
    .docs-header strong { margin-right: 24px; font-size: 18px; }
    .docs-header a { color: #a5f3fc; margin-right: 18px; }
    #swagger-status { padding: 20px 24px; font: 14px/1.6 Arial,sans-serif; }
  </style>
</head>
<body>
  <header class="docs-header">
    <strong>Aqua Monitor · Swagger</strong>
    <a href="/login">Iniciar sesión en la web</a>
    <a href="/dashboard">Dashboard</a>
    <a href="/api/openapi" target="_blank" rel="noopener">OpenAPI JSON</a>
  </header>
  <main>
    <p id="swagger-status" role="status">Cargando documentación interactiva…</p>
    <div id="swagger-ui"></div>
  </main>
  <script src="/api/docs/assets/swagger-ui-bundle.js"></script>
  <script>
    if (typeof SwaggerUIBundle !== 'function') {
      document.getElementById('swagger-status').textContent = 'No se pudo cargar Swagger. Recarga la página o consulta el enlace OpenAPI JSON.';
    } else {
      SwaggerUIBundle({
        url: '/api/openapi',
        dom_id: '#swagger-ui',
        deepLinking: true,
        filter: true,
        displayRequestDuration: true,
        persistAuthorization: false,
        validatorUrl: null,
        queryConfigEnabled: false,
        withCredentials: true,
        defaultModelsExpandDepth: -1,
        requestInterceptor: function(request) {
          request.credentials = 'same-origin';
          return request;
        },
        onComplete: function() {
          document.getElementById('swagger-status').hidden = true;
        }
      });
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
