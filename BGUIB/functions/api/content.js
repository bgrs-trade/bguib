import { jsonResponse, verifyToken } from "../_utils.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "all";

  if (!env.DB) {
    return jsonResponse({ error: "D1 Database (DB) binding missing." }, 500);
  }

  // PUBLIC GET: Fetch dynamic portal data
  if (request.method === "GET") {
    const data = {};

    if (type === "all" || type === "resources") {
      const { results } = await env.DB.prepare("SELECT * FROM resources ORDER BY created_at DESC").all();
      data.resources = results || [];
    }
    if (type === "all" || type === "news") {
      const { results } = await env.DB.prepare("SELECT * FROM news_items ORDER BY created_at DESC").all();
      data.news = results || [];
    }
    if (type === "all" || type === "notices") {
      const { results } = await env.DB.prepare("SELECT * FROM notices ORDER BY created_at DESC").all();
      data.notices = results || [];
    }
    if (type === "all" || type === "projects") {
      const { results } = await env.DB.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
      data.projects = results || [];
    }

    return jsonResponse(data);
  }

  // PROTECTED STAFF/ADMIN MUTATIONS (POST = Create, PUT = Edit/Update, DELETE = Remove)
  const user = await verifyToken(request, env);
  if (!user) {
    return jsonResponse({ error: "Authentication required. Please sign in to the Staff Portal." }, 401);
  }

  if (request.method === "POST" || request.method === "PUT") {
    const body = await request.json().catch(() => ({}));
    const isEdit = request.method === "PUT" && body.id;

    // A. RESOURCES, POLICIES & PUBLICATIONS
    if (type === "resources") {
      const { id, ref, category, year, format, size, title_en, title_am, summary_en, summary_am, highlights, file_key, file_name } = body;
      if (!ref || !category || !title_en) {
        return jsonResponse({ error: "Reference code, category, and English title are required." }, 400);
      }
      const hlJson = JSON.stringify(Array.isArray(highlights) ? highlights : (highlights || "").split("\n").filter(Boolean));

      if (isEdit) {
        await env.DB.prepare(
          `UPDATE resources SET ref=?, category=?, year=?, format=?, size=?, title_en=?, title_am=?, summary_en=?, summary_am=?, highlights_json=?, file_key=COALESCE(?, file_key), file_name=COALESCE(?, file_name), uploaded_by=? WHERE id=?`
        )
          .bind(ref, category, year || "2026", format || "PDF", size || "1.5 MB", title_en, title_am || title_en, summary_en || "", summary_am || summary_en || "", hlJson, file_key || null, file_name || null, user.full_name, id)
          .run();
        return jsonResponse({ success: true, message: "Resource updated successfully." });
      } else {
        await env.DB.prepare(
          `INSERT INTO resources (ref, category, year, format, size, title_en, title_am, summary_en, summary_am, highlights_json, file_key, file_name, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(ref, category, year || "2026", format || "PDF", size || "1.5 MB", title_en, title_am || title_en, summary_en || "", summary_am || summary_en || "", hlJson, file_key || null, file_name || null, user.full_name)
          .run();
        return jsonResponse({ success: true, message: "New resource published to portal." });
      }
    }

    // B. NEWS, EVENTS, MEDIA, PRESS RELEASE
    if (type === "news") {
      const { id, tab_type, badge_en, badge_am, date_en, date_am, location_or_ref, title_en, title_am, desc_en, desc_am, full_text, media_url, file_key } = body;
      if (!tab_type || !title_en) {
        return jsonResponse({ error: "Section tab type and title are required." }, 400);
      }

      if (isEdit) {
        await env.DB.prepare(
          `UPDATE news_items SET tab_type=?, badge_en=?, badge_am=?, date_en=?, date_am=?, location_or_ref=?, title_en=?, title_am=?, desc_en=?, desc_am=?, full_text=?, media_url=?, file_key=COALESCE(?, file_key), created_by=? WHERE id=?`
        )
          .bind(tab_type, badge_en || "Update", badge_am || "መረጃ", date_en || "Nov 2026", date_am || "ህዳር 2019", location_or_ref || "Assosa", title_en, title_am || title_en, desc_en || "", desc_am || desc_en || "", full_text || desc_en || "", media_url || "", file_key || null, user.full_name, id)
          .run();
        return jsonResponse({ success: true, message: "News/Media item updated." });
      } else {
        await env.DB.prepare(
          `INSERT INTO news_items (tab_type, badge_en, badge_am, date_en, date_am, location_or_ref, title_en, title_am, desc_en, desc_am, full_text, media_url, file_key, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(tab_type, badge_en || "Update", badge_am || "መረጃ", date_en || "Nov 2026", date_am || "ህዳር 2019", location_or_ref || "Assosa", title_en, title_am || title_en, desc_en || "", desc_am || desc_en || "", full_text || desc_en || "", media_url || "", file_key || null, user.full_name)
          .run();
        return jsonResponse({ success: true, message: "News/Media item published." });
      }
    }

    // C. OFFICIAL NOTICES: TENDERS (BIDS), VACANCIES (JOBS), DIRECTIVES (LAWS)
    if (type === "notices") {
      const { id, tab_type, ref, title, deadline, tag, details, file_key, file_name } = body;
      if (!tab_type || !ref || !title) {
        return jsonResponse({ error: "Category, Reference No., and Title are required." }, 400);
      }

      if (isEdit) {
        await env.DB.prepare(
          `UPDATE notices SET tab_type=?, ref=?, title=?, deadline=?, tag=?, details=?, file_key=COALESCE(?, file_key), file_name=COALESCE(?, file_name), updated_by=? WHERE id=?`
        )
          .bind(tab_type, ref, title, deadline || "Open", tag || "Official", details || "", file_key || null, file_name || null, user.full_name, id)
          .run();
        return jsonResponse({ success: true, message: "Tender / Notice updated successfully." });
      } else {
        await env.DB.prepare(
          `INSERT INTO notices (tab_type, ref, title, deadline, tag, details, file_key, file_name, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(tab_type, ref, title, deadline || "Open", tag || "Official", details || "", file_key || null, file_name || null, user.full_name)
          .run();
        return jsonResponse({ success: true, message: "New Tender / Notice published." });
      }
    }

    // D. INFRASTRUCTURE PROJECTS
    if (type === "projects") {
      const { id, zone, zone_label, title, status, progress, budget, contractor, desc, img_url } = body;
      if (!zone || !title) {
        return jsonResponse({ error: "Zone and Project Title are required." }, 400);
      }

      if (isEdit) {
        await env.DB.prepare(
          `UPDATE projects SET zone=?, zone_label=?, title=?, status=?, progress=?, budget=?, contractor=?, desc=?, img_url=?, updated_by=? WHERE id=?`
        )
          .bind(zone, zone_label || zone, title, status || "In Progress", Number(progress) || 0, budget || "TBD", contractor || "Regional Enterprise", desc || "", img_url || "", user.full_name, id)
          .run();
        return jsonResponse({ success: true, message: "Infrastructure project updated." });
      } else {
        await env.DB.prepare(
          `INSERT INTO projects (zone, zone_label, title, status, progress, budget, contractor, desc, img_url, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(zone, zone_label || zone, title, status || "In Progress", Number(progress) || 0, budget || "TBD", contractor || "Regional Enterprise", desc || "", img_url || "", user.full_name)
          .run();
        return jsonResponse({ success: true, message: "Infrastructure project added." });
      }
    }
  }

  // DELETE ITEM
  if (request.method === "DELETE") {
    const id = url.searchParams.get("id");
    const tableMap = {
      resources: "resources",
      news: "news_items",
      notices: "notices",
      projects: "projects"
    };
    const tableName = tableMap[type];
    if (!tableName || !id) {
      return jsonResponse({ error: "Invalid type or id." }, 400);
    }
    await env.DB.prepare(`DELETE FROM ${tableName} WHERE id = ?`).bind(id).run();
    return jsonResponse({ success: true, message: "Record deleted." });
  }

  return jsonResponse({ error: "Unsupported request." }, 400);
}
