"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function AnimeBrowser({ onSelectAnime }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);

  const searchAnime = async () => {
    const res = await fetch(`/api/search-anime?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results || []);
    setEpisodes([]);
  };

  const fetchEpisodes = async (id: string) => {
    const res = await fetch(`/api/get-episode?id=${id}`);
    const data = await res.json();
    setEpisodes(data.episodes || []);
  };

  const fetchSources = async (episodeId: string) => {
    const res = await fetch(`/api/get-sources?id=${episodeId}`);
    const data = await res.json();
    if (data.sources?.length) {
      onSelectAnime({
        videoUrl: data.sources[0].url, // MP4 or M3U8
        episodeId,
      });
    }
  };

  return (
    <div className="p-4 border rounded bg-white">
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search anime..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={searchAnime}>Search</Button>
      </div>

      {results.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Results:</h3>
          {results.map((anime) => (
            <div key={anime.id} className="mb-2 p-2 border rounded">
              <p className="font-bold">{anime.title}</p>
              <Button size="sm" onClick={() => fetchEpisodes(anime.id)}>
                Show Episodes
              </Button>
            </div>
          ))}
        </div>
      )}

      {episodes.length > 0 && (
        <div>
          <h3 className="font-semibold mt-4 mb-2">Episodes:</h3>
          <div className="grid grid-cols-3 gap-2">
            {episodes.map((ep) => (
              <Button key={ep.id} size="sm" onClick={() => fetchSources(ep.id)}>
                {ep.number}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
