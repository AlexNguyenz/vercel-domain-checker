import { NextResponse } from "next/server";

// Check domain via HTTP request
async function checkViaHTTP(fullDomain: string): Promise<{
  exists: boolean;
  method: string;
  details?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(`https://${fullDomain}`, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
      // Disable cache to get fresh result
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    // Any successful response means domain is active
    if (response.ok) {
      return {
        exists: true,
        method: "HTTP",
        details: `Status: ${response.status}`,
      };
    }

    // 404 from Vercel - need to check x-vercel-error header
    if (response.status === 404) {
      const vercelError = response.headers.get("x-vercel-error");

      // DEPLOYMENT_NOT_FOUND means domain doesn't exist at all (available!)
      if (vercelError === "DEPLOYMENT_NOT_FOUND") {
        return {
          exists: false,
          method: "HTTP",
          details: "Domain not found (DEPLOYMENT_NOT_FOUND)",
        };
      }

      // Other Vercel errors mean domain exists but has issues
      const server = response.headers.get("server");
      if (server?.toLowerCase().includes("vercel")) {
        return {
          exists: true,
          method: "HTTP",
          details: `Domain exists (Error: ${vercelError || "unknown"})`,
        };
      }
    }

    // Other 4xx/5xx errors might indicate domain exists
    if (response.status >= 400) {
      return {
        exists: true,
        method: "HTTP",
        details: `Status: ${response.status}`,
      };
    }

    return { exists: false, method: "HTTP" };
  } catch (error: unknown) {
    const err = error as Error & { code?: string };

    // Network errors usually mean domain doesn't exist
    if (
      err.name === "TypeError" ||
      err.code === "ENOTFOUND" ||
      err.code === "EAI_AGAIN" ||
      err.message?.includes("fetch failed") ||
      err.message?.includes("getaddrinfo")
    ) {
      return { exists: false, method: "HTTP", details: "DNS not found" };
    }

    // Timeout - inconclusive
    if (err.name === "AbortError") {
      throw new Error("TIMEOUT");
    }

    // Other errors - inconclusive
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { subdomain } = await request.json();

    if (!subdomain) {
      return NextResponse.json(
        {
          available: false,
          message: "Please enter a domain",
        },
        { status: 400 }
      );
    }

    // Trim and lowercase (Vercel always uses lowercase for subdomains)
    const cleaned = subdomain.trim().toLowerCase();

    // Only basic validation: not empty after trim
    if (!cleaned) {
      return NextResponse.json({
        available: false,
        message: "Please enter a domain",
      });
    }

    const fullDomain = `${cleaned}.vercel.app`;

    // Check via HTTP (DNS won't work due to Vercel's wildcard DNS)
    try {
      const httpResult = await checkViaHTTP(fullDomain);

      // Simple logic: only DEPLOYMENT_NOT_FOUND means available
      // Everything else = not available
      const isAvailable = httpResult.details?.includes("DEPLOYMENT_NOT_FOUND");

      return NextResponse.json({
        available: isAvailable || false,
        message: isAvailable
          ? `${fullDomain} is available!`
          : `${fullDomain} is already taken`,
      });
    } catch {
      // If check failed, assume not available
      return NextResponse.json({
        available: false,
        message: `Unable to check ${fullDomain}. Please try again`,
      });
    }
  } catch (error) {
    console.error("Error checking domain:", error);
    return NextResponse.json(
      {
        available: false,
        message: "An error occurred. Please try again",
      },
      { status: 500 }
    );
  }
}
