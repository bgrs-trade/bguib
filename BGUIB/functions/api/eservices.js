import { jsonResponse, verifyToken } from "../_utils.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const tracking = url.searchParams.get("tracking") || "";

  if (!env.DB) {
    return jsonResponse({ error: "D1 Database (DB) binding missing." }, 500);
  }

  // GET: Public tracking by code OR Staff list all submissions
  if (request.method === "GET") {
    if (tracking) {
      const row = await env.DB.prepare("SELECT * FROM eservice_submissions WHERE tracking_code = ?")
        .bind(tracking.trim().toUpperCase())
        .first();
      if (!row) {
        return jsonResponse({ error: "No application found with that tracking number." }, 404);
      }
      return jsonResponse({ submission: row });
    }

    const user = await verifyToken(request, env);
    if (!user) {
      return jsonResponse({ error: "Staff authentication required to view all citizen submissions." }, 401);
    }

    const { results } = await env.DB.prepare("SELECT * FROM eservice_submissions ORDER BY created_at DESC").all();
    return jsonResponse({ submissions: results || [] });
  }

  // POST: Citizen submits new E-Service request (Building Permit, Contractor License, Cadastre, Grievance)
  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const { service_type, applicant_name, contact_info, municipality, reference_detail, description, attachment_key, attachment_name } = body;

    if (!service_type || !applicant_name) {
      return jsonResponse({ error: "Service type and applicant name are required." }, 400);
    }

    const prefixMap = {
      "Building Permit Application": "BP",
      "Contractor Competency Registration": "CR",
      "Urban Land Cadastre Inquiry": "CAD",
      "Infrastructure & Citizen Grievance Report": "GRV",
      "Direct Bureau Inquiry": "INQ"
    };
    const prefix = prefixMap[service_type] || "BGUI";
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `${prefix}-2026-${randNum}`;

    await env.DB.prepare(
      `INSERT INTO eservice_submissions (tracking_code, service_type, applicant_name, contact_info, municipality, reference_detail, description, attachment_key, attachment_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')`
    )
      .bind(
        trackingCode,
        service_type,
        applicant_name,
        contact_info || "N/A",
        municipality || "Assosa",
        reference_detail || "",
        description || "",
        attachment_key || null,
        attachment_name || null
      )
      .run();

    return jsonResponse({
      success: true,
      tracking_code: trackingCode,
      message: "Your request has been registered in the BGUI E-Services Portal."
    });
  }

  // PUT: Staff / Admin responds to Citizen E-Service request & updates status
  if (request.method === "PUT") {
    const user = await verifyToken(request, env);
    if (!user) {
      return jsonResponse({ error: "Staff authentication required." }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const { id, status, staff_response } = body;
    if (!id || !status) {
      return jsonResponse({ error: "Submission ID and new status are required." }, 400);
    }

    await env.DB.prepare(
      `UPDATE eservice_submissions SET status = ?, staff_response = ?, responded_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
      .bind(status, staff_response || "", `${user.full_name} (${user.department})`, id)
      .run();

    return jsonResponse({ success: true, message: "Official response saved and visible to citizen tracker." });
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
}
