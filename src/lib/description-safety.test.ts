import { describe, expect, it } from "vitest";
import { scanDescription } from "./description-safety";

describe("description crisis scan", () => {
  it.each(["I can't breathe", "There is bone showing", "It won't stop bleeding", "They passed out", "I have chest pain"])(
    "sends the emergency phrase %s to emergency guidance",
    (text) => expect(scanDescription(text)).toBe("emergency"),
  );

  it("shows the 988 lifeline for self-harm language", () => {
    expect(scanDescription("I want to hurt myself")).toBe("self_harm");
    expect(scanDescription("No quiero vivir")).toBe("self_harm");
  });

  it("does not flag an ordinary description", () => {
    expect(scanDescription("I scraped my knee yesterday and it stings.")).toBeNull();
  });
});
