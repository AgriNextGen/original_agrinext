import cors from "cors";
import express from "express";
import { mvpContracts } from "./contracts.js";

const app = express();
const port = Number(process.env.API_PORT || 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api-contract-gateway", version: "0.1.0" });
});

app.post("/auth/send-otp", (req, res) => {
  const phone = req.body?.phone || null;
  res.json({
    status: "otp_sent",
    channel: "sms",
    phone,
    expires_in_seconds: 300
  });
});

app.post("/auth/verify-otp", (req, res) => {
  const { phone } = req.body ?? {};
  res.json({
    access_token: "mock_access_token",
    refresh_token: "mock_refresh_token",
    expires_in_seconds: 3600,
    user: { id: "00000000-0000-0000-0000-000000000001", phone, role: "farmer" }
  });
});

app.get("/auth/me", (_req, res) => {
  res.json({
    id: "00000000-0000-0000-0000-000000000001",
    full_name: "MVP User",
    role: "farmer",
    language: "en"
  });
});

for (const contract of mvpContracts) {
  if (contract.path.startsWith("/auth/")) {
    continue;
  }

  const expressPath = contract.path.replaceAll("{", ":").replaceAll("}", "");
  const method = contract.method.toLowerCase();

  app[method](expressPath, (req, res) => {
    res.status(501).json({
      error: "NOT_IMPLEMENTED",
      contract: {
        method: contract.method,
        path: contract.path,
        owner: contract.owner
      },
      received: {
        params: req.params,
        query: req.query,
        body: req.body
      }
    });
  });
}

app.listen(port, () => {
  console.log(`MVP API contract server listening on http://localhost:${port}`);
});
