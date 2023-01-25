import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import auth from "./middlewares/auth.js";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();
const app = express();

const corsConfig = cors({ origin: "*" });
app.use(corsConfig);

const gateway = process.env.IPFS_LOCAL_GATEWAY || "http://127.0.0.1:8080";
const api = process.env.IPFS_ENDPOINT || "http://127.0.0.1:5001";

app.use(
	"/ipfs/*",
	auth,
	createProxyMiddleware({
		target: gateway,
		changeOrigin: true,
	}),
);

app.use(
	"/api/*",
	auth,
	createProxyMiddleware({
		target: api,
		changeOrigin: true,
	}),
);

app.listen(3000, "0.0.0.0", () => {
	console.log("Server is running on port 3000");
});
