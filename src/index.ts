import { Hono } from "hono";
import { serveAgentCard } from "./lib/agent-card";
import { createPaymentMiddleware } from "./lib/payments";
import { app as routes } from "./lib/routes";

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

console.log(`Starting Kirk API on port ${port}...`);

const app = new Hono();

// Agent card for A2A discovery (free, no payment gate)
app.get("/.well-known/agent.json", serveAgentCard);

// Payment middleware (returns 402 with USDC + $KIRK options for paid routes)
app.use("*", await createPaymentMiddleware());

// All route handlers
app.route("/", routes);

console.log(`Kirk API running: http://localhost:${port}`);
console.log(`  - Agent card: /.well-known/agent.json`);
console.log(`  - Payments: USDC (exact) + $KIRK (upto, 30% off)`);

export default { port, fetch: app.fetch };
