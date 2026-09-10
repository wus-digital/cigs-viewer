/**
 * Client for the CIGS render service's `POST /generate` endpoint.
 *
 * This is the **only** way the viewer obtains image URLs: the backend
 * composes (or looks up already-composed) images for the requested
 * configuration and camera set and returns their URLs directly - the
 * viewer never builds or guesses an image path itself.
 */
export interface GenerateImagesResult {
  readonly [cameraToken: string]: string;
}

/**
 * POSTs `{ configuration, cameras }` to `${baseUrl}/generate` and resolves
 * with the `{ [cameraToken]: url }` map the service returns (one URL per
 * requested camera). Rejects on network failures or non-2xx responses.
 */
export async function requestGeneratedImages(
  baseUrl: string,
  configuration: Readonly<Record<string, string>>,
  cameras: readonly (string | number)[]
): Promise<GenerateImagesResult> {
  const response = await fetch(`${baseUrl}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ configuration, cameras }),
  });
  if (!response.ok) {
    throw new Error(
      `POST ${baseUrl}/generate failed with status ${response.status}`
    );
  }
  return (await response.json()) as GenerateImagesResult;
}

