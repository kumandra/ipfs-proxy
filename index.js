import _ from "lodash";
import auth from "./middlewares/auth.js";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn } from "node:child_process";
import path from "node:path";
import { ethers } from "ethers";

dotenv.config();
const app = express();

const corsConfig = cors({ origin: "*" });
app.use(corsConfig);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const gateway = process.env.IPFS_LOCAL_GATEWAY || "http://127.0.0.1:8080";
const api = process.env.IPFS_ENDPOINT || "http://127.0.0.1:5001";

function isOwnPath(address, reqPath) {
	let p = path.normalize(reqPath);
	const ownPath = path.normalize(path.join("/", address));
	if (p.startsWith(ownPath)) {
		return true;
	}
	return false;
}

function isOthersPublic(reqPath) {
	let p = path.normalize(reqPath);
	if (!p.startsWith("/")) {
		throw Error("Invalid based url1");
	}
	let frag = p.split("/");

	if (frag.length < 3) {
		throw Error("Invalid based url2");
	}
	const [root, address, pdir] = frag;

	if (root !== "") {
		throw Error("Invalid based url3");
	}

	if (!ethers.utils.isAddress(address)) {
		throw Error("Invalid web3 address");
	}

	if (pdir !== "public") {
		throw Error("Unauthorized access!");
	}
	return true;
}

function ownership(req, res, next) {
	const address = _.get(req, ["headers", "address"], null);

	if (!address) {
		res.status(401).json({
			status: "ERROR",
			message: "Unauthorized! Visitor must have a web3 address",
		});
	}

	if (!ethers.utils.isAddress(address)) {
		res.status(401).json({
			status: "ERROR",
			message: "Unauthorized! Invalid visitor web3 address",
		});
	}

	const baseUrl = req.baseUrl;

	if (baseUrl === "/api/v0/files/ls") {
		try {
			if (isOwnPath(address, req.query.arg)) {
				return next();
			}
			if (isOthersPublic(req.query.arg)) {
				return next();
			}
		} catch (error) {
			return res.status(401).json({
				status: "ERROR",
				message: error.message,
			});
		}
		return res.status(401).json({
			status: "ERROR",
			message: "Unauthorized",
		});
	} else {
		return next();
	}
}

app.use(
	"/ipfs/*",
	// auth,
	createProxyMiddleware({
		target: gateway,
		changeOrigin: true,
	}),
);

app.use(
	"/api/*",
	// auth,
	ownership,
	createProxyMiddleware({
		target: api,
		changeOrigin: true,
	}),
);

app.post("/pin", auth, async (req, res) => {
	const cids = _.get(req, ["body"], []);

	const processes = cids.map((cid) => {
		return spawn("ipfs-clster-ctl", ["pin", "add", cid]);
	});

	await Promise.all(processes);

	res.json({
		cids,
	});
});

app.post("/unpin", auth, async (req, res) => {
	const cids = _.get(req, ["body"], []);

	const processes = cids.map((cid) => {
		return spawn("ipfs-clster-ctl", ["pin", "rm", cid]);
	});

	await Promise.all(processes);

	res.json({
		cids,
	});
});

app.listen(3000, "0.0.0.0", () => {
	console.log("Server is running on port 3000");
});
