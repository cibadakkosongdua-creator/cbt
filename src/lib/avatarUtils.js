/**
 * Shared avatar gradient utilities — used by ProfileTab, RankingTab, StudentProfileModal, etc.
 */

export const avatarGradients = [
  "from-emerald-400 to-teal-500",
  "from-blue-400 to-cyan-500",
  "from-purple-400 to-violet-500",
  "from-indigo-400 to-blue-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-blue-500",
];

/**
 * Deterministically pick a gradient class based on a name string.
 * @param {string} name
 * @returns {string} Tailwind gradient classes e.g. "from-blue-400 to-cyan-500"
 */
export const getAvatarGrad = (name = "") => {
  const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  return avatarGradients[code % avatarGradients.length];
};

/**
 * Get initials (up to 2 chars) from a full name.
 * @param {string} name
 * @returns {string}
 */
export const getInitials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?";
