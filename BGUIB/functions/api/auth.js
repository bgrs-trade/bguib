import { jsonResponse, hashPassword, signToken, verifyToken } from "../_utils.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";

  if (!env.DB) {
    return jsonResponse({ error: "D1 Database (DB) binding is not configured in Cloudflare." }, 500);
  }

  // GET: Check if an admin already exists OR list staff accounts (for admin)
  if (request.method === "GET") {
    if (action === "status") {
      const adminRow = await env.DB.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'").first();
      return jsonResponse({ adminExists: (adminRow?.cnt || 0) > 0 });
    }

    if (action === "users") {
      const user = await verifyToken(request, env);
      if (!user || user.role !== "admin") {
        return jsonResponse({ error: "Admin authorization required." }, 403);
      }
      const { results } = await env.DB.prepare(
        "SELECT id, full_name, email, department, role, status, created_at FROM users ORDER BY created_at DESC"
      ).all();
      return jsonResponse({ users: results });
    }
  }

  // POST: Register (Admin or Staff), Sign In, or Approve/Reject Staff
  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));

    // 1. REGISTER
    if (action === "register") {
      const { full_name, email, department, password, role } = body;
      if (!full_name || !email || !department || !password) {
        return jsonResponse({ error: "All fields are required." }, 400);
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(cleanEmail).first();
      if (existing) {
        return jsonResponse({ error: "An account with this email is already registered." }, 409);
      }

      const adminCount = await env.DB.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'").first();
      const hasAdmin = (adminCount?.cnt || 0) > 0;

      let assignedRole = "staff";
      let assignedStatus = "pending";

      if (role === "admin") {
        if (hasAdmin) {
          return jsonResponse({
            error: "System Administrator account already exists. Please register as Staff and await Admin confirmation."
          }, 403);
        }
        assignedRole = "admin";
        assignedStatus = "approved";
      } else {
        assignedRole = "staff";
        assignedStatus = "pending";
      }

      const { hashHex, saltHex } = await hashPassword(password);
      await env.DB.prepare(
        "INSERT INTO users (full_name, email, department, role, status, password_hash, salt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(full_name.trim(), cleanEmail, department.trim(), assignedRole, assignedStatus, hashHex, saltHex)
        .run();

      return jsonResponse({
        success: true,
        role: assignedRole,
        status: assignedStatus,
        message:
          assignedRole === "admin"
            ? "Admin registration completed! You can now sign in immediately."
            : "Staff registration submitted! Your account is PENDING confirmation by the System Administrator before you can sign in."
      });
    }

    // 2. SIGN IN
    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) {
        return jsonResponse({ error: "Email and password are required." }, 400);
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(cleanEmail).first();
      if (!user) {
        return jsonResponse({ error: "Invalid email or password." }, 401);
      }

      const { hashHex } = await hashPassword(password, user.salt);
      if (hashHex !== user.password_hash) {
        return jsonResponse({ error: "Invalid email or password." }, 401);
      }

      if (user.status === "pending") {
        return jsonResponse({
          error: "Your staff registration is awaiting Administrator approval. You cannot sign in until confirmed by the Admin."
        }, 403);
      }

      if (user.status === "rejected") {
        return jsonResponse({
          error: "Your staff registration request was declined by the Administrator."
        }, 403);
      }

      const token = await signToken(
        { id: user.id, email: user.email, full_name: user.full_name, department: user.department, role: user.role },
        env.JWT_SECRET
      );

      return jsonResponse({
        success: true,
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          department: user.department,
          role: user.role
        }
      });
    }

    // 3. ADMIN APPROVE / REJECT / PROMOTE STAFF
    if (action === "approve") {
      const adminUser = await verifyToken(request, env);
      if (!adminUser || adminUser.role !== "admin") {
        return jsonResponse({ error: "Only an approved Administrator can confirm staff registrations." }, 403);
      }

      const { user_id, status } = body;
      if (!user_id || !["approved", "rejected", "pending"].includes(status)) {
        return jsonResponse({ error: "Invalid user_id or status." }, 400);
      }

      await env.DB.prepare("UPDATE users SET status = ? WHERE id = ?").bind(status, user_id).run();
      return jsonResponse({ success: true, message: `Staff account status updated to ${status}.` });
    }
  }

  return jsonResponse({ error: "Method or action not supported." }, 405);
}
