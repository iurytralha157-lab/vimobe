const API_URL = (process.env.EVOLUTION_GO_API_URL || "").replace(/\/+$/, "");
const INSTANCE_TOKEN = "default_token";

async function testQR() {
  console.log("Testing /instance/qr with Instance Token as apikey");
  const res = await fetch(`${API_URL}/instance/qr`, {
    headers: { "apikey": INSTANCE_TOKEN }
  });
  const data = await res.json();
  console.log(`Status: ${res.status}`, data);
}

await testQR();
