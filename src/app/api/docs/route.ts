export const runtime = "nodejs";

export async function GET() {
  return new Response(
    `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lumbung Bersama API Docs</title>
  <style>
    body{margin:0;background:#fff8ea;color:#172027;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{max-width:920px;margin:0 auto;padding:40px 20px}
    h1{font-size:40px;line-height:1.05;margin:0 0 12px;font-weight:900}
    p{font-size:16px;line-height:1.7;color:#53606a}
    a{display:inline-flex;margin-top:18px;border-radius:10px;background:#c92a2a;color:white;padding:12px 16px;text-decoration:none;font-weight:800}
    code{background:#f1e4cf;border:1px solid #e7ded1;border-radius:6px;padding:2px 6px}
    section{margin-top:28px;border:1px solid #e7ded1;border-radius:14px;background:#fffcf5;padding:18px}
  </style>
</head>
<body>
  <main>
    <h1>Swagger/OpenAPI docs</h1>
    <p>Dokumen API Lumbung Bersama tersedia sebagai OpenAPI 3.1 JSON yang dapat dibuka di Swagger Editor atau tooling API lain. Tidak ada credential atau nilai environment yang diekspos di halaman ini.</p>
    <a href="/api/openapi.json">Buka /api/openapi.json</a>
    <section>
      <h2>Flow utama</h2>
      <p><code>Login</code> -> <code>Peta Potensi</code> -> <code>Rekomendasi Produk</code> -> <code>Buyer Matching Lite</code> -> <code>Stok/Readiness</code> -> <code>Laporan Aksi</code></p>
    </section>
  </main>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
