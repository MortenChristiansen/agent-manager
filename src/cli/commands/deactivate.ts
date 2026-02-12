export async function deactivate(serverUrl: string, name: string) {
  try {
    const res = await fetch(`${serverUrl}/api/projects/${name}/deactivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error(`Error: ${data.error}`);
      process.exit(1);
    }

    console.log(`Deactivated ${name}`);
  } catch {
    console.error("Cannot connect to server. Is it running?");
    process.exit(1);
  }
}
