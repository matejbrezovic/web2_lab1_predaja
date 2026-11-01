import express from "express";
import { getToken, issuePass } from "./automat.ts";
import QRCode from "qrcode";

const app = express();
app.use(express.urlencoded());
app.use(express.json());
const png = await QRCode.toBuffer("https://example.com/info/f81d4fae-7dec-11d0-a765-00a0c91e6bf6");

app.post("/oauth/token", (req, res) => {
    if (req.body.client_secret !== "tajna") {
        res.status(401).send();
        return;
    }
    res.json({ access_token: "lazni-token" });
});

app.post("/passes", (req, res) => {
    if (req.headers.authorization !== "Bearer lazni-token") {
        res.status(401).send();
        return;
    }
    if (!req.body.name || !req.body.document) {
        res.status(400).send();
        return;
    }
    const id = "f81d4fae-7dec-11d0-a765-00a0c91e6bf6";
    res.status(201).location(`http://localhost:4000/passes/${id}`).type("image/png").send(png);
});

const server = app.listen(4000, async () => {
    const base = "http://localhost:4000";
    const token = await getToken(base, "WEB2", "id", "tajna", "create:passes");
    console.log("token:", token);
    await issuePass(`${base}/passes`, token, "Pero Perić", "HR-123456789");
    console.log("PNG snimljen");

    await getToken(base, "WEB2", "id", "kriva", "create:passes").catch((e) => console.log(e.message));
    await issuePass(`${base}/passes`, "kriv", "Pero", "HR-1").catch((e) => console.log(e.message));
    await issuePass(`${base}/passes`, token, "", "HR-1").catch((e) => console.log(e.message));
    server.close();
});
