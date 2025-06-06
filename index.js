import express from "express";
import cors from "cors";
import ytdl from "@distube/ytdl-core";
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

function extractVideoId(url) {
  const regexes = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\s]+)/,
    /(?:https?:\/\/)?youtu\.be\/([^?\s]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?\s]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^?\s]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^?\s]+)/,
  ];
  for (const regex of regexes) {
    const match = url.match(regex);
    if (match && match[1]) return match[1];
  }
  return null;
}

app.get("/api/video-info", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL parameter is required" });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL or unable to extract Video ID" });

  try {
    const apiResponse = await youtube.videos.list({
      part: ["snippet", "contentDetails", "statistics"],
      id: [videoId],
    });

    if (!apiResponse.data.items || apiResponse.data.items.length === 0) {
      return res.status(404).json({ error: "Video not found or access denied by YouTube API." });
    }

    const videoData = apiResponse.data.items[0];
    const snippet = videoData.snippet;
    const contentDetails = videoData.contentDetails;
    const statistics = videoData.statistics;

    const ytdlAgent = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    };
    const ytdlInfo = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, {
      requestOptions: ytdlAgent,
      lang: "en",
    });

    const formats = ytdlInfo.formats;
    const videoFormats = formats.filter(f => f.hasVideo && f.hasAudio && f.container === "mp4");
    const audioFormats = formats.filter(f => !f.hasVideo && f.hasAudio && (f.container === "mp4" || f.container === "webm"));

    const parseDuration = (durationString) => {
      if (!durationString) return 0;
      const match = durationString.match(/PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?/);
      if (!match) return 0;
      const hours = parseInt(match[1] || "0");
      const minutes = parseInt(match[2] || "0");
      const seconds = parseInt(match[3] || "0");
      return hours * 3600 + minutes * 60 + seconds;
    };

    res.json({
      videoId,
      title: snippet?.title || "Unknown Title",
      description: snippet?.description || "",
      thumbnail: snippet?.thumbnails?.maxres?.url || snippet?.thumbnails?.high?.url || snippet?.thumbnails?.medium?.url || "",
      uploader: snippet?.channelTitle || "Unknown",
      duration: parseDuration(contentDetails?.duration),
      viewCount: parseInt(statistics?.viewCount || "0"),
      likeCount: parseInt(statistics?.likeCount || "0"),
      uploadDate: snippet?.publishedAt || "",
      channelId: snippet?.channelId,
      tags: snippet?.tags,
      liveBroadcastContent: snippet?.liveBroadcastContent,
      ytdlFormats: {
        video: videoFormats,
        audioOnly: audioFormats,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch video information.", details: err.message });
  }
});

app.get("/api/download", async (req, res) => {
  let videoUrlOrId = req.query.url || req.query.videoId;
  const itag = parseInt(req.query.itag);
  const filename = req.query.filename;

  if (!videoUrlOrId) return res.status(400).json({ error: "URL or video ID parameter is required" });
  if (!itag) return res.status(400).json({ error: "itag parameter is required" });
  if (!filename) return res.status(400).json({ error: "filename parameter is required" });

  const videoId = extractVideoId(videoUrlOrId);
  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL or Video ID provided" });

  const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    if (!ytdl.validateURL(fullUrl)) {
      return res.status(400).json({ error: "Invalid or unsupported YouTube URL according to ytdl-core" });
    }

    const info = await ytdl.getInfo(fullUrl);
    const formatInfo = info.formats.find(f => f.itag === itag);
    if (!formatInfo) {
      return res.status(404).json({ error: `Format with itag ${itag} not found for this video.` });
    }

    res.setHeader("Content-Disposition", `attachment; filename=\"${encodeURIComponent(filename)}\"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader("Content-Type", formatInfo.mimeType || "application/octet-stream");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    ytdl(fullUrl, { quality: itag }).pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Failed to download video.", details: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
