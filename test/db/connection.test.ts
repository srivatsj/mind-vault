import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

describe("Database Connection", () => {
  let client: ReturnType<typeof postgres>;

  beforeAll(() => {
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    client = postgres(connectionString);
  });

  afterAll(async () => {
    await client.end();
  });

  test("should connect to database successfully", async () => {
    const result = await client`SELECT NOW() as current_time`;
    expect(result).toHaveLength(1);
    expect(result[0].current_time).toBeInstanceOf(Date);
  });

  test("should be able to query database version", async () => {
    const result = await client`SELECT version()`;
    expect(result).toHaveLength(1);
    expect(result[0].version).toContain("PostgreSQL");
  });
});