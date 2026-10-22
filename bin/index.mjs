#!/usr/bin/env node
/**
 * PARALLAX MCP Server (Model Context Protocol).
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

const PARALLAX_URL = (process.env.PARALLAX_URL || "https://parallax-studio-two.vercel.app").replace(/\/$/, "");
const PARALLAX_API_KEY = process.env.PARALLAX_API_KEY || "urbina2026";

async function apiRequest(path, options = {}) {
  const url = `${PARALLAX_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${PARALLAX_API_KEY}`,
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || `HTTP ${response.status} en ${path}`;
    throw new Error(errorMsg);
  }

  return data;
}

const server = new Server(
  {
    name: "parallax-mcp",
    version: "1.0.0",
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
          "Genera una imagen con IA de alta calidad a través de PARALLAX Studio (utiliza Higgsfield, Fal.ai, Replicate o Muapi). Permite definir prompt, modelo, relación de aspecto y espera automáticamente el resultado final.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Descripción visual detallada de la imagen que deseas generar.",
            },
            model: {
              type: "string",
              description:
                "ID del modelo a utilizar (ej: 'seedream-5.0', 'flux-schnell', 'fast-sdxl', 'nano-banana-pro', 'gpt-image-1.5'). Si se omite, se seleccionará automáticamente el mejor disponible.",
            },
            aspectRatio: {
              type: "string",
              enum: ["16:9", "9:16", "1:1", "4:3", "3:4"],
              description: "Relación de aspecto de la imagen. Por defecto '16:9'.",
            },
            negativePrompt: {
              type: "string",
              description: "Prompt negativo opcional para evitar elementos indeseados o artefactos.",
            },
            waitForCompletion: {
              type: "boolean",
              description:
                "Si es true (recomendado), la herramienta espera y sondea hasta que la imagen esté lista, devolviendo las URLs directas del resultado. Por defecto true.",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "parallax_generate_video",
        description:
          "Genera un video cinemático con IA (Text-to-Video o Image-to-Video) a través de PARALLAX Studio (modelos Seedance, Kling, WAN, Sora, Veo, LTX). Permite definir prompt de movimiento, duración y aspecto.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "Descripción detallada del movimiento de cámara, iluminación, atmósfera y acción que debe ocurrir en el video.",
            },
            model: {
              type: "string",
              description:
                "ID del modelo de video (ej: 'seedance-2.5', 'kling-3.0', 'wan-3.0', 'sora-2-pro', 'veo-3.1', 'ltx-2.3'). Si se omite, se usa 'seedance-2.5'.",
            },
            duration: {
              type: "number",
              description: "Duración en segundos del video (ej: 5 o 10).",
            },
            aspectRatio: {
              type: "string",
              enum: ["16:9", "9:16", "1:1"],
              description: "Relación de aspecto del video. Por defecto '16:9'.",
            },
            imageUrl: {
              type: "string",
              description: "URL de una imagen inicial de referencia para modo Image-to-Video.",
            },
            waitForCompletion: {
              type: "boolean",
              description:
                "Si es true, la herramienta espera a que el render termine y devuelve la URL del archivo MP4 final. Por defecto true.",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "parallax_list_models",
        description:
          "Lista los modelos de IA disponibles en PARALLAX Studio para generación de imagen y video, detallando proveedor, resoluciones y modos admitidos.",
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
          "Consulta el estado, progreso y URLs de salida de un trabajo de generación mediante su ID (job_...).",
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
          "Calcula la cotización exacta en créditos PARALLAX y USD de una generación antes de enviarla.",
        inputSchema: {
          type: "object",
          properties: {
            modelId: {
              type: "string",
              description: "ID del modelo a cotizar (ej: 'seedream-5.0', 'seedance-2.5').",
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
          "Comprueba el saldo de créditos disponibles, estado de suscripción y nivel de cuenta (Colaborador vs Administrador Ilimitado) en PARALLAX Studio.",
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
      const data = await apiRequest("/api/v1/models");
      let models = data.models || [];
      if (args?.kind && args.kind !== "all") {
        models = models.filter((m) => m.kind === args.kind);
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: models.length,
                models: models.map((m) => ({
                  id: m.id,
                  name: m.name,
                  kind: m.kind,
                  provider: m.provider,
                  aspectRatios: m.allowedAspectRatios,
                  durations: m.allowedDurations,
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
      const data = await apiRequest("/api/v1/balance");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                userId: data.userId,
                saldoCreditos: data.availableCredits,
                nivelCuenta: data.isAdmin ? "Administrador (Créditos Ilimitados ∞)" : "Colaborador",
                balanceUsd: data.balanceUsd,
                servidorParallax: PARALLAX_URL,
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
      const payload = {
        modelId,
        mode: "text-to-image",
        prompt: args.prompt,
        aspectRatio: args.aspectRatio || "16:9",
        negativePrompt: args.negativePrompt,
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
                  mensaje: `Trabajo enviado con éxito. Consulta el estado con parallax_get_job con id: ${job.id}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Sondeo reactivo hasta finalización
      const startTime = Date.now();
      const timeoutMs = 120_000;
      let currentJob = job;

      while (Date.now() - startTime < timeoutMs) {
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
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (currentJob.status === "failed") {
          throw new Error(`La generación falló: ${currentJob.error || "Error desconocido del proveedor"}`);
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
                aviso: "El trabajo aún está procesando en el proveedor. Consulta más tarde con parallax_get_job.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "parallax_generate_video") {
      const modelId = args.model || "seedance-2.5";
      const mode = args.imageUrl ? "image-to-video" : "text-to-video";
      const payload = {
        modelId,
        mode,
        prompt: args.prompt,
        aspectRatio: args.aspectRatio || "16:9",
        duration: args.duration || 5,
        imageUrl: args.imageUrl,
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
                  mensaje: `Trabajo de video enviado. Consulta el avance con parallax_get_job id: ${job.id}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const startTime = Date.now();
      const timeoutMs = 240_000;
      let currentJob = job;

      while (Date.now() - startTime < timeoutMs) {
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
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (currentJob.status === "failed") {
          throw new Error(`La generación de video falló: ${currentJob.error || "Error del proveedor"}`);
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
  console.error(`[parallax-mcp] Servidor iniciado conectando a ${PARALLAX_URL}`);
}

main().catch((err) => {
  console.error("[parallax-mcp] Error fatal:", err);
  process.exit(1);
});
