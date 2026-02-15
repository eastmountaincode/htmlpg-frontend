"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white shadow-sm rounded-lg p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">Admin Login</h1>
        <form action={formAction}>
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            autoFocus
            className="w-full border border-gray-300 rounded px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-gray-900 text-white rounded px-3 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? "Logging in..." : "Log in"}
          </button>
          {state?.error && (
            <p className="mt-3 text-sm text-red-600">{state.error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
