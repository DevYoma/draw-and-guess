import { NextRequest } from "next/server";
import { initializeSocketServer } from "@/lib/socket-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return new Response("Socket.IO server running");
}
