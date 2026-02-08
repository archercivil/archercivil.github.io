export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const notionToken = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!notionToken || !databaseId) {
      return res.status(500).json({ ok: false, error: "Missing NOTION_TOKEN or NOTION_DATABASE_ID" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Incoming fields from index.html
    const employeeName = (body.employeeName || "").trim();
    const project = body.project || "";
    const equipment = body.equipment || "";
    const hourMeterRaw = body.hourMeter;
    const managerComment = (body.managerComment || "").trim();

    const locationText = (body.locationText || "").trim();
    const describeLocation = (body.describeLocation || "").trim();

    const defectsFound = Array.isArray(body.defectsFound) ? body.defectsFound : [];
    const describeEquipment = (body.describeEquipment || "").trim();
    const describeDefect = (body.describeDefect || "").trim();

    const gpsLatRaw = body.gpsLat;
    const gpsLonRaw = body.gpsLon;
    const gpsAccRaw = body.gpsAcc;

    // Minimal validation
    if (!employeeName || !project || !equipment || defectsFound.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields: Employee Name, Project, Equipment, Defects Found?"
      });
    }

    const hourMeter = hourMeterRaw !== "" && hourMeterRaw != null ? Number(hourMeterRaw) : null;
    const gpsLat = gpsLatRaw !== "" && gpsLatRaw != null ? Number(gpsLatRaw) : null;
    const gpsLon = gpsLonRaw !== "" && gpsLonRaw != null ? Number(gpsLonRaw) : null;
    const gpsAcc = gpsAccRaw !== "" && gpsAccRaw != null ? Number(gpsAccRaw) : null;

    // Build Notion properties
    // IMPORTANT: property names must match your Notion database exactly.
    const properties = {
      "Manager Comment": {
        title: [
          {
            text: {
              content: managerComment ? managerComment : "New submission"
            }
          }
        ]
      },
      "Employee Name": {
        rich_text: employeeName ? [{ text: { content: employeeName } }] : []
      },
      "Project": {
        select: { name: project }
      },
      "Equipment": {
        select: { name: equipment }
      },
      "Hour Meter": hourMeter === null ? { number: null } : { number: hourMeter },

      "GPS Lat": gpsLat === null ? { number: null } : { number: gpsLat },
      "GPS Lon": gpsLon === null ? { number: null } : { number: gpsLon },
      "GPS Accuracy (m)": gpsAcc === null ? { number: null } : { number: gpsAcc },

      "Location": {
        rich_text: locationText ? [{ text: { content: locationText } }] : []
      },
      "Describe Location": {
        rich_text: describeLocation ? [{ text: { content: describeLocation } }] : []
      },

      "Defects Found?": {
        multi_select: defectsFound.map((name) => ({ name }))
      },
      "Describe Equipment": {
        rich_text: describeEquipment ? [{ text: { content: describeEquipment } }] : []
      },
      "Describe Defect": {
        rich_text: describeDefect ? [{ text: { content: describeDefect } }] : []
      }
    };

    const notionPayload = {
      parent: { database_id: databaseId },
      properties
    };

    const resp = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify(notionPayload)
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ ok: false, error: data });
    }

    // Useful flag for later alerting
    const isDoNotOperate = defectsFound.includes("Yes. DO NOT OPERATE.");

    return res.status(200).json({
      ok: true,
      id: data.id,
      doNotOperate: isDoNotOperate
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
