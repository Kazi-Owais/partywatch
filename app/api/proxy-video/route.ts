import { NextRequest } from "next/server";

// Enable edge runtime for better performance
// export const runtime = 'edge';

export const dynamic = 'force-dynamic';

// Simple in-memory cache to avoid revalidating the same URL multiple times
const urlCache = new Map<string, { lastChecked: number; isValid: boolean }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isUrlValid(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  console.log('=== New Video Proxy Request ===');
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  try {
    const videoUrl = req.nextUrl.searchParams.get("url");
    console.log('Requested video URL:', videoUrl);
    
    if (!videoUrl) {
      console.error('Error: Missing video URL');
      return new Response(JSON.stringify({ 
        error: 'Missing video URL',
        details: 'No URL provided in the request parameters.'
      }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Validate URL format
    if (!isUrlValid(videoUrl)) {
      console.error('Error: Invalid URL format', { videoUrl });
      return new Response(JSON.stringify({ 
        error: 'Invalid URL format',
        details: 'The provided URL is not valid.'
      }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Check cache first
    const now = Date.now();
    const cacheKey = videoUrl;
    const cached = urlCache.get(cacheKey);
    
    if (cached && (now - cached.lastChecked < CACHE_TTL)) {
      console.log('Using cached URL validation result:', cached);
      if (!cached.isValid) {
        throw new Error('Cached URL validation failed');
      }
    } else {
      // Validate the URL by making a HEAD request first
      try {
        console.log('Validating URL with HEAD request...');
        const headResponse = await fetch(videoUrl, { 
          method: 'HEAD',
          headers: {
            'Referer': new URL(videoUrl).origin,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          },
        });
        
        console.log('HEAD response status:', headResponse.status);
        console.log('HEAD response headers:', Object.fromEntries(headResponse.headers.entries()));
        
        if (!headResponse.ok) {
          throw new Error(`HEAD request failed: ${headResponse.status} ${headResponse.statusText}`);
        }
        
        const contentType = headResponse.headers.get('content-type') || '';
        console.log('Content-Type from HEAD:', contentType);
        
        if (!contentType.startsWith('video/') && !contentType.includes('octet-stream')) {
          throw new Error(`Unsupported content type: ${contentType}`);
        }
        
        // Cache the successful validation
        urlCache.set(cacheKey, { lastChecked: now, isValid: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during URL validation';
        console.error('URL validation failed:', error);
        urlCache.set(cacheKey, { lastChecked: now, isValid: false });
        throw new Error(`URL validation failed: ${errorMessage}`);
      }
    }
    
    // Make the actual GET request for the video
    console.log('Fetching video content...');
    const response = await fetch(videoUrl, {
      headers: {
        'Referer': new URL(videoUrl).origin,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Range': req.headers.get('range') || 'bytes=0-',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error('Failed to fetch video:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText.substring(0, 500) // Log first 500 chars of error response
      });
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
    }

    // Get the content type from the response
    let contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length');
    const acceptRanges = response.headers.get('accept-ranges') || 'bytes';
    const contentRange = response.headers.get('content-range');
    
    console.log('Response details:', {
      contentType,
      contentLength,
      acceptRanges,
      contentRange,
      hasBody: !!response.body
    });
    
    // If content-type is not set, try to determine it from the URL
    if (!contentType || contentType === 'application/octet-stream') {
      if (videoUrl.endsWith('.mp4')) contentType = 'video/mp4';
      else if (videoUrl.endsWith('.webm')) contentType = 'video/webm';
      else if (videoUrl.endsWith('.ogg') || videoUrl.endsWith('.ogv')) contentType = 'video/ogg';
      else contentType = 'video/mp4'; // Default fallback
      
      console.log('Inferred content type:', contentType);
    }
    
    // If it's not a video type, it might be an error message
    if (!contentType.startsWith('video/') && !contentType.includes('octet-stream')) {
      const text = await response.text().catch(() => 'Could not read response body');
      console.error('Unexpected content type:', { 
        contentType, 
        contentLength,
        firstChars: text.substring(0, 200),
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`URL does not point to a valid video file. Content-Type: ${contentType}`);
    }

    // Create response headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range');
    headers.set('Accept-Ranges', acceptRanges);
    
    // Only set Content-Length if it's known and we're not handling a range request
    if (contentLength && !contentRange) {
      headers.set('Content-Length', contentLength);
    }
    
    // Forward content-range if present (for byte-range requests)
    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }
    
    // Log the response details
    const responseTime = Date.now() - startTime;
    console.log('Sending video response:', {
      status: response.status,
      headers: Object.fromEntries(headers.entries()),
      responseTime: `${responseTime}ms`
    });
    
    // Create a new response with the video stream
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    const errorTime = Date.now() - startTime;
    const errorObj = error as Error & { status?: number };
    const errorDetails = {
      name: errorObj.name || 'Error',
      message: errorObj.message || 'An unknown error occurred',
      stack: errorObj.stack,
      responseTime: `${errorTime}ms`,
      timestamp: new Date().toISOString()
    };
    
    console.error('Error in proxy-video:', errorDetails);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch video',
        message: errorObj.message,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      }),
      {
        status: errorObj.status || 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Error': 'true',
        },
      }
    );
  }
}
