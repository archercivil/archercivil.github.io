export default async function handler(req, res) {
  const cookie = [
    `equip_map_auth=`,
    `Path=/`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Lax`,
    `Max-Age=0`
  ].join("; ");

  res.setHeader("Set-Cookie", cookie);
  return res.status(200).json({ ok: true });
}
