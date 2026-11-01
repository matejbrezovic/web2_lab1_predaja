import { writeFile } from "node:fs/promises";


export async function getToken(
    authority: string,
    audience: string,
    clientId: string,
    clientSecret: string,
    scope: string
): Promise<string> {
    const response = await fetch(`${authority}/oauth/token`, {
        method: "POST",
        body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: clientId,
            client_secret: clientSecret,
            audience: audience,
            scope: scope,
        })
    });

    if (!response.ok) {
        throw new Error(`Status ${response.status}: Token request failed.`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
}

export async function issuePass(
    url: string,
    token: string,
    name: string,
    document: string
): Promise<void> {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({name, document }),
    });

    if (!response.ok) {
        throw new Error(`Status ${response.status}: Issuing pass failed.`);
    }

    const location = response.headers.get("Location");
    const id = location?.split("/").pop();
    if (!id) {
        throw new Error(`Status ${response.status}: Response has no pass id in Location header.`);
    }

    const image = Buffer.from(await response.arrayBuffer());
    await writeFile(`${id}.png`, image);
}
