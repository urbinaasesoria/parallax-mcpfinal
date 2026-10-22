# PARALLAX MCP Server 🎬

Servidor oficial de **Model Context Protocol (MCP)** para conectar **PARALLAX AI Studio** con agentes de inteligencia artificial como **Claude Code**, **Claude Desktop**, **Cursor**, **Google Antigravity**, **OpenCode**, **Codex** y **DeepSeek Harness**.

Desarrollado por el **Departamento de Tecnología de URBINA ASESORIA E INVERSIONES SAC** ([grupourbina.pe/urbina#tecnologia](https://grupourbina.pe/urbina#tecnologia)).

---

## ⚡ Herramientas Disponibles (Tools)

| Herramienta | Descripción |
| :--- | :--- |
| **`parallax_generate_image`** | Genera imágenes de alta fidelidad con modelos como `seedream-5.0`, `flux-schnell`, `fast-sdxl`, `nano-banana-pro`, etc. Espera automáticamente el resultado y devuelve la URL final. |
| **`parallax_generate_video`** | Genera videos cinemáticos (Text-to-Video o Image-to-Video) con `seedance-2.5`, `kling-3.0`, `wan-3.0`, `sora-2-pro`, `veo-3.1`. Devuelve el archivo MP4 listo. |
| **`parallax_list_models`** | Lista los más de 200 modelos disponibles en el cluster multi-proveedor (Higgsfield AI, Fal.ai, Replicate, Muapi). |
| **`parallax_get_job`** | Monitorea el progreso y obtiene las URLs de salida de cualquier trabajo por su `jobId`. |
| **`parallax_quote_cost`** | Consulta la cotización exacta en créditos y USD antes de enviar una generación. |
| **`parallax_check_balance`** | Comprueba el saldo disponible y el nivel de cuenta (Colaborador vs Administrador Ilimitado). |

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
      "args": ["C:/ruta/a/parallax-mcp/bin/index.mjs"],
      "env": {
        "PARALLAX_URL": "https://parallax-studio-two.vercel.app",
        "PARALLAX_API_KEY": "urbina2026"
      }
    }
  }
}
```

---

### 2. Claude Code (CLI)
Ejecuta en tu terminal:

```bash
claude mcp add parallax node C:/ruta/a/parallax-mcp/bin/index.mjs \
  -e PARALLAX_URL=https://parallax-studio-two.vercel.app \
  -e PARALLAX_API_KEY=urbina2026
```

---

### 3. Cursor
En Cursor, abre **Settings > Features > MCP > Add New MCP Server**:
- **Name:** `parallax`
- **Type:** `command`
- **Command:** `node C:/ruta/a/parallax-mcp/bin/index.mjs`
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
      "args": ["E:/DEEPSEEK/REA-Higgsfield/bin/mcp-server.mjs"],
      "env": {
        "PARALLAX_URL": "https://parallax-studio-two.vercel.app",
        "PARALLAX_API_KEY": "urbina2026"
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

---

## 🛠️ Prueba Rápida

Para verificar el funcionamiento desde la línea de comandos:

```bash
node scripts/test-mcp.mjs
```

Deberás ver la confirmación de balance ilimitado y el catálogo de 223 modelos activos listos para generación.
