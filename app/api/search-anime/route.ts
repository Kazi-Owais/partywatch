import { NextResponse } from "next/server";

const BASE_URL = "https://api.consumet.org/anime/9anime";

interface AnimeResult {
  id: string;
  title: string;
  type?: string;
  image?: string;
  cover?: string;
  year?: number;
  rating?: number;
  status?: string;
  episodes?: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const page = searchParams.get("page") || "1";

  if (!query) {
    return NextResponse.json(
      { error: "Missing search query parameter" },
      { status: 400 }
    );
  }

  try {
    console.log(`Searching for anime: ${query}, page: ${page}`);
    const searchUrl = new URL(`${BASE_URL}/${encodeURIComponent(query)}`);
    searchUrl.searchParams.set("page", page);

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      console.error(`API responded with status: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to search anime: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      console.error("Unexpected API response format:", data);
      return NextResponse.json(
        { error: "Invalid response format from search provider" },
        { status: 500 }
      );
    }

    // Transform and validate results
    const results: AnimeResult[] = data.results
      .map((item: any) => ({
        id: item.id,
        title: item.title?.english || item.title?.romaji || item.title?.native || "Unknown Title",
        type: item.type,
        image: item.image || item.coverImage?.large || item.coverImage?.medium,
        cover: item.cover || item.bannerImage,
        year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined,
        rating: item.rating ? Math.round(item.rating * 10) / 10 : undefined,
        status: item.status,
        episodes: item.episodes || item.totalEpisodes,
      }))
      .filter((item: AnimeResult) => item.id && item.title);

    return NextResponse.json({
      results,
      currentPage: Number(page),
      hasNextPage: data.hasNextPage || false,
      totalResults: data.total || results.length,
    });

  } catch (error) {
    console.error("Error in search-anime:", error);
    return NextResponse.json(
      { error: "Internal server error while searching for anime" },
      { status: 500 }
    );
  }
}
