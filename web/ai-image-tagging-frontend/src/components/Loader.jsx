function Loader({ text }) {
  return (
    <div className="card">
      <div className="spinner"></div>
      <p>{text}</p>
    </div>
  );
}

export default Loader;