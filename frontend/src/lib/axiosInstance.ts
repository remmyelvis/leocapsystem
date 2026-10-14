import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    withCredentials: true,  // always send cookies cross-origin
});

// Intercept error responses where responseType is "blob" so we can
// read the JSON error body before Axios throws, making it accessible
// in catch blocks via err.response.data
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const response = error.response;
    if (response && response.data instanceof Blob) {
      try {
        const text = await response.data.text();
        const json = JSON.parse(text);
        // Replace the blob with the parsed JSON object
        error.response.data = json;
      } catch {
        // Not valid JSON — leave original blob data
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
