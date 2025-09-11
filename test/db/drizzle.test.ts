import { db } from "@/db";
import { users } from "@/db/schema";

describe("Drizzle ORM", () => {
  test("should be able to import database instance", () => {
    expect(db).toBeDefined();
  });

  test("should be able to import schema", () => {
    expect(users).toBeDefined();
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.name).toBeDefined();
  });

  // Note: These tests require the database to be set up
  // Uncomment when ready to test actual database operations
  
  /*
  test("should be able to query users table", async () => {
    const result = await db.select().from(users).limit(1);
    expect(Array.isArray(result)).toBe(true);
  });

  test("should be able to insert and delete a test user", async () => {
    // Insert test user
    const [insertedUser] = await db.insert(users).values({
      name: "Test User",
      email: "test@example.com"
    }).returning();

    expect(insertedUser).toBeDefined();
    expect(insertedUser.email).toBe("test@example.com");
    expect(insertedUser.name).toBe("Test User");

    // Clean up - delete test user
    await db.delete(users).where(eq(users.id, insertedUser.id));
  });
  */
});