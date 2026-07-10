export const runtime = "nodejs";

const jsonResponse = {
  description: "JSON response.",
  content: {
    "application/json": {
      schema: { type: "object", additionalProperties: true },
    },
  },
};

const authResponses = {
  "401": {
    description: "Login required.",
    content: jsonResponse.content,
  },
  "403": {
    description: "Role or same-origin gate rejected the request.",
    content: jsonResponse.content,
  },
};

export async function GET() {
  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Lumbung Bersama API",
      version: "0.1.0",
      description:
        "Swagger-compatible API contract for the hackathon MVP: Peta Potensi, Rekomendasi Produk, Buyer Matching Lite, Stok/Readiness, WA intake, Agent Center, and Laporan Aksi.",
    },
    servers: [{ url: "https://lumbung-bersama.meetsin.id", description: "Live demo" }],
    tags: [
      { name: "Auth" },
      { name: "Dashboard" },
      { name: "Peta Potensi" },
      { name: "Hackathon Evidence" },
      { name: "WA" },
      { name: "Agents" },
      { name: "Reports" },
    ],
    paths: {
      "/api/health": {
        get: {
          tags: ["Dashboard"],
          summary: "Read public runtime readiness without exposing secrets.",
          responses: { "200": jsonResponse },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Create an HttpOnly operator session.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: { "200": jsonResponse, "400": jsonResponse, "503": jsonResponse, ...authResponses },
        },
      },
      "/api/dashboard": {
        get: {
          tags: ["Dashboard"],
          summary: "Read cooperative workspace data, tables, queues, stock, buyer readiness, and aggregate evidence.",
          responses: { "200": jsonResponse, "503": jsonResponse, ...authResponses },
        },
      },
      "/api/peta-unggulan/data": {
        get: {
          tags: ["Peta Potensi"],
          summary: "Read map-ready village and commodity potential data.",
          responses: { "200": jsonResponse, "503": jsonResponse },
        },
      },
      "/api/peta-unggulan/analyze": {
        post: {
          tags: ["Peta Potensi"],
          summary: "Analyze a selected village/commodity without making autonomous business decisions.",
          responses: { "200": jsonResponse, "404": jsonResponse, "503": jsonResponse },
        },
      },
      "/api/hackathon/mvp-summary": {
        get: {
          tags: ["Hackathon Evidence"],
          summary: "Read aggregate-only MVP evidence summary.",
          responses: { "200": jsonResponse, "503": jsonResponse, ...authResponses },
        },
      },
      "/api/hackathon/data-quality": {
        get: {
          tags: ["Hackathon Evidence"],
          summary: "Read aggregate data-quality warnings for the limited exploration source.",
          responses: { "200": jsonResponse, "503": jsonResponse, ...authResponses },
        },
      },
      "/api/hackathon/opportunity-scores": {
        get: {
          tags: ["Hackathon Evidence"],
          summary: "Read commodity/opportunity scoring built from aggregate evidence.",
          responses: { "200": jsonResponse, "503": jsonResponse, ...authResponses },
        },
      },
      "/api/hackathon/buyer-matching": {
        get: {
          tags: ["Hackathon Evidence"],
          summary: "Read buyer matching lite archetype readiness. No buyer certainty claim.",
          responses: { "200": jsonResponse, "503": jsonResponse, ...authResponses },
        },
      },
      "/api/wa/personal/status": {
        get: {
          tags: ["WA"],
          summary: "Read sanitized WA personal bridge QR/connection status for testing.",
          responses: { "200": jsonResponse, ...authResponses },
        },
      },
      "/api/wa/messages": {
        post: {
          tags: ["WA"],
          summary: "Create a WA intake draft and operator queue item.",
          responses: { "200": jsonResponse, "400": jsonResponse, "503": jsonResponse, ...authResponses },
        },
      },
      "/api/agents/run": {
        post: {
          tags: ["Agents"],
          summary: "Run an agent against a real queue or WA case. A recordId is required.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["recordId"],
                  properties: {
                    agentName: { type: "string" },
                    recordId: { type: "string", description: "Operator queue ID or WA message ID." },
                  },
                },
              },
            },
          },
          responses: { "200": jsonResponse, "400": jsonResponse, "404": jsonResponse, "503": jsonResponse, ...authResponses },
        },
      },
      "/api/report-periods/current/lock": {
        post: {
          tags: ["Reports"],
          summary: "Lock or unlock the current action-report period.",
          responses: { "200": jsonResponse, "503": jsonResponse, ...authResponses },
        },
      },
    },
  });
}
