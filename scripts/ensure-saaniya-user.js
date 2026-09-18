/**
 * Ensure worksaaniya@gmail.com exists in users + employee_profiles.
 * Usage: set MONGODB_URI then `node scripts/ensure-saaniya-user.js`
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
  const db = client.db(process.env.MONGODB_DB || "skillsim");
  const email = "worksaaniya@gmail.com";
  const now = new Date().toISOString();

  const existing = await db.collection("users").findOne({
    email: { $regex: new RegExp(`^${email}$`, "i") },
  });

  if (existing) {
    console.log("User already in users collection:", existing.email, existing.id || existing._id);
  } else {
    await db.collection("users").replaceOne(
      { _id: "user_emp_saaniya" },
      {
        _id: "user_emp_saaniya",
        id: "user_emp_saaniya",
        organisationId: "org_meridian",
        email,
        name: "Saaniya",
        role: "employee",
        avatarInitials: "SA",
        createdAt: now,
        updatedAt: now,
      },
      { upsert: true }
    );
    console.log("Inserted user:", email);
  }

  const profile = await db.collection("employee_profiles").findOne({
    userId: "user_emp_saaniya",
  });
  if (!profile) {
    await db.collection("employee_profiles").replaceOne(
      { _id: "ep_saaniya" },
      {
        _id: "ep_saaniya",
        id: "ep_saaniya",
        userId: "user_emp_saaniya",
        organisationId: "org_meridian",
        roleId: "role_fmcg_sales",
        departmentId: "dept_fmcg",
        managerId: "user_admin_1",
        readinessScore: 0,
        previousScore: 0,
        riskLevel: "medium",
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      },
      { upsert: true }
    );
    console.log("Inserted employee_profiles: ep_saaniya");
  } else {
    console.log("Profile already exists");
  }

  console.log("Total users:", await db.collection("users").countDocuments());
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
