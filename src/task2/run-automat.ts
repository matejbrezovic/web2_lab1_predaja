import "dotenv/config";
import { getToken, issuePass } from "./automat.ts";

const authority = process.env.AUTH0_AUTHORITY!;
const audience = process.env.AUTH0_AUDIENCE!;
const clientId = process.env.AUTOMAT_CLIENT_ID!;
const clientSecret = process.env.AUTOMAT_CLIENT_SECRET!;
const url = process.argv[2] ?? "http://localhost:4080/passes";

const token = await getToken(authority, audience, clientId, clientSecret, "create:passes read:passes");
console.log("Token:", token);

await issuePass(url, token, "Pero Perić", "HR-123456789");
console.log("Pass issued, PNG saved in the current directory");
