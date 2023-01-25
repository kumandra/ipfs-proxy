import { ethers } from "ethers";
import * as jwt from "jsonwebtoken";
import _ from "lodash";

export default async function auth(req, res, next) {
	const authorization = _.get(req, ["headers", "authorization"], null);

	if (!authorization) {
		return res.status(401).json({
			status: "Error",
			message: "Unauthorized",
		});
	}

	const splited = authorization.split(" ");
	console.log(splited.length);
	if (splited.length !== 2) {
		return res.status(401).json({
			status: "Error",
			message: "Unauthorized. Invalid token type.",
		});
	}

	const [type, token] = splited;

	if (type === "Bearer") {
		const secret = _.get(process, ["env", "JWT_SECRET"], null);

		if (!secret) {
			return res.status(500).json({
				status: "Error",
				message: "Internal error. Missing JWT_SECRET from env",
			});
		}

		const isValid = jwt.verify(token, secret);

		if (!isValid) {
			return res.status(401).json({
				status: "Error",
				message: "Unauthorized. Invalid jwt token.",
			});
		}

		_.set(req, ["headers", "decoded"], isValid);
		return next();
	}

	if (type === "Web3") {
		const publicKey = _.get(req, ["headers", "publickey"], null);

		if (!publicKey) {
			return res.status(401).json({
				status: "Error",
				message: "Unauthorized. Missing publicKey.",
			});
		}

		const isValidAddress = ethers.utils.isAddress(publicKey);

		if (!isValidAddress) {
			return res.status(401).json({
				status: "Error",
				message: "Unauthorized. Invalid publicKey.",
			});
		}

		const signatureOwner = ethers.utils.verifyMessage(token);
		const claimOwner = ethers.utils.getAddress(publicKey);

		if (signatureOwner !== claimOwner) {
			return res.status(401).json({
				status: "Error",
				message: "Unauthorized. Invalid signature.",
			});
		}

		return next();
	}

	return res.status(401).json({
		status: "Error",
		message: "Unauthorized. Invalid token type.",
	});
}
