exports.mapLabelsToDomain = (labels) => {
  return labels.map((label) => ({
    name: label.Name,
    confidence: label.Confidence,
  }));
};