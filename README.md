# Rustic PUB Menu

Menu digital estatico para Rustic PUB construido con Next.js.

## Desarrollo

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Deploy en Netlify

Netlify detecta Next.js y usa su adapter OpenNext automaticamente.

Configuracion:

- Build command: `npm run build`
- Publish directory: `.next`
- Node: `20`

La variable `NEXT_PUBLIC_MENU_URL` define a donde apunta el QR. Por defecto esta configurada como:

```text
https://rusticpub.netlify.app
```

Si el sitio queda con otro dominio, actualizar esa variable en Netlify o en `netlify.toml`.
