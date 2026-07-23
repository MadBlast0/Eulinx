import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    // The default workspace renders "Main Graph" in both the sidebar and canvas overview
    const matches = screen.getAllByText("Main Graph");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
