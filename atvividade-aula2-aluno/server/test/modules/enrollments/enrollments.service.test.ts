import { HttpError } from "../../../src/errors";
import type {
  Enrollment,
  EnrollmentRepository,
} from "../../../src/modules/enrollments/enrollments.repository";
import { EnrollmentsService } from "../../../src/modules/enrollments/enrollments.service";

// Data fixa para tornar os testes reproduzíveis.
const ENROLLED_AT = new Date("2025-01-15T10:00:00.000Z");

function createEnrollment(studentRa = 123, courseId = 1): Enrollment {
  return { studentRa, courseId, enrolledAt: ENROLLED_AT };
}

function createRepositoryMock(): jest.Mocked<EnrollmentRepository> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };
}

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("A promise deveria ter sido rejeitada.");
}

async function expectHttpError(promise: Promise<unknown>, statusCode: number) {
  const error = await catchError(promise);
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(statusCode);
}

describe("EnrollmentsService", () => {
  let repository: jest.Mocked<EnrollmentRepository>;
  let service: EnrollmentsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new EnrollmentsService(repository);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("create", () => {
    test("cria a matrícula válida e encaminha os argumentos separados 123 e 1, nessa ordem", async () => {
      const created = createEnrollment(123, 1);
      repository.create.mockResolvedValue(created);

      const result = await service.create({ studentRa: 123, courseId: 1 });

      expect(result).toBe(created);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(123, 1);
    });

    test.each<[string, unknown]>([
      ["studentRa igual a 0", { studentRa: 0, courseId: 1 }],
      ["courseId igual a 0", { studentRa: 123, courseId: 0 }],
    ])(
      "lança HttpError 400 e não chama repository.create com %s",
      async (_label, input) => {
        await expectHttpError(service.create(input), 400);

        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    test("lança HttpError 404 quando aluno ou disciplina não existe (violação de chave estrangeira)", async () => {
      repository.create.mockRejectedValue({ code: "23503" });

      await expectHttpError(service.create({ studentRa: 123, courseId: 1 }), 404);
    });

    test("lança HttpError 409 quando a matrícula já existe (violação de unicidade)", async () => {
      repository.create.mockRejectedValue({ code: "23505" });

      await expectHttpError(service.create({ studentRa: 123, courseId: 1 }), 409);
    });

    test("propaga a mesma instância de Error em falha inesperada na criação", async () => {
      const failure = new Error("falha inesperada");
      repository.create.mockRejectedValue(failure);

      const error = await catchError(
        service.create({ studentRa: 123, courseId: 1 }),
      );

      expect(error).toBe(failure);
      expect(error).not.toBeInstanceOf(HttpError);
    });
  });

  describe("findAll", () => {
    test("retorna a lista de matrículas e chama repository.findAll uma vez, sem argumentos", async () => {
      const enrollments = [createEnrollment(123, 1), createEnrollment(123, 2)];
      repository.findAll.mockResolvedValue(enrollments);

      const result = await service.findAll();

      expect(result).toEqual(enrollments);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith();
    });
  });

  describe("findOne", () => {
    test("retorna a matrícula existente e chama repository.findOne uma vez com ambos os identificadores", async () => {
      const enrollment = createEnrollment(123, 1);
      repository.findOne.mockResolvedValue(enrollment);

      const result = await service.findOne(123, 1);

      expect(result).toBe(enrollment);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123, 1);
    });

    test("lança HttpError 404 quando a matrícula não existe e encaminha os identificadores na ordem correta", async () => {
      repository.findOne.mockResolvedValue(undefined);

      await expectHttpError(service.findOne(123, 1), 404);

      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123, 1);
    });
  });
});
