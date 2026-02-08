export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Require auth cookie set by /api/login
    const cookieHeader = req.headers.cookie || "";
    const authed = cookieHeader.split(";").some((c) => c.trim() === "equip_map_auth=1");

    if (!authed) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const notionToken = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!notionToken || !databaseId) {
      return res.status(500).json({ ok: false, error: "Missing NOTION_TOKEN or NOTION_DATABASE_ID" });
    }

    // Query Notion database for rows that have GPS values
    const queryPayload = {
      page_size: 100,
      filter: {
        and: [
          { property: "GPS Lat", number: { is_not_empty: true } },
          { property: "GPS Lon", number: { is_not_empty: true } }
        ]
      },
      sorts: [
        { property: "Created time", direction: "descending" }
      ]
    };

    const resp = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify(queryPayload)
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ ok: false, error: data });
    }

    // Helper to read Notion property values safely
    const getText = (prop) => {
      if (!prop) return "";
      if (prop.title && prop.title.length) return prop.title.map(t => t.plain_text).join("");
      if (prop.rich_text && prop.rich_text.length) return prop.rich_text.map(t => t.plain_text).join("");
      return "";
    };

    const getSelect = (prop) => (prop && prop.select ? prop.select.name : "");
    const getNumber = (prop) => (prop && typeof prop.number === "number" ? prop.number : null);
    const getCreatedTime = (page) => page.created_time || null;

    const pinsRaw = (data.results || []).map((page) => {
      const props = page.properties || {};
      const lat = getNumber(props["GPS Lat"]);
      const lon = getNumber(props["GPS Lon"]);
      const acc = getNumber(props["GPS Accuracy (m)"]);

      return {
        id: page.id,
        createdTime: getCreatedTime(page),
        equipment: getSelect(props["Equipment"]) || getText(props["Equipment"]),
        project: getSelect(props["Project"]),
        lat,
        lon,
        acc
      };
    }).filter(p => p.lat != null && p.lon != null);

    // Keep only the most recent location per equipment (reduces clutter)
    const latestByEquip = new Map();
    for (const p of pinsRaw) {
      const key = (p.equipment || "Unknown").trim();
      if (!latestByEquip.has(key)) latestByEquip.set(key, p);
    }
    const pins = Array.from(latestByEquip.values());

    return res.status(200).json({ ok: true, count: pins.length, pins });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
