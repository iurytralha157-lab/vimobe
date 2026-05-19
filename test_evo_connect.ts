const API_URL = (process.env.EVOLUTION_GO_API_URL || "").replace(/\/+$/, "");
const INSTANCE_TOKEN = "default_token";

async function testConnect() {
  console.log("Testing /instance/connect with Instance Token as apikey");
  const res = await fetch(`${API_URL}/instance/connect`, {
    method: "POST",
    headers: { 
      "apikey": INSTANCE_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      webhookUrl: "https://example.com/webhook",
      subscribe: ["ALL"],
      immediate: true
    })
  });
  const data = await res.json();
  console.log(`Status: ${res.status}`, data);
}

await testConnect();
