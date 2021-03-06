const express = require("express");
const passport = require("passport");
const router = express.Router();

// Filename : user.js
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
/**
 * @method - POST
 * @param - /auth/signup
 * @description - User SignUp
 */
router.post(
	"/signup",
	[
		check("username", "Please Enter a Valid Username")
			.not()
			.isEmpty()
			.toLowerCase(),
		check("email", "Please enter a valid email").isEmail().toLowerCase(),
		check("password", "Please enter a valid password").isLength({
			min: 8
		})
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({
				errors: errors.array()
			});
		}
		const { username, email, password } = req.body;
		try {
			let user = await User.findOne({
				email
			});
			if (user) {
				return res.status(400).json({
					msg: "User Already Exists"
				});
			}
			const newUser = new User({
				username,
				email,
				password
			});
			const salt = await bcrypt.genSalt(10);
			newUser.password = await bcrypt.hash(password, salt);
			await newUser.save();
			const payload = {
				user: {
					id: newUser._id,
					username
				}
			};
			jwt.sign(
				payload,
				process.env.JWT_SECRET_KEY,
				{
					expiresIn: 10000
				},
				(err, token) => {
					if (err) throw err;
					res.cookie("token", token, {
						// secure: true,
						expiresIn: new Date(Date.now() + 10000),
						httpOnly: true
					});
					res.status(200).json({
						msg: "JWT success"
					});
				}
			);
		} catch (err) {
			console.log(err.message);
			res.status(500).send("Error in Saving");
		}
	}
);

/**
 * @route   POST /auth/login
 * @desc    Login user
 * @access  Public
 */

router.post(
	"/login",
	[
		check("username", "Please Enter a Valid Username")
			.not()
			.isEmpty()
			.toLowerCase(),
		check("password", "Please enter a valid password").isLength({
			min: 8
		})
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({
				errors: errors.array()
			});
		}
		const { username, password } = req.body;

		try {
			let user = await User.findOne({
				username
			});
			if (!user) {
				return res.status(404).json({
					msg: "User does not exist"
				});
			}

			const isMatch = await bcrypt.compare(password, user.password);
			if (!isMatch) {
				return res.status(401).json({
					msg: "Invalid credentials"
				});
			}

			const payload = {
				user: {
					id: user._id,
					username
				}
			};
			jwt.sign(
				payload,
				process.env.JWT_SECRET_KEY,
				{
					expiresIn: 10000
				},
				(err, token) => {
					if (err) throw err;
					res.cookie("token", token, {
						// secure: true,
						expiresIn: new Date(Date.now() + 10000),
						httpOnly: true
					});
					res.status(200).json({
						msg: "JWT success"
					});
				}
			);
		} catch (err) {
			console.log(err.message);
			res.status(500).send("Error in Saving");
		}
	}
);

// GOOGLE Authentication
// @desc	Authenticate user
// @route	/auth/google
router.get(
	"/google",
	passport.authenticate("google", {
		scope: ["profile", "email"]
	})
);

// @desc	Redirect to dashboard if Auth was successful
// @route	/auth/google/callback
router.get(
	"/google/callback",
	passport.authenticate("google", { failureRedirect: "/login" }),
	(req, res) => {
		// Successful authentication, redirect home.
		res.redirect("http://localhost:3000/dashboard");
	}
);

// @desc	Logout user
// @route	/auth/logout
router.get("/logout", (req, res) => {
	req.logout();
	res.redirect("http://localhost:3000/");
});

module.exports = router;
