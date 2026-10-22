# PARALLAX MCP Server 🎬 (v1.2.0)

Servidor oficial de **Model Context Protocol (MCP)** para conectar **PARALLAX AI Studio** con agentes de inteligencia artificial como **Claude Code**, **Claude Desktop**, **Cursor**, **Google Antigravity**, **OpenCode**, **Codex** y **DeepSeek Harness**.

Desarrollado por el **Departamento de Tecnología de URBINA ASESORIA E INVERSIONES SAC** ([grupourbina.pe/urbina#tecnologia](https://grupourbina.pe/urbina#tecnologia)).

---

## ⚡ Herramientas Disponibles (Tools)

| Herramienta | Parámetros Clave | Descripción |
| :--- | :--- | :--- |
| **`parallax_generate_image`** | `prompt`, `model` (default `'seedream-5.0'`), `resolution` (default `'2K'`), `aspectRatio` (default `'16:9'`), `imageUrl`, `negativePrompt` | Genera imágenes de alta fidelidad 2K/4K. Soporta Text-to-Image e Image-to-Image (`imageUrl` como referencia de sujeto o estilo). Espera automáticamente el resultado y devuelve la URL final. |
| **`parallax_generate_video`** | `prompt`, `model` (auto-detectado o `'hailuo-2.3-pro-i2v'`), `duration` (5–10s), `resolution` (default `'1080p'`), `imageUrl` (start frame), `endFrameUrl`, `referenceImageUrl` | Genera videos cinemáticos (Text-to-Video o Image-to-Video). Admite fotograma de inicio (`imageUrl`), fotograma final (`endFrameUrl`) y referencia de personaje (`referenceImageUrl`). Devuelve el archivo MP4 listo. |
| **`parallax_list_models`** | `kind` (`'image'`, `'video'`, `'all'`) | Lista los más de 220 modelos disponibles en el cluster multi-proveedor (Muapi, Fal.ai, Replicate, Higgsfield AI), con modos, resoluciones, duraciones reales y roles de referencia soportados. |
| **`parallax_get_job`** | `jobId` | Monitorea el progreso, estado, costo y URLs de salida de cualquier trabajo por su identificador. |
| **`parallax_quote_cost`** | `modelId`, `duration` | Consulta la cotización exacta en créditos y USD antes de enviar una generación, con desglose de coste estimado del proveedor, margen de plataforma y precio por segundo. |
| **`parallax_check_balance`** | _(ninguno)_ | Comprueba el saldo disponible en créditos y USD, estado de cuenta (Colaborador vs Administrador Ilimitado) y catálogo de paquetes y planes de suscripción. |

---

## 🚀 Configuración para Agentes de IA

### 1. Claude Desktop
Añade lo siguiente en tu archivo de configuración de Claude Desktop:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "parallax": {
      "command": "node",
      "args": ["E:/DEEPSEEK/REA-Higgsfield/bin/index.mjs"],
      "env": {
        "PARALLAX_URL": "https://parallax-studio-two.vercel.app",
        "PARALLAX_API_KEY": "urbina2026",
        "PARALLAX_IMAGE_RESOLUTION": "2K",
        "PARALLAX_VIDEO_RESOLUTION": "1080p"
      }
    }
  }
}
```

---

### 2. Claude Code (CLI)
Ejecuta en tu terminal:

```bash
claude mcp add parallax node E:/DEEPSEEK/REA-Higgsfield/bin/index.mjs \
  -e PARALLAX_URL=https://parallax-studio-two.vercel.app \
  -e PARALLAX_API_KEY=urbina2026
```

---

### 3. Cursor
En Cursor, abre **Settings > Features > MCP > Add New MCP Server**:
- **Name:** `parallax`
- **Type:** `command`
- **Command:** `node E:/DEEPSEEK/REA-Higgsfield/bin/index.mjs`
- **Environment variables:**
  - `PARALLAX_URL`: `https://parallax-studio-two.vercel.app`
  - `PARALLAX_API_KEY`: `urbina2026`

O añade directamente a `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "parallax": {
      "command": "node",
      "args": ["./bin/index.mjs"],
      "env": {
        "PARALLAX_URL": "https://parallax-studio-two.vercel.app",
        "PARALLAX_API_KEY": "urbina2026"
      }
    }
  }
}
```

---

### 4. Google Antigravity / OpenCode / DeepSeek Harness
Añade a tu `mcp_config.json`:

```json
{
  "mcpServers": {
    "parallax": {
      "command": "node",
      "args": ["E:/DEEPSEEK/REA-Higgsfield/bin/index.mjs"],
      "env": {
        "PARALLAX_URL": "https://parallax-studio-two.vercel.app",
        "PARALLAX_API_KEY": "urbina2026",
        "PARALLAX_IMAGE_RESOLUTION": "2K",
        "PARALLAX_VIDEO_RESOLUTION": "1080p"
      }
    }
  }
}
```

---

## 🔑 Variables de Entorno

| Variable | Valor por defecto | Descripción |
| :--- | :--- | :--- |
| `PARALLAX_URL` | `https://parallax-studio-two.vercel.app` | URL de tu despliegue en Vercel o `http://localhost:3000` si ejecutas en local. |
| `PARALLAX_API_KEY` | `urbina2026` | Clave de Administrador con Créditos Ilimitados o una API Key `pk_...` generada en Ajustes. |
| `PARALLAX_IMAGE_RESOLUTION` | `2K` | Resolución de imagen por defecto (`1K`, `2K`, `4K`). `2K` preserva la relación de aspecto 16:9 correcta. |
| `PARALLAX_VIDEO_RESOLUTION` | `1080p` | Resolución de video por defecto (`720p`, `1080p`). |
| `PARALLAX_IMAGE_TIMEOUT_MS` | `300000` (5 min) | Tiempo máximo de espera para generación de imágenes. |
| `PARALLAX_VIDEO_TIMEOUT_MS` | `600000` (10 min) | Tiempo máximo de espera para renderizado de video en cluster GPU. |

---

## 💳 Compra de Créditos y Pasarela Payoneer

PARALLAX Studio ofrece dos modalidades de acceso:
1. **Paquetes de créditos a la carta (Sin suscripción)**:
   - **Pack Básico**: 1.000 créditos ($12 USD)
   - **Pack Creador**: 2.500 créditos ($27 USD)
   - **Pack Producción**: 5.000 créditos ($50 USD)
   - **Pack Estudio Pro**: 10.000 créditos ($90 USD)
   - **Pack Cine Master**: 25.000 créditos ($215 USD)
2. **Planes de suscripción mensual**:
   - **Creator**: 3.200 créditos ($19 USD/mes)
   - **Studio**: 15.000 créditos ($79 USD/mes)

Procesados de forma segura a través de **Payoneer Checkout** (2Checkout / Verifone).

---

## 🛠️ Prueba Rápida

Para verificar el funcionamiento por stdio desde la línea de comandos:

```bash
node scripts/check-mcp.mjs
```

Comprueba tools, resources, balance de cuenta, catálogo completo y cotización de generación.
