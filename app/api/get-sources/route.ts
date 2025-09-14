import { NextResponse } from "next/server";

const BASE_URL = "https://api.consumet.org/anime/9anime/watch";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const episodeId = searchParams.get("id");

  if (!episodeId) {
    return NextResponse.json(
      { error: "Missing episodeId parameter" },
      { status: 400 }
    );
  }

  try {
    console.log(`Fetching sources for episode: ${episodeId}`);
    const response = await fetch(`${BASE_URL}/${encodeURIComponent(episodeId)}`);
    
    if (!response.ok) {
      console.error(`API responded with status: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch sources: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.sources || !Array.isArray(data.sources)) {
      console.error("Unexpected API response format:", data);
      return NextResponse.json(
        { error: "Invalid response format from source provider" },
        { status: 500 }
      );
    }

    // Filter out invalid sources and ensure we have required fields
    const validSources = data.sources.filter((source: any) => 
      source.url && (source.url.endsWith('.m3u8') || source.url.endsWith('.mp4'))
    );

    if (validSources.length === 0) {
      console.error("No valid video sources found");
      return NextResponse.json(
        { error: "No playable sources found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      sources: validSources,
      headers: data.headers || {}
    });

  } catch (error) {
    console.error("Error in get-sources:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
