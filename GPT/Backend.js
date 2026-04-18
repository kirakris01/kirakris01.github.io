import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// ===== GOOGLE AUTH =====
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
(accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// ===== ROUTES =====
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/"
    }),
    (req, res) => {
        res.redirect("/");
    }
);

app.get("/user", (req, res) => {
    res.json(req.user || null);
});

// ===== ЧАТ С ИИ (STREAM) =====
app.post("/chat", async (req, res) => {
    if (!req.user) return res.status(401).send("Не авторизован");

    const userMessage = req.body.message;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + process.env.API_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            stream: true,
            messages: [
                { role: "system", content: "Ты ИИ GIGAKK" },
                { role: "user", content: userMessage }
            ]
        })
    });

    res.setHeader("Content-Type", "text/plain");

    response.body.on("data", chunk => {
        res.write(chunk.toString());
    });

    response.body.on("end", () => {
        res.end();
    });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));