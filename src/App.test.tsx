import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    // WorkspaceLayout shows the workspace shell
    expect(screen.getByText(/WorkspaceApp|Graph|Canvas/i)).toBeInTheDocument();
  });
});
