import { handleStandaloneAuth } from "../../../lib/standalone-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleStandaloneAuth(request);
}

export async function POST(request: Request) {
  return handleStandaloneAuth(request);
}

