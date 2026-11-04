import { isForeignKeyViolation } from "../../src/database/foreign-key-violation";

describe("isForeignKeyViolation", () => {
  test('retorna true para { code: "23503" }', () => {
    expect(isForeignKeyViolation({ code: "23503" })).toBe(true);
  });

  test.each<[string, unknown]>([
    ["null", null],
    ["undefined", undefined],
    ['a string "23505"', "23505"],
    ["o número 23503", 23503],
    ["objeto vazio {}", {}],
    ['{ code: "outro" }', { code: "outro" }],
  ])("retorna false para %s", (_label, error) => {
    expect(isForeignKeyViolation(error)).toBe(false);
  });
});
