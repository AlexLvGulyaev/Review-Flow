import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { RoleProvider } from "./context/RoleContext.jsx";
import "./index.css";
import "./ops/ops.css";
import "./ops/operator/operator-console.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RoleProvider>
      <App />
    </RoleProvider>
  </StrictMode>
);
