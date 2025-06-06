# TubeVault Backend

This is the backend API for TubeVault, a YouTube video and audio downloader. It provides endpoints to fetch YouTube video metadata and download video/audio streams using `@distube/ytdl-core` and the official YouTube Data API v3.

## Features
- Fetch YouTube video metadata (title, description, thumbnail, etc.)
- List available video and audio formats
- Download video or audio by itag

## Endpoints

### `GET /api/video-info?url=YOUTUBE_URL`
Fetches metadata and available formats for a YouTube video.

**Query Parameters:**
- `url` (required): The YouTube video URL or ID

**Response:**
```json
{
  "videoId": "...",
  "title": "...",
  "description": "...",
  "thumbnail": "...",
  "uploader": "...",
  "duration": 123,
  "viewCount": 12345,
  "likeCount": 678,
  "uploadDate": "...",
  "channelId": "...",
  "tags": ["..."],
  "liveBroadcastContent": "...",
  "ytdlFormats": {
    "video": [ ... ],
    "audioOnly": [ ... ]
  }
}
```

### `GET /api/download?videoId=ID&itag=ITAG&filename=NAME`
Streams the selected video or audio format for download.

**Query Parameters:**
- `videoId` or `url` (required): The YouTube video ID or URL
- `itag` (required): The format itag to download
- `filename` (required): The filename for the download

## Local Development

1. **Install dependencies:**
   ```sh
   cd backend
   npm install
   ```
2. **Set up environment variables:**
   - Copy `.env` and set your YouTube Data API v3 key:
     ```
     YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY_HERE
     ```
3. **Start the server:**
   ```sh
   npm start
   ```
   The backend will run on `http://localhost:3000` by default.

## Deployment

You can deploy this backend to platforms like [Cyclic](https://cyclic.sh/), [Railway](https://railway.app/), or [Render](https://render.com/). Make sure to set the `YOUTUBE_API_KEY` environment variable in your deployment settings.

## Notes
- This backend is intended for educational and personal use only.
- Downloading YouTube content may violate YouTube's Terms of Service. Use responsibly.

---

**Author:** Dennis Rudiger
