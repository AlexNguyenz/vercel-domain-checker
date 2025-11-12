"use client";

import { useState } from "react";

export default function Home() {
  const [subdomain, setSubdomain] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    available: boolean;
    message: string;
  } | null>(null);

  const checkSubdomain = async () => {
    if (!subdomain.trim()) {
      return;
    }

    setChecking(true);
    setResult(null);

    try {
      const response = await fetch("/api/check-domain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subdomain: subdomain.trim() }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        available: false,
        message: "An error occurred while checking",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      checkSubdomain();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black p-4">
      <main className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Vercel Domain Checker
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Check if a .vercel.app domain is available
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="your-project"
                className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                disabled={checking}
              />
              <span className="flex items-center text-zinc-600 dark:text-zinc-400 font-medium">
                .vercel.app
              </span>
            </div>

            <button
              onClick={checkSubdomain}
              disabled={checking || !subdomain.trim()}
              className="w-full py-3 px-6 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {checking ? "Checking..." : "Check"}
            </button>

            {result && (
              <div
                className={`p-4 rounded-lg ${
                  result.available
                    ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
                }`}
              >
                <p
                  className={`text-center font-medium ${
                    result.available
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {result.message}
                </p>
              </div>
            )}
          </div>

          <div className="text-xs text-center text-zinc-500 dark:text-zinc-500">
            Press Enter or click the button to check
          </div>
        </div>
      </main>
    </div>
  );
}
