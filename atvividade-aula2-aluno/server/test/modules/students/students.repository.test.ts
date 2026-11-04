import type { Database } from "../../../src/database/connection";
import {
  PgStudentRepository,
  type Student,
} from "../../../src/modules/students/students.repository";

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

describe("PgStudentRepository", () => {
  let query: jest.Mock;
  let repository: PgStudentRepository;

  beforeEach(() => {
    query = jest.fn();
    const db = { query } as unknown as Database;
    repository = new PgStudentRepository(db);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("create", () => {
    test("retorna a linha criada e envia INSERT parametrizado com RETURNING ra, name", async () => {
      const row: Student = { ra: 123, name: "Ana" };
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.create({ ra: 123, name: "Ana" });

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expect(normalized).toContain("INSERT INTO students (ra, name)");
      expect(normalized).toContain("VALUES ($1, $2)");
      expect(normalized).toContain("RETURNING ra, name");
      expect(params).toEqual([123, "Ana"]);
    });

    test("propaga a mesma instância de Error quando query rejeita", async () => {
      const failure = new Error("falha no banco");
      query.mockRejectedValue(failure);

      await expect(repository.create({ ra: 123, name: "Ana" })).rejects.toBe(
        failure,
      );
    });
  });

  describe("findAll", () => {
    test("retorna as linhas simuladas e envia SELECT ra, name com ORDER BY name, sem parâmetros", async () => {
      const rows: Student[] = [
        { ra: 123, name: "Ana" },
        { ra: 456, name: "Bruno" },
      ];
      query.mockResolvedValue({ rows });

      const result = await repository.findAll();

      expect(result).toEqual(rows);
      expect(query).toHaveBeenCalledTimes(1);
      const call = query.mock.calls[0];
      const normalized = normalizeSql(call[0]);
      expect(normalized).toContain("SELECT ra, name FROM students");
      expect(normalized).toContain("ORDER BY name");
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
    test("retorna a primeira linha e filtra por ra = $1 com parâmetros [123]", async () => {
      const rows: Student[] = [
        { ra: 123, name: "Ana" },
        { ra: 456, name: "Bruno" },
      ];
      query.mockResolvedValue({ rows });

      const result = await repository.findOne(123);

      expect(result).toEqual(rows[0]);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expect(normalized).toContain("SELECT ra, name FROM students");
      expect(normalized).toContain("WHERE ra = $1");
      expect(params).toEqual([123]);
    });

    test("retorna undefined quando rows é []", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findOne(123)).resolves.toBeUndefined();
    });

    test("propaga a mesma instância de Error quando query rejeita", async () => {
      const failure = new Error("falha no banco");
      query.mockRejectedValue(failure);

      await expect(repository.findOne(123)).rejects.toBe(failure);
    });
  });
});
