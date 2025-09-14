"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimeResult {
  id: string;
  title: string;
  type?: string;
  image?: string;
  year?: number;
  score?: number;
  status?: string;
  episodes?: number;
}

export default function TestAnimePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [episodeData, setEpisodeData] = useState<Record<string, unknown> | null>(null);

  const searchAnime = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search-anime?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      console.log("Search response:", data);
      setResults(data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEpisodes = async (animeId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/get-episode?id=${encodeURIComponent(animeId)}`);
      const data = await response.json();
      console.log("Episodes response:", data);
      setEpisodeData(data);
    } catch (error) {
      console.error("Get episodes failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSources = async (episodeId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/get-sources?id=${encodeURIComponent(episodeId)}`);
      const data = await response.json();
      console.log("Sources response:", data);
      setEpisodeData(data);
    } catch (error) {
      console.error("Get sources failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Anime API Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search for anime..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchAnime()}
            />
            <Button onClick={searchAnime} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="grid gap-4">
              <h3 className="font-semibold">Search Results:</h3>
              {results.map((anime: AnimeResult, index: number) => (
                <div key={index} className="border p-4 rounded">
                  <h3 className="font-bold">{anime.title}</h3>
                  <p>Type: <span className="font-semibold text-blue-600">{anime.type}</span></p>
                  <p>Year: {anime.year}</p>
                  <p>Score: {anime.score}</p>
                  <p>Episodes: {anime.episodes || 'N/A'}</p>
                  <p>Status: {anime.status}</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={() => getEpisodes(anime.id)}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      Get Episodes
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => getSources(anime.id)}
                    >
                      Get Sources
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {episodeData && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Episode Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(episodeData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
