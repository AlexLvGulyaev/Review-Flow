import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { CompanyAuthProvider } from "./context/CompanyAuthContext.jsx";
import { RoleProvider } from "./context/RoleContext.jsx";
import "./index.css";
import "./ops/rf-tokens.css";
import "./ops/ops.css";
import "./ops/operator/operator-console.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RoleProvider>
      <CompanyAuthProvider>
        <App />
      </CompanyAuthProvider>
    </RoleProvider>
  </StrictMode>
);
