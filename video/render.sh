#!/bin/bash
# Render banner Remotion (desktop + HP) lalu encode MP4 (H.264) + WebM (VP9) + poster.
set -e
export HOME=/home/yogik
V=/home/yogik/client-workspaces/pak-dokter/projects/elmozzanet/video
PUB=/home/yogik/client-workspaces/pak-dokter/projects/elmozzanet/public/video
C=/home/yogik/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
F=/home/yogik/.hermes/tools/ffmpeg-9.0.1-linux-x64/bin/ffmpeg
mkdir -p "$PUB" "$V/out"
cd "$V"
for id in BannerKlinik BannerKlinikHP; do
  npx remotion render src/index.jsx $id out/$id.mp4 --browser-executable=$C --log=error --concurrency=4
done
# desktop 1280x400
$F -y -loglevel error -i out/BannerKlinik.mp4 -vf "scale=in_range=full:out_range=limited,format=yuv420p" -color_range tv -c:v libx264 -crf 24 -preset slow -movflags +faststart -an "$PUB/banner-klinik.mp4"
$F -y -loglevel error -i out/BannerKlinik.mp4 -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 -an "$PUB/banner-klinik.webm"
$F -y -loglevel error -ss 5 -i out/BannerKlinik.mp4 -frames:v 1 -q:v 3 "$PUB/banner-klinik-poster.jpg"
# HP 720x720
$F -y -loglevel error -i out/BannerKlinikHP.mp4 -vf "scale=in_range=full:out_range=limited,format=yuv420p" -color_range tv -c:v libx264 -crf 25 -preset slow -movflags +faststart -an "$PUB/banner-klinik-hp.mp4"
$F -y -loglevel error -i out/BannerKlinikHP.mp4 -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 -an "$PUB/banner-klinik-hp.webm"
$F -y -loglevel error -ss 5 -i out/BannerKlinikHP.mp4 -frames:v 1 -q:v 3 "$PUB/banner-klinik-hp-poster.jpg"
ls -la "$PUB"
echo RENDER-SELESAI
