import { db } from "@/db";
import { user } from "@/db/schema";

describe("Drizzle ORM", () => {
  test("should be able to import database instance", () => {
    expect(db).toBeDefined();
  });

  test("should be able to import schema", () => {
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.name).toBeDefined();
  });

  // Note: These tests require the database to be set up
  // Uncomment when ready to test actual database operations
  
  /*
  test("should be able to query user table", async () => {
    const result = await db.select().from(user).limit(1);
    expect(Array.isArray(result)).toBe(true);
  });

  test("should be able to insert and delete a test user", async () => {
    // Insert test user
    const [insertedUser] = await db.insert(user).values({
      name: "Test User",
      email: "test@example.com"
    }).returning();

    expect(insertedUser).toBeDefined();
    expect(insertedUser.email).toBe("test@example.com");
    expect(insertedUser.name).toBe("Test User");

    // Clean up - delete test user
    await db.delete(user).where(eq(user.id, insertedUser.id));
  });
  */
});