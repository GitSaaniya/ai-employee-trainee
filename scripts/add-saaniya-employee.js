/**
 * Add Saaniya employee into the legacy/blob path if still used.
 * Prefer ensure-saaniya-user.js for normalized collections.
 * Usage: set MONGODB_URI then `node scripts/add-saaniya-employee.js`
 */
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Set MONGODB_URI in the environment (from .env.local).");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || "skillsim").collection("app_state");
  const doc = await col.findOne({ _id: "app_data_v1" });
  if (!doc?.data) {
    console.error("No app_state.data — use scripts/ensure-saaniya-user.js instead");
    process.exit(1);
  }
  const data = doc.data;
  const email = "worksaaniya@gmail.com";
  if (data.users.some((u) => (u.email || "").toLowerCase() === email)) {
    console.log("Already exists:", email);
  } else {
    const now = new Date().toISOString();
    data.users.push({
      id: "user_emp_saaniya",
      organisationId: data.organisation?.id || "org_meridian",
      email,
      name: "Saaniya",
      role: "employee",
      avatarInitials: "SA",
      createdAt: now,
      updatedAt: now,
    });
    data.employeeProfiles.push({
      id: "ep_saaniya",
      userId: "user_emp_saaniya",
      organisationId: data.organisation?.id || "org_meridian",
      roleId: "role_fmcg_sales",
      departmentId: "dept_fmcg",
      managerId: "user_admin_1",
      readinessScore: 0,
      previousScore: 0,
      riskLevel: "medium",
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await col.updateOne({ _id: "app_data_v1" }, { $set: { data, updatedAt: now } });
    console.log("Added employee:", email);
  }
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
