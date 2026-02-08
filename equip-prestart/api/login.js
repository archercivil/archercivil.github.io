export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const passcode = String((req.body && req.body.passcode) || "").trim();
    const expected = String(process.env.MAP_PASSCODE || "").trim();

    if (!expected) {
      return res.status(500).json({ ok: false, error: "MAP_PASSCODE not configured" });
    }

    if (!/^\d{4}$/.test(passcode)) {
      return res.status(400).json({ ok: false, error: "Passcode must be 4 digits" });
    }

    if (passcode !== expected) {
      return res.status(401).json({ ok: false, error: "Invalid passcode" });
    }

    // 8-hour session cookie
    const maxAge = 60 * 60 * 8;

    // Vercel serverless runs behind HTTPS; Secure cookie is fine.
    const cookie = [
      `equip_map_auth=1`,
      `Path=/`,
      `HttpOnly`,
      `Secure`,
      `SameSite=Lax`,
      `Max-Age=${maxAge}`
    ].join("; ");

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
