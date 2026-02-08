export default function handler(req, res) {
  // This is intentionally public. The security is enforced by the map-data endpoint + passcode cookie.
  const key = process.env.GOOGLE_MAPS_API_KEY || "";
  res.status(200).json({ ok: true, googleMapsKey: key });
}
