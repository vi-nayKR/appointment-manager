import { connectDb } from './db.ts';
import { createApp } from './app.ts';

async function main() {
  const { client, db } = await connectDb();
  const app = createApp(db);
  const port = Number(process.env.PORT ?? 3000);
  const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
  const close = () => server.close(() => void client.close());
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Failed to start API');
  process.exitCode = 1;
});
