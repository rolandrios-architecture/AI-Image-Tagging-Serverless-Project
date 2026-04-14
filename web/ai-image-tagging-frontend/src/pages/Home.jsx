import UploadCard from "../components/UploadCard";
import Loader from "../components/Loader";
import ResultPanel from "../components/ResultPanel";

function Home({ status, setStatus, image, setImage, result, setResult }) {
  return (
    <div className="container">
      {status === "IDLE" && (
        <UploadCard
          setImage={setImage}
          setStatus={setStatus}
          setResult={setResult}
        />
      )}

      {status === "UPLOADING" && <Loader text="Uploading image..." />}

      {status === "PROCESSING" && <Loader text="Analyzing content..." />}

      {status === "DONE" && result && (
        <ResultPanel
          image={image}
          result={result}
          onRefresh={() => {
            setResult(null);
            setImage(null);
            setStatus("IDLE");
          }}
          loading={status === "UPLOADING" || status === "PROCESSING"} />
      )}
    </div>
  );
}

export default Home;