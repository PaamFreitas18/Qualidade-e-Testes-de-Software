import { isUniqueViolation } from "../../src/database/unique-violation";

describe("isUniqueViolation", () => {
  test('retorna true para { code: "23505" }', () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  test.each<[string, unknown]>([
    ["null", null],
    ["undefined", undefined],
    ['a string "23505"', "23505"],
    ["o número 23503", 23503],
    ["objeto vazio {}", {}],
    ['{ code: "outro" }', { code: "outro" }],
  ])("retorna false para %s", (_label, error) => {
    expect(isUniqueViolation(error)).toBe(false);
  });
});
