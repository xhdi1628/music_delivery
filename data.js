// Edit this file each month.
// month: "YYYY-MM" — when this changes, openedBoxes in localStorage is auto-reset.
// videoId / title / artist / image: fill in per song.
const songsData = {
  month: "2026-07",
  songs: [
    { day: 1, videoId: "snoWlI2zqgY", title: "동네", artist: "김현철", image: "public/images/day1.jpeg" },
    { day: 2, videoId: "k36cEbuLG94", title: "LaLaLa Love Song", artist: "백예린", image: "public/images/day2.jpg" },
    { day: 3, videoId: "LbtQM793jn8", title: "日常", artist: "Official髭男dism", image: "public/images/day3.jpg" },
    { day: 4, videoId: "23urWKmHS6o", title: "Love Hangover", artist: "JENNIE", image: "public/images/day4.webp" },
    { day: 5, videoId: "6bn0dlv7FxY", title: "Crazy (Re-Make)", artist: "주혜린", image: "public/images/day5.jpg" },
    { day: 6, videoId: "VcSvUiXVYIo", title: "아멜리에", artist: "Portable Groove 09", image: "public/images/day6.jpg" },
    { day: 7, videoId: "Nu7OmSqHVng", title: "Would U", artist: "Red Velvet", image: "public/images/day7.jpg" },
  ],
};

// Per-box appearance. Index 0 = day 1.
const BOX_COLORS = [
  "#E0E0E0",
  "#D0D0D0",
  "#C0C0C0",
  "#B8B8B8",
  "#A8A8A8",
  "#989898",
  "#888888",
];

const TAPE_COLORS = [
  "#E74C3C", // red
  "#E67E22", // orange
  "#F1C40F", // yellow
  "#27AE60", // green
  "#3498DB", // blue
  "#34495E", // indigo
  "#9B59B6", // purple
];
