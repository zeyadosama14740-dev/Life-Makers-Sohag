import { describe, expect, it } from "vitest";
import { authDestination } from "./auth-navigation";

describe("Authentication return destinations", () => {
  it("opens the homepage after ordinary sign-in", () => {
    expect(authDestination(undefined)).toBe("/");
    expect(authDestination("")).toBe("/");
    expect(authDestination("/")).toBe("/");
  });
  it("retains a local volunteer destination", () => expect(authDestination("/volunteers")).toBe("/volunteers"));
  it("rejects external and protocol-relative URLs", () => {
    expect(authDestination("https://example.com")).toBe("/");
    expect(authDestination("//example.com")).toBe("/");
    expect(authDestination("/\\example.com")).toBe("/");
  });
  it("does not send a successful sign-in back to sign-in or recovery", () => {
    expect(authDestination("/auth?redirect=/auth")).toBe("/");
    expect(authDestination("/reset-password")).toBe("/");
  });
});