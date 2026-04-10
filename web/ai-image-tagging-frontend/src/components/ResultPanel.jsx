function ResultPanel({ image, result, onRefresh, loading }) {
  // If a `result` object is provided, prefer rendering it.
  if (result) {
    // Log result info for debugging (description, confidence if present)
    try {
      console.log('ResultPanel - result:', result);
      console.log('Description:', result.description);
      if (result.confidence !== undefined) console.log('Confidence:', result.confidence);
    } catch (e) {
      // ignore logging errors
    }

    return (
      <div>
        <div className="result-container">
          {/* Image preview column (if available) */}
          {image && (
            <div className="card card-dark">
              {(() => {
                try {
                  const src = URL.createObjectURL(image);
                  return <img src={src} alt="preview" />;
                } catch (e) {
                  return <p>No preview available</p>;
                }
              })()}
            </div>
          )}

          <div className="card card-dark">
            <h3>Description</h3>
            <p>{result.description}</p>

            <h3>Tags</h3>
            <div className="tags">
              {Array.isArray(result.tags) && result.tags.map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Action button below image + description */}
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <button
            className="btn-3d"
            onClick={() => onRefresh && onRefresh()}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Result'}
          </button>
        </div>
      </div>
    );
  }

  // Otherwise, if an image File/Blob is provided, render a preview.
  if (image) {
    let src = null;
    try {
      src = URL.createObjectURL(image);
    } catch (e) {
      src = null;
    }

    return (
      <div className="result-container">
        <div className="card card-dark">
          {src ? <img src={src} alt="preview" /> : <p>No preview available</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="card card-dark">
      <p>No result available.</p>
    </div>
  );
}

export default ResultPanel;