import { NextResponse } from "next/server";

const BASE_URL = "https://api.consumet.org/anime/9anime/info";

interface Episode {
  id: string;
  number: number;
  title?: string;
  url?: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing anime ID parameter" },
      { status: 400 }
    );
  }

  try {
    console.log(`Fetching episodes for anime ID: ${id}`);
    const response = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`);
    
    if (!response.ok) {
      console.error(`API responded with status: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch anime info: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.episodes || !Array.isArray(data.episodes)) {
      console.error("Unexpected API response format:", data);
      return NextResponse.json(
        { error: "Invalid response format from anime provider" },
        { status: 500 }
      );
    }

    // Transform episodes to ensure we have the expected format
    const episodes: Episode[] = data.episodes
      .map((ep: any) => ({
        id: ep.id || String(ep.number || ''),
        number: Number(ep.number) || 0,
        title: ep.title || `Episode ${ep.number || 'N/A'}`,
        url: ep.url || `#`
      }))
      .filter((ep: Episode) => ep.id && !isNaN(ep.number))
      .sort((a: Episode, b: Episode) => a.number - b.number);

    if (episodes.length === 0) {
      console.error("No valid episodes found in response");
      return NextResponse.json(
        { error: "No episodes available for this anime" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      episodes,
      title: data.title,
      totalEpisodes: data.totalEpisodes || episodes.length
    });

  } catch (error) {
    console.error("Error in get-episode:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching episodes" },
      { status: 500 }
    );
  }
}

