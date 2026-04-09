const isValidLabels = (labels) => Array.isArray(labels);

const filterByConfidence = (labels, minConfidence) => {
  return labels.filter(l => l.confidence >= minConfidence);
};

const sortByRelevance = (labels) => {
  return labels.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return b.name.length - a.name.length;
  });
};

const extractNames = (labels) => {
  return labels.map(l => l.name);
};

const dedupeLabels = (names) => {
  const unique = [];
  const seen = new Set();

  for (const name of names) {
    const lower = name.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(name);
    }
  }

  return unique;
};

const limitLabels = (labels, maxLabels) => {
  return labels.slice(0, maxLabels);
};

exports.filterLabels = (labels, options = {}) => {
  const {
    minConfidence = 90,
    maxLabels = 10,
  } = options;

  if (!isValidLabels(labels)) return [];

  const confident = filterByConfidence(labels, minConfidence);
  const sorted = sortByRelevance(confident);
  const names = extractNames(sorted);
  const unique = dedupeLabels(names);
  const limited = limitLabels(unique, maxLabels);

  return limited;
};

// Returns an array of label objects { name, confidence } after filtering,
// sorting, deduping (by name keeping highest confidence), and limiting.
exports.filterLabelsWithConfidence = (labels, options = {}) => {
  const {
    minConfidence = 90,
    maxLabels = 10,
  } = options;

  if (!isValidLabels(labels)) return [];

  // filter by confidence
  let processed = labels.filter((l) => (l.confidence || l.Confidence || 0) >= minConfidence);

  // normalize objects to { name, confidence }
  processed = processed.map((l) => ({ name: l.name || l.Name, confidence: Number(l.confidence ?? l.Confidence ?? 0) }));

  // sort by confidence desc then name length
  processed.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.name.length - a.name.length;
  });

  // dedupe by lowercased name, keep first (highest confidence)
  const seen = new Set();
  const deduped = [];
  for (const p of processed) {
    const key = String(p.name).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(p);
    }
  }

  return deduped.slice(0, maxLabels);
};