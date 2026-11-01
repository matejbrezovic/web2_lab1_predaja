import "dotenv/config";
import express from "express";
import path from "path";
import QRCode from "qrcode";
import oidc from "express-openid-connect";
import { auth as jwtAuth, requiredScopes } from "express-oauth2-jwt-bearer";
import { cancelPass, countPasses, createPass, deletePass, getPass, listPasses } from "./db.ts";

const { auth: oidcAuth, requiresAuth } = oidc;

const app = express();
app.set("views", path.join(import.meta.dirname, "views"));
app.set("view engine", "pug");

const port = Number(process.env.PORT ?? 4080);
const baseUrl = process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${port}`;

const checkJwt = jwtAuth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_AUTHORITY,
});

app.use(oidcAuth({
    authRequired: false,
    idpLogout: true,
    secret: process.env.SESSION_SECRET,
    baseURL: baseUrl,
    clientID: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    issuerBaseURL: process.env.AUTH0_AUTHORITY,
    routes: {
        logout: false as const,
    },
    authorizationParams: {
        response_type: "code",
    },
}));

function formatDate(date: Date): string {
    return date.toLocaleString("hr-HR", { timeZone: "Europe/Zagreb" });
}

app.post("/logout", (req, res) => res.oidc.logout());

app.get("/", async function (req, res) {
    const {total, active} = await countPasses();
    if (!req.oidc.isAuthenticated()) {
        res.render("index", {total, active});
        return;
    }
    const username = req.oidc.user?.name ?? req.oidc.user?.sub;
    const passes = (await listPasses()).map(pass => ({ ...pass, issuedAt: formatDate(pass.issuedAt) }));
    res.render("index", {total, active, username, passes});
});

app.get("/info/:id", async function (req, res) {
    const pass = await getPass(req.params.id as string);
    if (!pass) {
        res.status(404).send("Pass not found");
        return;
    }
    res.render("info", { pass, issuedAt: formatDate(pass.issuedAt) });
});

app.post("/manage/:id/cancel", requiresAuth(), async function (req, res) {
    const found = await cancelPass(req.params.id as string);
    if (!found) {
        res.status(404).send("Pass not found");
        return;
    }
    res.redirect("/");
});

app.post("/manage/:id/delete", requiresAuth(), async function (req, res) {
    const found = await deletePass(req.params.id as string);
    if (!found) {
        res.status(404).send("Pass not found");
        return;
    }
    res.redirect("/");
});

app.get("/passes/:id", checkJwt, requiredScopes("read:passes"), async function (req, res) {
    const pass = await getPass(req.params.id as string);
    if (!pass) {
        res.status(404).send("Pass not found");
        return;
    }
    res.json(pass);
});

app.post("/passes", checkJwt, requiredScopes("create:passes"), express.json(), async function (req, res) {
    const name = req.body?.name;
    const document = req.body?.document;
    if (typeof name !== "string" || !name.trim() || typeof document !== "string" || !document.trim()) {
        res.status(400).send("name and document are required");
        return;
    }

    const id = await createPass(name, document);
    const qrCode = await QRCode.toBuffer(`${baseUrl}/info/${id}`);
    res.status(201).location(`${baseUrl}/passes/${id}`).type("image/png").send(qrCode);
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${port}/`);
});
