import type { Database } from "../../../src/database/connection";
import {
  PgEnrollmentRepository,
  type Enrollment,
} from "../../../src/modules/enrollments/enrollments.repository";

// Data fixa para tornar os testes reproduzíveis.
const ENROLLED_AT = new Date("2025-01-15T10:00:00.000Z");

function createEnrollment(studentRa = 123, courseId = 7): Enrollment {
  return { studentRa, courseId, enrolledAt: ENROLLED_AT };
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

// Aliases em camelCase exigidos tanto no RETURNING quanto nos SELECTs.
function expectCamelCaseAliases(normalizedSql: string): void {
  expect(normalizedSql).toContain('student_ra AS "studentRa"');
  expect(normalizedSql).toContain('course_id AS "courseId"');
  expect(normalizedSql).toContain('enrolled_at AS "enrolledAt"');
}

describe("PgEnrollmentRepository", () => {
  let query: jest.Mock;
  let repository: PgEnrollmentRepository;

  beforeEach(() => {
    query = jest.fn();
    const db = { query } as unknown as Database;
    repository = new PgEnrollmentRepository(db);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("create", () => {
    test("retorna a linha criada em camelCase e envia INSERT parametrizado com RETURNING e aliases", async () => {
      const row = createEnrollment(123, 7);
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.create(123, 7);

      expect(result).toEqual(row);
      expect(result.studentRa).toBe(123);
      expect(result.courseId).toBe(7);
      expect(result.enrolledAt).toBe(ENROLLED_AT);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expect(normalized).toContain("INSERT INTO enrollments (student_ra, course_id)");
      expect(normalized).toContain("VALUES ($1, $2)");
      expect(normalized).toContain("RETURNING");
      expectCamelCaseAliases(normalized.slice(normalized.indexOf("RETURNING")));
      expect(params).toEqual([123, 7]);
    });

    test("propaga a mesma instância de Error quando query rejeita", async () => {
      const failure = new Error("falha no banco");
      query.mockRejectedValue(failure);

      await expect(repository.create(123, 7)).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("retorna as linhas simuladas e envia SELECT com aliases e ORDER BY student_ra, course_id, sem parâmetros", async () => {
      const rows = [createEnrollment(123, 1), createEnrollment(123, 7)];
      query.mockResolvedValue({ rows });

      const result = await repository.findAll();

      expect(result).toEqual(rows);
      expect(result[0].enrolledAt).toBe(ENROLLED_AT);
      expect(query).toHaveBeenCalledTimes(1);
      const call = query.mock.calls[0];
      const normalized = normalizeSql(call[0]);
      expectCamelCaseAliases(normalized);
      expect(normalized).toContain("FROM enrollments");
      expect(normalized).toContain("ORDER BY student_ra, course_id");
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
    test("retorna a primeira linha e filtra por student_ra = $1 AND course_id = $2 com parâmetros [123, 7]", async () => {
      const rows = [createEnrollment(123, 7), createEnrollment(456, 8)];
      query.mockResolvedValue({ rows });

      const result = await repository.findOne(123, 7);

      expect(result).toEqual(rows[0]);
      expect(result?.enrolledAt).toBe(ENROLLED_AT);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expectCamelCaseAliases(normalized);
      expect(normalized).toContain("FROM enrollments");
      expect(normalized).toContain("WHERE student_ra = $1 AND course_id = $2");
      expect(params).toEqual([123, 7]);
    });

    test("retorna undefined quando rows é []", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findOne(123, 7)).resolves.toBeUndefined();
    });

    test("propaga a mesma instância de Error quando query rejeita", async () => {
      const failure = new Error("falha no banco");
      query.mockRejectedValue(failure);

      await expect(repository.findOne(123, 7)).rejects.toBe(failure);
    });
  });
});
