const jwt = require("jsonwebtoken");
const users = require("./userlist.json");

const jwtKey = "to-do-notes-storage-key"
const jwtExpirySeconds = 60 * 60;

// Debug function to manually verify the token you provided
const getUserData = (req, res) => {
	const { token } = req.body;

	try {
		const decoded = jwt.verify(token, jwtKey);
		res.send({ data: decoded })
	} catch (error) {
		console.error('Debug: Token verification failed:', error.message);
	}
}

const signIn = (req, res, userlist) => {
	// Get credentials from JSON body
	const { email, password } = req.body;
	let userListData = [...users];
	if (typeof userlist === 'object') {
		userListData = [...userlist];
	}
	const user = userListData.find(item => item.email === email);

	if (!email || !password || user.email !== email || user.password !== password) {
		// return 401 error is username or password doesn't exist, or if password does
		// not match the password in our records
		return res.status(401).send({ message: "Unauthorised Login!" }).end()
	}

	const token = jwt.sign(
		{ email },
		jwtKey,
		{
			algorithm: 'HS256',
			expiresIn: jwtExpirySeconds,
		}
	);


	// set the cookie as the token string, with a similar max age as the token
	// here, the max age is in milliseconds, so we multiply by 1000
	res.cookie("token", token, { maxAge: jwtExpirySeconds * 1000 });

	res.send({ token, user });
	res.end();
}

const welcome = (req, res) => {
	const token = req.body.token;

	// if the cookie is not set, return an unauthorized error
	if (!token) {
		return res.status(401).end()
	}

	let payload = null;
	try {
		payload = jwt.verify(token, jwtKey)
	} catch (e) {
		if (e instanceof jwt.JsonWebTokenError) {
			// if the error thrown is because the JWT is unauthorized, return a 401 error
			return res.status(401).end()
		}
		// otherwise, return a bad request error
		return res.status(400).end()
	}

	// Finally, return the welcome message to the user, along with their
	// username given in the token
	const loggedInUser = users.find(item => item.email === payload.email)?.username
	console.log("--loggedin user--", loggedInUser);
	res.send({ "message": `Welcome ${loggedInUser}!` });
}

const refresh = (req, res) => {
	// (BEGIN) The code uptil this point is the same as the first part of the `welcome` route
	const token = req.cookies.token
	console.log("refresh token: ", token);

	if (!token) {
		return res.status(401).end()
	}

	let payload = null;
	try {
		payload = jwt.verify(token, jwtKey)
	} catch (e) {
		if (e instanceof jwt.JsonWebTokenError) {
			return res.status(401).end()
		}
		return res.status(400).end()
	}
	// (END) The code uptil this point is the same as the first part of the `welcome` route

	// We ensure that a new token is not issued until enough time has elapsed
	// In this case, a new token will only be issued if the old token is within
	// 30 seconds of expiry. Otherwise, return a bad request status
	const nowUnixSeconds = Math.round(Number(new Date()) / 1000)
	if (payload.exp - nowUnixSeconds > 30) {
		return res.status(400).end()
	}

	// Now, create a new token for the current user, with a renewed expiration time
	const newToken = jwt.sign({ username: payload.username }, jwtKey, {
		algorithm: "HS256",
		expiresIn: jwtExpirySeconds,
	})

	// Set the new token as the users `token` cookie
	res.cookie("token", newToken, { maxAge: jwtExpirySeconds * 1000 })
	res.end()
}

const logout = (req, res) => {
	res.cookie('token', '', { maxAge: 0 })
	res.end()
};

module.exports = {
	signIn,
	welcome,
	refresh,
	logout,
	getUserData
};




