# Servidor de conversión de tono (sin anuncios)

Convierte vídeos de YouTube a MP3 o MP4 con yt-dlp y ffmpeg. Tu web le pide la conversión, ve el progreso y descarga el archivo. No hay anuncios ni webs de terceros por medio.

## Subirlo gratis a Render (unos 10 minutos)

1. **Pasa el proyecto a GitHub.** En Lovable: botón de GitHub (arriba a la derecha) → *Connect* → crea el repositorio.
2. **Crea una cuenta en https://render.com** (gratis, puedes entrar con GitHub).
3. **New → Web Service** → elige el repositorio de tono.
4. Rellena:
   - **Root Directory:** `converter-server`
   - **Language / Runtime:** `Docker`
   - **Instance Type:** `Free`
5. En **Environment Variables** añade:
   - `ALLOWED_ORIGINS` = `https://xavimp3.lovable.app,https://id-preview--6bf4fb8e-460f-4d27-bb58-4a8c2c7891e5.lovable.app`
6. **Create Web Service.** Espera a que diga *Live* y copia la dirección (algo como `https://tono-converter.onrender.com`).
7. Abre esa dirección + `/health`. Si ves `{"ok":true,...}`, funciona.
8. **Pásale esa dirección a Lovable** en el chat para conectarla a la web.

> En el plan gratis el servidor se duerme a los 15 minutos sin uso. La primera conversión después tarda ~1 minuto en arrancar ("conectando con el servidor").

## Si sale "YouTube ha bloqueado el servidor"

YouTube a veces bloquea los servidores en la nube. Se arregla con cookies de una cuenta de YouTube:

1. Usa **una cuenta de Google secundaria**, no la tuya principal (puede acabar bloqueada).
2. Instala la extensión **"Get cookies.txt LOCALLY"** en Chrome.
3. Abre una **ventana de incógnito**, permite la extensión en incógnito y entra en youtube.com con esa cuenta.
4. Abre la extensión → **Export** (formato Netscape) y **cierra la ventana de incógnito** enseguida (si sigues navegando, YouTube invalida esas cookies).
5. En Render → tu servicio → **Environment** → **Secret Files** → **Add Secret File**:
   - Filename: `cookies.txt`
   - Contents: pega **todo** el archivo.
6. Guarda y pulsa **Manual Deploy → Deploy latest commit**.
7. Abre `/health`: en `cookies` debe salir `"source":"secret_file"` y `"logged_in":true`.

(También vale la variable `YTDLP_COOKIES`, pero al pegar en ese campo a veces se rompe el formato.)

Las cookies caducan con el tiempo. Si vuelve el error, repite los pasos 3 a 6.

## Ajustes opcionales

| Variable | Por defecto | Qué hace |
| --- | --- | --- |
| `MAX_DURATION_SECONDS` | `5400` | Duración máxima del vídeo (90 min) |
| `MAX_ACTIVE_JOBS` | `3` | Conversiones a la vez |
| `JOB_TTL_SECONDS` | `1800` | Cuánto se guarda un archivo antes de borrarlo |

yt-dlp se actualiza solo cada vez que el servidor arranca. Si algo deja de funcionar, en Render pulsa **Manual Deploy → Restart**.

## Probarlo en tu ordenador

```bash
docker build -t tono-converter .
docker run -p 8000:8000 tono-converter
# http://localhost:8000/health
```
