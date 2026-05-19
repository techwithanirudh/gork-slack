import { processSlackFiles, type SlackFile } from '~/utils/images';

export async function sourceImagesFromFiles(files?: SlackFile[]) {
  const inputImages = await processSlackFiles(files);
  return inputImages
    .map((item) => item.image)
    .filter(
      (image): image is string | Uint8Array | ArrayBuffer | Buffer =>
        typeof image === 'string' ||
        image instanceof Uint8Array ||
        image instanceof ArrayBuffer ||
        image instanceof Buffer
    );
}
