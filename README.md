# Rustic PUB Menu

Menu digital estatico para Rustic PUB construido con Next.js.

## Desarrollo

```bash
npm install
npx prisma generate
npm run dev
```

Abrir `http://localhost:3000`.

## Reservas con Google

El flujo de reservas requiere Google OAuth, reCAPTCHA y las migraciones Prisma aplicadas.

Variables necesarias:

```text
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generar-un-secreto-largo"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="..."
RECAPTCHA_SECRET_KEY="..."
```

En Google Cloud Console configurar el redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

En produccion usar el dominio real, por ejemplo:

```text
https://tu-dominio.com/api/auth/callback/google
```

Aplicar el schema en la base:

```bash
npx prisma migrate deploy
npx prisma generate
```

El endpoint publico de reservas valida sesion Google, reCAPTCHA, limite por usuario, limite por IP y rate limiting antes de crear la reserva.

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
