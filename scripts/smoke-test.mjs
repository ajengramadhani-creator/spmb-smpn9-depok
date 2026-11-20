const baseUrl = new URL(process.env.SMOKE_BASE_URL ?? "http://localhost:3000");

class SmokeClient {
  cookies = new Map();

  async request(path, options = {}) {
    const url = new URL(path, baseUrl);
    const headers = new Headers(options.headers);
    if (this.cookies.size) {
      headers.set("cookie", [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "));
    }

    const response = await fetch(url, {
      ...options,
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    const setCookies = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

    for (const setCookie of setCookies) {
      const pair = setCookie.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
    return response;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function checkPage(client, route, expectedStatus = 200) {
  const response = await client.request(route);
  assert(
    response.status === expectedStatus,
    `${route}: expected HTTP ${expectedStatus}, received ${response.status}${response.headers.get("location") ? ` (${response.headers.get("location")})` : ""}`,
  );
  const body = await response.text();
  assert(!body.includes("Application error: a server-side exception"), `${route}: server-rendered error page`);
  console.log(`OK ${response.status} ${route}`);
}

async function checkAnonymousRedirect(client, route, expectedLocation) {
  const response = await client.request(route);
  assert(response.status >= 300 && response.status < 400, `${route}: expected redirect, received ${response.status}`);
  const location = response.headers.get("location") ?? "";
  assert(location.endsWith(expectedLocation), `${route}: expected redirect to ${expectedLocation}, received ${location || "no location"}`);
  console.log(`OK ${response.status} ${route} -> ${expectedLocation}`);
}

async function checkRoleRedirect(client, route, expectedDashboard) {
  const response = await client.request(route);
  assert(response.status >= 300 && response.status < 400, `${route}: expected role redirect, received ${response.status}`);
  const location = response.headers.get("location") ?? "";
  assert(location.endsWith(expectedDashboard), `${route}: expected redirect to ${expectedDashboard}, received ${location || "no location"}`);
  console.log(`OK role boundary ${route} -> ${expectedDashboard}`);
}

async function signInAs(role, expectedPath) {
  const client = new SmokeClient();
  const csrfResponse = await client.request("/api/auth/csrf");
  assert(csrfResponse.status === 200, `Unable to retrieve Auth.js CSRF token (HTTP ${csrfResponse.status})`);
  const { csrfToken } = await csrfResponse.json();
  assert(typeof csrfToken === "string" && csrfToken.length > 0, "Auth.js returned no CSRF token");

  const loginResponse = await client.request("/api/auth/callback/development-demo", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      role,
      callbackUrl: new URL(expectedPath, baseUrl).toString(),
      json: "true",
    }),
  });
  assert(
    loginResponse.status >= 300 && loginResponse.status < 400,
    `Development demo sign-in for ${role} failed (HTTP ${loginResponse.status}); start the app in development and seed demo accounts.`,
  );
  const location = loginResponse.headers.get("location") ?? "";
  assert(location.endsWith(expectedPath), `Sign-in for ${role} redirected to an unexpected destination`);
  return client;
}

async function main() {
  assert(baseUrl.protocol === "http:" || baseUrl.protocol === "https:", "SMOKE_BASE_URL must use HTTP or HTTPS");
  console.log(`Smoke test target: ${baseUrl.origin}`);

  const anonymous = new SmokeClient();
  await checkPage(anonymous, "/api/health");
  for (const route of ["/", "/portal", "/masuk", "/admin/masuk", "/kepsek/masuk", "/daftar", "/lupa-password", "/verifikasi-email"]) {
    await checkPage(anonymous, route);
  }
  await checkAnonymousRedirect(anonymous, "/siswa", "/masuk");
  await checkAnonymousRedirect(anonymous, "/admin", "/admin/masuk");
  await checkAnonymousRedirect(anonymous, "/kepsek", "/kepsek/masuk");

  const roleRoutes = [
    {
      role: "SISWA",
      destination: "/siswa",
      routes: ["/siswa", "/siswa/pendaftaran", "/siswa/dokumen", "/siswa/pembayaran", "/siswa/hasil", "/siswa/ujian", "/siswa/pengumuman", "/siswa/notifikasi", "/siswa/profil"],
    },
    {
      role: "ADMIN",
      destination: "/admin",
      routes: ["/admin", "/admin/pendaftaran", "/admin/verifikasi", "/admin/bank-soal", "/admin/tes", "/admin/kelayakan", "/admin/seleksi", "/admin/pengumuman", "/admin/laporan", "/admin/pembayaran"],
    },
    {
      role: "KEPSEK",
      destination: "/kepsek",
      routes: ["/kepsek", "/kepsek/pendaftaran", "/kepsek/hasil-tes", "/kepsek/hasil-seleksi", "/kepsek/statistik", "/kepsek/pembayaran", "/kepsek/laporan-eksekutif"],
    },
  ];

  for (const { role, destination, routes } of roleRoutes) {
    const client = await signInAs(role, destination);
    console.log(`Authenticated demo role: ${role}`);
    for (let index = 0; index < routes.length; index += 4) {
      await Promise.all(routes.slice(index, index + 4).map((route) => checkPage(client, route)));
    }
    if (role === "ADMIN") await checkPage(client, "/api/admin/laporan?format=csv");
    if (role === "SISWA") await checkRoleRedirect(client, "/admin", destination);
    if (role === "ADMIN") await checkRoleRedirect(client, "/kepsek", destination);
    if (role === "KEPSEK") {
      await checkRoleRedirect(client, "/admin", destination);
      const forbidden = await client.request("/api/admin/laporan?format=csv");
      assert(forbidden.status === 403, `KEPSEK access to the ADMIN report API must be denied (HTTP ${forbidden.status})`);
      console.log("OK 403 KEPSEK -> /api/admin/laporan");
    }
  }

  console.log("Smoke test passed.");
}

main().catch((error) => {
  console.error(`Smoke test failed: ${error instanceof Error ? error.message : "unknown failure"}`);
  process.exitCode = 1;
});
