import { getUploadUrl, uploadToS3, getImageResult } from "../services/api";

function UploadCard({ setImage, setStatus, setResult }) {
  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);

    // 1. Uploading
    setStatus("UPLOADING");

    try {
      const response = await getUploadUrl(file);
      const uploadUrl = response.data.uploadUrl;
      const key = response.data.key;

      console.debug('UploadCard: received uploadUrl and key', { uploadUrl, key, raw: response.raw });

      await uploadToS3(uploadUrl, file);

      let done = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!done && attempts < maxAttempts) {
        attempts += 1;
        console.log(`Checking result... attempt ${attempts}/${maxAttempts}`);
        console.debug('Polling for key', key);

        const result = await getImageResult(key);

        console.log("GET RESPONSE:", result);

        if (result.status === "done") {
          setResult(result);
          setStatus("DONE");
          done = true;
          break;
        }

        if (attempts >= maxAttempts) {
          console.warn("Max polling attempts reached, giving up.");
          setStatus("ERROR");
          break;
        }

        // esperar 2s antes de volver a intentar
        await new Promise((res) => setTimeout(res, 2000));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setStatus("ERROR");
    }
  };

  return (
    <div className="upload-wrapper">
      <div className="card upload-card">
        <h2>Upload Image</h2>
        <input type="file" onChange={handleChange} />
      </div>
    </div>
  );
}

export default UploadCard;