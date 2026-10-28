const base = process.env.QA_API_URL || "http://localhost:3000/api";
for (const mode of ["sequential", "parallel"]) {
  const paths = [
    "/health",
    "/categories",
    "/products?limit=18",
    "/products?limit=12&category=tas-ransel",
    "/products?limit=12&search=Zeno",
  ];
  const start = performance.now();
  const run = async (p) => {
    const t = performance.now();
    const r = await fetch(base + p);
    await r.text();
    return { path: p, status: r.status, ms: Math.round(performance.now() - t) };
  };
  const rows = [];
  if (mode === "parallel") rows.push(...(await Promise.all(paths.map(run))));
  else for (const p of paths) rows.push(await run(p));
  console.log(
    JSON.stringify({
      mode,
      totalMs: Math.round(performance.now() - start),
      rows,
    }),
  );
}
