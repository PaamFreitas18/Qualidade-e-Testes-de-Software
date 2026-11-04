import type { Database } from "../../../src/database/connection";
import {
  PgCourseRepository,
  type Course,
} from "../../../src/modules/courses/courses.repository";

// Remove diferenças de espaços e quebras de linha para comparar SQL.
function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

describe("PgCourseRepository", () => {
  let query: jest.Mock;
  let repository: PgCourseRepository;

  beforeEach(() => {
    query = jest.fn();
    const db = { query } as unknown as Database;
    repository = new PgCourseRepository(db);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("create", () => {
    test("retorna a linha criada e envia INSERT parametrizado com RETURNING id, name", async () => {
      const row: Course = { id: 1, name: "Qualidade" };
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.create({ name: "Qualidade" });

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expect(normalized).toContain("INSERT INTO courses (name)");
      expect(normalized).toContain("VALUES ($1)");
      expect(normalized).toContain("RETURNING id, name");
      expect(params).toEqual(["Qualidade"]);
    });

    test("propaga a mesma instância de Error quando query rejeita", async () => {
      const failure = new Error("falha no banco");
      query.mockRejectedValue(failure);

      await expect(repository.create({ name: "Qualidade" })).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("retorna as linhas simuladas e envia SELECT id, name com ORDER BY id, sem parâmetros", async () => {
      const rows: Course[] = [
        { id: 1, name: "Qualidade" },
        { id: 2, name: "Testes" },
      ];
      query.mockResolvedValue({ rows });

      const result = await repository.findAll();

      expect(result).toEqual(rows);
      expect(query).toHaveBeenCalledTimes(1);
      const call = query.mock.calls[0];
      const normalized = normalizeSql(call[0]);
      expect(normalized).toContain("SELECT id, name FROM courses");
      expect(normalized).toContain("ORDER BY id");
      expect(call).toHaveLength(1); // nenhum array de parâmetros
    });

    test("retorna lista vazia quando rows é []", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findAll()).resolves.toEqual([]);
    });

    test("propaga a mesma instância de Error quando query rejeita", async () => {
      const failure = new Error("falha no banco");
      query.mockRejectedValue(failure);

      await expect(repository.findAll()).rejects.toBe(failure);
    });
  });

  describe("findOne", () => {
    test("retorna a primeira linha e filtra por id = $1 com parâmetros [7]", async () => {
      const rows: Course[] = [
        { id: 7, name: "Qualidade" },
        { id: 8, name: "Outra" },
      ];
      query.mockResolvedValue({ rows });

      const result = await repository.findOne(7);

      expect(result).toEqual(rows[0]);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expect(normalized).toContain("SELECT id, name FROM courses");
      expect(normalized).toContain("WHERE id = $1");
      expect(params).toEqual([7]);
    });

    test("retorna undefined quando rows é []", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findOne(7)).resolves.toBeUndefined();
    });

    test("propaga a mesma instância de Error quando query rejeita", async () => {
      const failure = new Error("falha no banco");
      query.mockRejectedValue(failure);

      await expect(repository.findOne(7)).rejects.toBe(failure);
    });
  });
});
