import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL;

export const useLLM = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSchema = async (prompt) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/generateSchema`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to generate schema");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("LLM error:", err);
      setError(err.message || "Server error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generateSchema, loading, error };
};
