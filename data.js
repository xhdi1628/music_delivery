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

// Tape colour sealing each closed box. Index 0 = day 1.
const TAPE_COLORS = [
  "#E24B3C", // red
  "#EE8B2A", // orange
  "#F2C230", // yellow
  "#3FA858", // green
  "#3E8FD0", // blue
  "#3B4E8C", // indigo
  "#8E5BB5", // purple
];

