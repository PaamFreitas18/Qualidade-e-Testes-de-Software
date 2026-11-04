import { HttpError } from "../src/errors";
import {
  parseId,
  positiveInteger,
  validateBody,
  validateName,
} from "../src/validation";

// Verifica que a função lança um HttpError com statusCode 400.
function expectBadRequest(action: () => unknown): void {
  let thrown: unknown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(HttpError);
  expect((thrown as HttpError).statusCode).toBe(400);
}

describe("positiveInteger", () => {
  test.each([1, 2147483647])(
    "retorna o próprio número quando a entrada é %p",
    (value) => {
      expect(positiveInteger(value, "RA")).toBe(value);
    },
  );

  test.each<[string, unknown]>([
    ["0", 0],
    ["-1", -1],
    ["1.5", 1.5],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["2147483648", 2147483648],
    ['"123" (string numérica)', "123"],
    ["null", null],
    ["undefined", undefined],
  ])("lança HttpError 400 quando a entrada é %s", (_label, value) => {
    expectBadRequest(() => positiveInteger(value, "RA"));
  });
});

describe("parseId", () => {
  test.each([
    ["1", 1],
    ["2147483647", 2147483647],
  ])('converte a string "%s" para o número %p', (value, expected) => {
    expect(parseId(value, "RA")).toBe(expected);
  });

  test.each<[string, unknown]>([
    ['"1abc"', "1abc"],
    ['"1.2"', "1.2"],
    ['"1e2"', "1e2"],
    ['"" (string vazia)', ""],
    ['"-1"', "-1"],
    ['"0"', "0"],
    ['"2147483648"', "2147483648"],
    ["o número 123", 123],
  ])("lança HttpError 400 quando a entrada é %s", (_label, value) => {
    expectBadRequest(() => parseId(value, "RA"));
  });
});

describe("validateName", () => {
  test.each<[string, string]>([
    ['"Ana"', "Ana"],
    ["string com 100 letras a", "a".repeat(100)],
  ])("retorna o nome recebido quando a entrada é %s", (_label, value) => {
    expect(validateName(value)).toBe(value);
  });

  test.each<[string, unknown]>([
    ['"" (string vazia)', ""],
    ['"ab" (curto demais)', "ab"],
    ['"   " (apenas espaços)', "   "],
    ['" a " (espaços não tornam o nome válido)', " a "],
    ["string com 101 letras a", "a".repeat(101)],
    ["o número 123", 123],
    ["null", null],
    ["undefined", undefined],
  ])("lança HttpError 400 quando a entrada é %s", (_label, value) => {
    expectBadRequest(() => validateName(value));
  });
});

describe("validateBody", () => {
  test("retorna a mesma referência de um objeto congelado, sem modificá-lo", () => {
    const body = Object.freeze({ name: "Ana" });

    const result = validateBody(body);

    expect(result).toBe(body);
    expect(body).toEqual({ name: "Ana" });
    expect(Object.isFrozen(body)).toBe(true);
  });

  test.each<[string, unknown]>([
    ["null", null],
    ["undefined", undefined],
    ["array vazio", []],
    ['string "Ana"', "Ana"],
    ["número 12", 12],
  ])("lança HttpError 400 quando a entrada é %s", (_label, value) => {
    expectBadRequest(() => validateBody(value));
  });

  test("aceita campos extras e retorna a mesma referência sem alterar o objeto", () => {
    const body = { name: "Ana", extra: true };

    const result = validateBody(body);

    expect(result).toBe(body);
    expect(body).toEqual({ name: "Ana", extra: true });
  });
});
