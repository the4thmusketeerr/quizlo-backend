import imagekit from "../lib/imagekit.js";

/**
 * Generates authentication parameters for ImageKit client-side upload.
 * This includes a signature, token, and timestamp.
 */
async function getImageKitAuth(req, res) {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    
    return res.status(200).json({
      success: true,
      data: authenticationParameters,
    });
  } catch (error) {
    console.error("Error generating ImageKit auth:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate authentication parameters",
    });
  }
}

export { getImageKitAuth };
