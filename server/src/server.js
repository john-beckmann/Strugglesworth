import express from "express";
import session from "express-session";
import crypto from "crypto";
import dotenv from "dotenv";
import axios from "axios";
import querystring from "querystring";
import cors from "cors";

dotenv.config();

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
const hostname = process.env.HOSTNAME;
const port = process.env.PORT;

const app = express();

app.use(express.json())
    .use(
        cors({
            origin: process.env.ALLOWED_ORIGIN,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            credentials: true,
            allowedHeaders: ["Content-Type", "Authorization"],
            optionsSuccessStatus: 200,
        })
    )
    .use(
        session({
            secret: "your_secret_key",
            resave: false,
            saveUninitialized: true,
            cookie: { secure: false },
        })
    );

const generateRandomString = (length) => {
    return crypto.randomBytes(60).toString("hex").slice(0, length);
};

app.get("/", (req, res) => res.send("Hello world!"));

app.get("/login", async (req, res) => {
    const state = generateRandomString(16);
    req.session.spotifyAuthState = state;

    const scope = ["user-read-private", "user-read-email"];

    res.redirect(
        "https://accounts.spotify.com/authorize?" +
            querystring.stringify({
                response_type: "code",
                client_id: client_id,
                scope: scope.join(" "),
                redirect_uri: redirect_uri,
                state: state,
            })
    );
});

app.post("/callback", async (req, res) => {
    try {
        const { code, state } = req.body;
        const storedState = req.session.spotifyAuthState || null;

        if (state === null || state !== storedState) {
            res.redirect(
                "/#" +
                    querystring.stringify({
                        error: "state_mismatch",
                    })
            );
        } else {
            const authOptions = {
                url: "https://accounts.spotify.com/api/token",
                method: "post",
                data: new URLSearchParams({
                    code: code,
                    redirect_uri: redirect_uri,
                    grant_type: "authorization_code",
                }),
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    Authorization:
                        "Basic " +
                        Buffer.from(client_id + ":" + client_secret).toString(
                            "base64"
                        ),
                },
            };

            const response = await axios(authOptions);

            if (response.status === 200) {
                const { access_token, refresh_token } = response.data;

                req.session.access_token = access_token;
                req.session.refresh_token = refresh_token;

                // const userResponse = await axios({
                //     url: "https://api.spotify.com/v1/me",
                //     method: "get",
                //     headers: { Authorization: "Bearer " + access_token },
                // });

                res.json({ access_token, refresh_token });
            } else {
                res.status(500).json({ error: "invalid_token" });
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/refresh_token", async (req, res) => {
    const refresh_token = req.query.refresh_token;
    const authOptions = {
        url: "https://accounts.spotify.com/api/token",
        method: "post",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            Authorization:
                "Basic " +
                Buffer.from(client_id + ":" + client_secret).toString("base64"),
        },
        data: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refresh_token,
        }),
    };

    try {
        const response = await axios(authOptions);
        if (response.status === 200) {
            const { access_token, refresh_token } = response.data;
            res.json({ access_token, refresh_token });
        }
    } catch (error) {
        res.status(400).json({ error: "Error refreshing token" });
    }
});

app.get("/my-songs", async (req, res) => {
    const access_token = req.session.access_token;

    if (!access_token) {
        return res.status(401).send("User not authenticated");
    }

    axios
        .get("https://api.spotify.com/v1/me/tracks", {
            headers: { Authorization: `Bearer ${access_token}` },
        })
        .then((response) => {
            res.json(response.data); // Send the user's saved tracks
        })
        .catch((error) => {
            if (error.response.status === 401) {
                // Handle token expiration by refreshing the token
                auth.refreshAccessToken(refresh_token)
                    .then((response) => {
                        access_token = response.data.access_token;
                        // Retry fetching saved tracks after refreshing the token
                        return axios.get(
                            "https://api.spotify.com/v1/me/tracks",
                            {
                                headers: {
                                    Authorization: `Bearer ${access_token}`,
                                },
                            }
                        );
                    })
                    .then((response) => res.json(response.data))
                    .catch((err) =>
                        res
                            .status(500)
                            .send(`Error fetching songs: ${err.message}`)
                    );
            } else {
                res.status(500).send(`Error fetching songs: ${error.message}`);
            }
        });
});

app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
