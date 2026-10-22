#!/usr/bin/env node
/**
 * PARALLAX MCP Server (Model Context Protocol) v1.2.0
 * 
 * Permite a cualquier agente de IA (Claude Code, Cursor, Antigravity, OpenCode, Codex, DeepSeek Harness)
 * orquestar generaciones de imágenes y videos cinemáticos a través de PARALLAX AI Studio.
 * 
 * URBINA ASESORIA E INVERSIONES SAC · Departamento de Tecnología
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const VERSION = "1.2.0";
const PARALLAX_URL = (process.env.PARALLAX_URL || "https://parallax-studio-two.vercel.app").replace(/\/$/, "");
const PARALLAX_API_KEY = process.env.PARALLAX_API_KEY || "urbina2026";
const PARALLAX_IMAGE_RESOLUTION = process.env.PARALLAX_IMAGE_RESOLUTION || "2K";
const PARALLAX_VIDEO_RESOLUTION = process.env.PARALLAX_VIDEO_RESOLUTION || "1080p";
const PARALLAX_IMAGE_TIMEOUT_MS = Number(process.env.PARALLAX_IMAGE_TIMEOUT_MS) || 300_000; // 5m
const PARALLAX_VIDEO_TIMEOUT_MS = Number(process.env.PARALLAX_VIDEO_TIMEOUT_MS) || 600_000; // 10m
const PARALLAX_REQUEST_TIMEOUT_MS = Number(process.env.PARALLAX_REQUEST_TIMEOUT_MS) || 30_000;

// Caché de modelos en memoria (TTL: 5 min)
let cachedModels = null;
let cachedModelsTimestamp = 0;

async function apiRequest(path, options = {}) {
  const url = `${PARALLAX_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${PARALLAX_API_KEY}`,
    ...(options.headers || {}),
  };

  const signal = options.signal || AbortSignal.timeout(PARALLAX_REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { ...options, headers, signal });
  } catch (netErr) {
    throw new Error(`Fallo de conexión HTTP con ${url}: ${netErr.message}`);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let details = "";
    if (Array.isArray(data?.error?.details)) {
      details = " → " + data.error.details.map((d) => `${d.path ?? "?"}: ${d.message ?? ""}`).join("; ");
    } else if (data?.error?.details && typeof data?.error?.details === "object") {
      details = " → " + JSON.stringify(data.error.details);
    }
    const errorMsg = (data?.error?.message || `HTTP ${response.status} en ${path}`) + details;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.code = data?.error?.code;
    err.details = data?.error?.details;
    throw err;
  }

  return data;
}

async function getCachedModels() {
  const now = Date.now();
  if (cachedModels && now - cachedModelsTimestamp < 300_000) {
    return cachedModels;
  }
  try {
    const data = await apiRequest("/api/v1/models");
    cachedModels = data.models || [];
    cachedModelsTimestamp = now;
    return cachedModels;
  } catch {
    return cachedModels || [];
  }
}

async function resolveDefaultVideoModel() {
  const models = await getCachedModels();
  // Busca un modelo de video con proveedor operativo configurado
  const usable = models.filter((m) => m.kind === "video" && m.provider && m.provider !== "mock");
  return (
    usable.find((m) => m.id === "seedance-lite-i2v" || m.id === "minimax-hailuo-2.3-pro-i2v")?.id ||
    usable[0]?.id ||
    "seedance-lite-i2v"
  );
}

const server = new Server(
  {
    name: "parallax-mcp",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// 1. Declaración de herramientas (Tools)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "parallax_generate_image",
        description:
          "Genera una imagen cinematográfica de alta calidad con IA a través de PARALLAX Studio (utiliza modelos como Seedream 5.0, Flux 2 Pro, Nano Banana Pro, Google Imagen 4). Espera automáticamente el resultado final y devuelve las URLs en alta resolución.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Descripción visual detallada de la escena, iluminación, óptica y composición de la imagen.",
            },
            model: {
              type: "string",
              description:
                "ID del modelo (ej: 'seedream-5.0', 'flux-2-pro', 'nano-banana-pro', 'google-imagen4', 'gpt-image-1.5'). Por defecto 'seedream-5.0' (calidad S, 2K nativo).",
            },
            aspectRatio: {
              type: "string",
              enum: ["16:9", "9:16", "1:1", "4:3", "3:4", "2:3", "3:2", "21:9"],
              description: "Relación de aspecto de la imagen. Por defecto '16:9'.",
            },
            resolution: {
              type: "string",
              enum: ["1K", "2K", "4K"],
              description: "Resolución de la imagen. Por defecto '2K' para asegurar preservación de aspecto y fidelidad óptica.",
            },
            negativePrompt: {
              type: "string",
              description: "Prompt negativo opcional para evitar artefactos o elementos no deseados.",
            },
            imageUrl: {
              type: "string",
              description: "URL de una imagen existente para modo Image-to-Image / referencia de personaje o estilo.",
            },
            waitForCompletion: {
              type: "boolean",
              description:
                "Si es true (recomendado), la herramienta sondea automáticamente hasta que la imagen esté generada y devuelve las URLs directas. Por defecto true.",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "parallax_generate_video",
        description:
          "Genera un video cinemático con IA (Text-to-Video o Image-to-Video) a través de PARALLAX Studio (modelos Hailuo, Seedance, WAN, Kling, Sora 2, Veo 3.1). Permite definir movimiento de cámara, imagen inicial (start_frame), imagen final (end_frame) y referencia de personaje.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "Descripción detallada del movimiento de cámara, ritmo, iluminación, atmósfera y acción que ocurre en el video.",
            },
            model: {
              type: "string",
              description:
                "ID del modelo de video (ej: 'hailuo-2.3-pro-i2v', 'seedance-lite-i2v', 'wan2.6-i2v', 'kling-v3.0-pro', 'sora-2-pro', 'veo3.1'). Si se omite, se seleccionará automáticamente el mejor modelo activo.",
            },
            duration: {
              type: "number",
              description: "Duración en segundos del clip (ej: 5 o 10). Por defecto 5.",
            },
            aspectRatio: {
              type: "string",
              enum: ["16:9", "9:16", "1:1", "4:3", "3:4"],
              description: "Relación de aspecto del video. Por defecto '16:9'.",
            },
            resolution: {
              type: "string",
              enum: ["720p", "1080p"],
              description: "Resolución de renderizado de video. Por defecto '1080p'.",
            },
            imageUrl: {
              type: "string",
              description: "URL de una imagen de inicio (start_frame) para modo Image-to-Video. Máximo recomendado < 5 MB en CDN.",
            },
            endFrameUrl: {
              type: "string",
              description: "URL opcional de fotograma final (end_frame) para guiar la interpolación y transición del plano.",
            },
            referenceImageUrl: {
              type: "string",
              description: "URL opcional de referencia de personaje (character_reference) para mantener consistencia de identidad.",
            },
            waitForCompletion: {
              type: "boolean",
              description:
                "Si es true, la herramienta espera a que el render concluya y devuelve la URL directa del MP4 listo. Por defecto true.",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "parallax_list_models",
        description:
          "Lista los modelos de IA disponibles en PARALLAX Studio para generación de imagen y video, detallando proveedor, modos admitidos (t2i, i2v, etc.), resoluciones, duraciones y roles de referencia.",
        inputSchema: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: ["image", "video", "all"],
              description: "Filtrar por tipo de modelo ('image', 'video' o 'all'). Por defecto 'all'.",
            },
          },
        },
      },
      {
        name: "parallax_get_job",
        description:
          "Consulta el estado, progreso, costo y URLs de salida de un trabajo de generación mediante su ID (job_...).",
        inputSchema: {
          type: "object",
          properties: {
            jobId: {
              type: "string",
              description: "Identificador del trabajo devuelto por parallax_generate_image o parallax_generate_video.",
            },
          },
          required: ["jobId"],
        },
      },
      {
        name: "parallax_quote_cost",
        description:
          "Calcula la cotización exacta en créditos PARALLAX y USD de una generación antes de enviarla, con desglose de coste de proveedor, margen de plataforma y precio por segundo.",
        inputSchema: {
          type: "object",
          properties: {
            modelId: {
              type: "string",
              description: "ID del modelo a cotizar (ej: 'seedream-5.0', 'hailuo-2.3-pro-i2v', 'kling-v3.0-pro').",
            },
            duration: {
              type: "number",
              description: "Duración en segundos (solo para video).",
            },
          },
          required: ["modelId"],
        },
      },
      {
        name: "parallax_check_balance",
        description:
          "Comprueba el saldo de créditos disponibles, estado de suscripción, paquetes comprables y nivel de cuenta (Colaborador vs Administrador Ilimitado) en PARALLAX Studio.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// 2. Ejecución de herramientas (Call Tool)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "parallax_list_models") {
      const models = await getCachedModels();
      let filtered = models;
      if (args?.kind && args.kind !== "all") {
        filtered = filtered.filter((m) => m.kind === args.kind);
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: filtered.length,
                models: filtered.map((m) => ({
                  id: m.id,
                  name: m.name,
                  kind: m.kind,
                  provider: m.provider,
                  modes: m.modes || [m.mode],
                  aspectRatios: m.allowedAspectRatios,
                  resolutions: m.allowedResolutions,
                  durations: m.allowedDurations,
                  supportedRoles: m.supportedRoles || [],
                  description: m.description,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "parallax_check_balance") {
      const [balance, creditsData] = await Promise.all([
        apiRequest("/api/v1/balance"),
        apiRequest("/api/credits").catch(() => null),
      ]);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                userId: balance.userId,
                saldoCreditos: balance.availableCredits,
                nivelCuenta: balance.isAdmin ? "Administrador (Créditos Ilimitados ∞)" : "Colaborador",
                balanceUsd: balance.balanceUsd,
                servidorParallax: PARALLAX_URL,
                versionMcp: VERSION,
                paquetesDisponibles: creditsData?.creditPacks?.map((p) => ({
                  id: p.id,
                  nombre: p.name,
                  creditos: p.credits,
                  precioUsd: p.priceUsd,
                  tarifaPorCredito: p.perCreditUsd,
                })),
                planesDisponibles: creditsData?.plans?.map((p) => ({
                  id: p.id,
                  nombre: p.name,
                  creditos: p.credits,
                  precioUsd: p.priceUsd,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "parallax_quote_cost") {
      const qs = new URLSearchParams({ modelId: args.modelId });
      if (args.duration) qs.set("duration", String(args.duration));
      const data = await apiRequest(`/api/v1/cost?${qs.toString()}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                modelId: args.modelId,
                proveedor: data.providerLabel || data.provider,
                costoCreditos: data.cost?.credits ?? 0,
                costoUsd: data.cost?.usd ? `$${data.cost.usd.toFixed(4)} USD` : "$0.00",
                costoProveedorUsd: data.cost?.providerUsd ? `$${data.cost.providerUsd.toFixed(4)} USD` : undefined,
                margenPlataformaUsd: data.cost?.platformUsd ? `$${data.cost.platformUsd.toFixed(4)} USD` : undefined,
                costoPorSegundoUsd: data.cost?.perSecondUsd ? `$${data.cost.perSecondUsd.toFixed(4)} USD/s` : undefined,
                duracionSegundos: data.cost?.durationSeconds,
                lineasDesglose: data.cost?.lines,
                nota: data.cost?.note,
                modoDemo: data.demo,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "parallax_get_job") {
      const data = await apiRequest(`/api/v1/jobs/${args.jobId}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.job, null, 2),
          },
        ],
      };
    }

    if (name === "parallax_generate_image") {
      const modelId = args.model || "seedream-5.0";
      const isI2I = Boolean(args.imageUrl);
      const mediaInputs = [];
      if (args.imageUrl) {
        mediaInputs.push({ url: args.imageUrl, role: "character_reference" });
      }

      const payload = {
        modelId,
        mode: isI2I ? "image-to-image" : "text-to-image",
        prompt: args.prompt,
        aspectRatio: args.aspectRatio || "16:9",
        resolution: args.resolution || PARALLAX_IMAGE_RESOLUTION,
        negativePrompt: args.negativePrompt,
        ...(args.imageUrl ? { imageUrl: args.imageUrl } : {}),
        ...(mediaInputs.length > 0 ? { mediaInputs } : {}),
      };

      const submitData = await apiRequest("/api/v1/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const job = submitData.job;
      const shouldWait = args.waitForCompletion !== false;

      if (!shouldWait) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "submitted",
                  jobId: job.id,
                  modelId: job.modelId,
                  costeCreditos: job.cost?.credits,
                  mensaje: `Trabajo de imagen enviado con éxito. Consulta el estado con parallax_get_job con id: ${job.id}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Sondeo reactivo con timeout configurable
      const startTime = Date.now();
      let currentJob = job;

      while (Date.now() - startTime < PARALLAX_IMAGE_TIMEOUT_MS) {
        if (currentJob.status === "succeeded") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "succeeded",
                    jobId: currentJob.id,
                    modelId: currentJob.modelId,
                    outputUrls: currentJob.outputUrls,
                    prompt: currentJob.request?.prompt,
                    duracionMs: Date.now() - startTime,
                    costeCreditos: currentJob.cost?.credits,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (currentJob.status === "failed") {
          const err = new Error(
            `La generación falló: ${currentJob.error || "Error del proveedor"} (jobId: ${currentJob.id})`
          );
          err.jobId = currentJob.id;
          err.errorCode = currentJob.errorCode;
          err.provider = currentJob.provider;
          throw err;
        }

        await new Promise((r) => setTimeout(r, 2500));
        const polled = await apiRequest(`/api/v1/jobs/${job.id}`);
        currentJob = polled.job;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "processing",
                jobId: currentJob.id,
                progress: currentJob.progress,
                aviso: "El trabajo aún está procesando en el proveedor. Consulta el avance con parallax_get_job.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "parallax_generate_video") {
      const modelId = args.model || (await resolveDefaultVideoModel());

      const mediaInputs = [];
      if (args.imageUrl) {
        mediaInputs.push({ url: args.imageUrl, role: "start_frame" });
      }
      if (args.endFrameUrl) {
        mediaInputs.push({ url: args.endFrameUrl, role: "end_frame" });
      }
      if (args.referenceImageUrl) {
        mediaInputs.push({ url: args.referenceImageUrl, role: "character_reference" });
      }

      const mode = mediaInputs.length > 0 ? "image-to-video" : "text-to-video";
      const payload = {
        modelId,
        mode,
        prompt: args.prompt,
        aspectRatio: args.aspectRatio || "16:9",
        resolution: args.resolution || PARALLAX_VIDEO_RESOLUTION,
        duration: args.duration || 5,
        ...(args.imageUrl ? { imageUrl: args.imageUrl } : {}),
        ...(mediaInputs.length > 0 ? { mediaInputs } : {}),
      };

      const submitData = await apiRequest("/api/v1/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const job = submitData.job;
      const shouldWait = args.waitForCompletion !== false;

      if (!shouldWait) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "submitted",
                  jobId: job.id,
                  modelId: job.modelId,
                  costeCreditos: job.cost?.credits,
                  mensaje: `Trabajo de video enviado. Consulta el avance con parallax_get_job con id: ${job.id}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const startTime = Date.now();
      let currentJob = job;

      while (Date.now() - startTime < PARALLAX_VIDEO_TIMEOUT_MS) {
        if (currentJob.status === "succeeded") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "succeeded",
                    jobId: currentJob.id,
                    modelId: currentJob.modelId,
                    outputUrls: currentJob.outputUrls,
                    prompt: currentJob.request?.prompt,
                    duracionMs: Date.now() - startTime,
                    costeCreditos: currentJob.cost?.credits,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (currentJob.status === "failed") {
          const err = new Error(
            `La generación de video falló: ${currentJob.error || "Error del proveedor"} (jobId: ${currentJob.id})`
          );
          err.jobId = currentJob.id;
          err.errorCode = currentJob.errorCode;
          err.provider = currentJob.provider;
          throw err;
        }

        await new Promise((r) => setTimeout(r, 4000));
        const polled = await apiRequest(`/api/v1/jobs/${job.id}`);
        currentJob = polled.job;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "processing",
                jobId: currentJob.id,
                progress: currentJob.progress,
                aviso: "El video sigue renderizando en el cluster de GPUs. Consulta con parallax_get_job.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    throw new Error(`Herramienta no reconocida: ${name}`);
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `[Error PARALLAX MCP] ${err.message || String(err)}`,
        },
      ],
    };
  }
});

// 3. Recursos (Resources)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "parallax://models",
        name: "Catálogo de Modelos IA",
        mimeType: "application/json",
        description: "Lista de todos los modelos de imagen y video disponibles en PARALLAX Studio.",
      },
      {
        uri: "parallax://balance",
        name: "Balance de Créditos",
        mimeType: "application/json",
        description: "Saldo y estado de la cuenta en PARALLAX Studio.",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  if (uri === "parallax://models") {
    const data = await apiRequest("/api/v1/models");
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  if (uri === "parallax://balance") {
    const data = await apiRequest("/api/v1/balance");
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  throw new Error(`Recurso no encontrado: ${uri}`);
});

// 4. Iniciar transporte stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[parallax-mcp v${VERSION}] Servidor iniciado conectando a ${PARALLAX_URL}`);
}

main().catch((err) => {
  console.error("[parallax-mcp] Error fatal:", err);
  process.exit(1);
});
