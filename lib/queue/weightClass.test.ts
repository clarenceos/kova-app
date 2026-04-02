import { describe, it, expect } from "vitest";
import { getWeightClass } from "./weightClass";

describe("getWeightClass", () => {
  // --- Female brackets ---

  it("Female 50kg -> '52kg' (below first bracket)", () => {
    expect(getWeightClass("Female", 50)).toBe("52kg");
  });

  it("Female 52kg -> '52kg' (exact boundary, inclusive)", () => {
    expect(getWeightClass("Female", 52)).toBe("52kg");
  });

  it("Female 52.1kg -> '57kg' (above 52, within 57)", () => {
    expect(getWeightClass("Female", 52.1)).toBe("57kg");
  });

  it("Female 57kg -> '57kg' (exact boundary)", () => {
    expect(getWeightClass("Female", 57)).toBe("57kg");
  });

  it("Female 61kg -> '61kg'", () => {
    expect(getWeightClass("Female", 61)).toBe("61kg");
  });

  it("Female 66kg -> '66kg'", () => {
    expect(getWeightClass("Female", 66)).toBe("66kg");
  });

  it("Female 70kg -> '70kg'", () => {
    expect(getWeightClass("Female", 70)).toBe("70kg");
  });

  it("Female 74kg -> '74kg'", () => {
    expect(getWeightClass("Female", 74)).toBe("74kg");
  });

  it("Female 80kg -> '80kg' (exact boundary of last bounded bracket)", () => {
    expect(getWeightClass("Female", 80)).toBe("80kg");
  });

  it("Female 80.1kg -> '80+kg' (above 80, super heavyweight)", () => {
    expect(getWeightClass("Female", 80.1)).toBe("80+kg");
  });

  it("Female 120kg -> '80+kg' (well above max bracket)", () => {
    expect(getWeightClass("Female", 120)).toBe("80+kg");
  });

  // --- Male brackets ---

  it("Male 60kg -> '61kg' (below first bracket)", () => {
    expect(getWeightClass("Male", 60)).toBe("61kg");
  });

  it("Male 61kg -> '61kg' (exact boundary)", () => {
    expect(getWeightClass("Male", 61)).toBe("61kg");
  });

  it("Male 61.1kg -> '66kg' (above 61, within 66)", () => {
    expect(getWeightClass("Male", 61.1)).toBe("66kg");
  });

  it("Male 66kg -> '66kg'", () => {
    expect(getWeightClass("Male", 66)).toBe("66kg");
  });

  it("Male 70kg -> '70kg'", () => {
    expect(getWeightClass("Male", 70)).toBe("70kg");
  });

  it("Male 74kg -> '74kg'", () => {
    expect(getWeightClass("Male", 74)).toBe("74kg");
  });

  it("Male 80kg -> '80kg'", () => {
    expect(getWeightClass("Male", 80)).toBe("80kg");
  });

  it("Male 89kg -> '89kg' (exact boundary)", () => {
    expect(getWeightClass("Male", 89)).toBe("89kg");
  });

  it("Male 89.1kg -> '95kg' (above 89, within 95)", () => {
    expect(getWeightClass("Male", 89.1)).toBe("95kg");
  });

  it("Male 95kg -> '95kg' (exact boundary of last bounded bracket)", () => {
    expect(getWeightClass("Male", 95)).toBe("95kg");
  });

  it("Male 95.1kg -> '95+kg' (super heavyweight)", () => {
    expect(getWeightClass("Male", 95.1)).toBe("95+kg");
  });

  it("Male 150kg -> '95+kg' (well above max bracket)", () => {
    expect(getWeightClass("Male", 150)).toBe("95+kg");
  });
});
