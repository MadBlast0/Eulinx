import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    // WorkspaceLayout shows loading state or the Dashboard content
    expect(
      screen.getByText(/Loading workspace|Dashboard/)
    ).toBeInTheDocument();
  });
});
