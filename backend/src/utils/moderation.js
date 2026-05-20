const PROFANE_WORDS = new Set([
  "idiot",
  "stupid",
  "dumb",
  "fool",
  "shit",
  "crap",
  "bastard",
  "damn",
  "asshole",
  "bitch",
  "nonsense",
  "trash"
]);

function containsProfanity(text = "") {
  const tokens = String(text).toLowerCase().match(/\w+/g) || [];
  return tokens.some((token) => PROFANE_WORDS.has(token));
}

module.exports = { containsProfanity };
