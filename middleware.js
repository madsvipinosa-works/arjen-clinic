import { proxy } from "./proxy";

export async function middleware(request) {
  return proxy(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
