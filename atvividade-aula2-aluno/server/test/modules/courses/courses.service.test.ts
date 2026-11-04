import { HttpError } from "../../../src/errors";
import type {
  Course,
  CourseRepository,
} from "../../../src/modules/courses/courses.repository";
import { CoursesService } from "../../../src/modules/courses/courses.service";

// Dublê do repositório: cada método é uma função simulada (jest.fn).
function createRepositoryMock(): jest.Mocked<CourseRepository> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };
}

// Captura o erro rejeitado por uma promise para poder inspecioná-lo.
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

describe("CoursesService", () => {
  let repository: jest.Mocked<CourseRepository>;
  let service: CoursesService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new CoursesService(repository);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("create", () => {
    test("cria a disciplina com dados válidos e retorna o registro criado", async () => {
      const created: Course = { id: 1, name: "Qualidade" };
      repository.create.mockResolvedValue(created); // stub: resposta predefinida

      const result = await service.create({ name: "Qualidade" });

      expect(result).toBe(created);
      // mock: verificação da interação com o repositório
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
    });

    test.each<[string, unknown]>([
      ["null", null],
      ["objeto vazio {}", {}],
      ['{ name: "A" } (nome curto)', { name: "A" }],
    ])(
      "lança HttpError 400 e não chama repository.create quando a entrada é %s",
      async (_label, input) => {
        await expectHttpError(service.create(input), 400);

        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    test("lança HttpError 409 quando o nome já existe (violação de unicidade)", async () => {
      repository.create.mockRejectedValue({ code: "23505" });

      await expectHttpError(service.create({ name: "Qualidade" }), 409);
    });

    test("envia ao repositório somente o campo name, ignorando campos extras", async () => {
      repository.create.mockResolvedValue({ id: 1, name: "Qualidade" });

      await service.create({ name: "Qualidade", extra: true });

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
      expect(repository.create.mock.calls[0][0]).toStrictEqual({
        name: "Qualidade",
      });
    });

    test("propaga a mesma instância de Error quando repository.create falha", async () => {
      const failure = new Error("falha inesperada");
      repository.create.mockRejectedValue(failure);

      const error = await catchError(service.create({ name: "Qualidade" }));

      expect(error).toBe(failure);
      expect(error).not.toBeInstanceOf(HttpError);
    });
  });

  describe("findAll", () => {
    test("retorna a lista do repositório com uma única chamada a findAll", async () => {
      const courses: Course[] = [
        { id: 1, name: "Qualidade" },
        { id: 2, name: "Testes" },
      ];
      repository.findAll.mockResolvedValue(courses); // stub

      const result = await service.findAll();

      expect(result).toEqual(courses);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });

    test("propaga a mesma instância de Error quando repository.findAll falha", async () => {
      const failure = new Error("falha inesperada");
      repository.findAll.mockRejectedValue(failure);

      const error = await catchError(Promise.resolve(service.findAll()));

      expect(error).toBe(failure);
      expect(error).not.toBeInstanceOf(HttpError);
    });
  });

  describe("findOne", () => {
    test("retorna a disciplina existente e encaminha o id ao repositório", async () => {
      const course: Course = { id: 123, name: "Qualidade" };
      repository.findOne.mockResolvedValue(course);

      const result = await service.findOne(123);

      expect(result).toBe(course);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123);
    });

    test("lança HttpError 404 quando o repositório retorna undefined", async () => {
      repository.findOne.mockResolvedValue(undefined);

      await expectHttpError(service.findOne(123), 404);
      expect(repository.findOne).toHaveBeenCalledWith(123);
    });

    test("lança HttpError 400 para id inválido e não consulta o repositório", async () => {
      await expectHttpError(service.findOne(0), 400);

      expect(repository.findOne).not.toHaveBeenCalled();
    });

    test("propaga a mesma instância de Error quando repository.findOne falha", async () => {
      const failure = new Error("falha inesperada");
      repository.findOne.mockRejectedValue(failure);

      const error = await catchError(service.findOne(123));

      expect(error).toBe(failure);
      expect(error).not.toBeInstanceOf(HttpError);
    });
  });

  describe("uso de spy", () => {
    test("observa findOne de um stub existente com jest.spyOn e confere o id recebido", async () => {
      const course: Course = { id: 1, name: "Qualidade" };
      // stub com métodos assíncronos (objeto real, não jest.fn)
      const stubRepository: CourseRepository = {
        create: async () => course,
        findAll: async () => [course],
        findOne: async () => course,
      };
      const spy = jest.spyOn(stubRepository, "findOne");
      const spiedService = new CoursesService(stubRepository);

      const result = await spiedService.findOne(1);

      expect(result).toEqual(course);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(1);
    });
  });
});
