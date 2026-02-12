export async function activate(serverUrl: string, name: string) {
  try {
    const res = await fetch(`${serverUrl}/api/projects/${name}/activate`, {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json();
      console.error(`Error: ${data.error}`);
      process.exit(1);
    }

    console.log(`Activated ${name}`);
  } catch {
    console.error("Cannot connect to server. Is it running?");
    process.exit(1);
  }
}
