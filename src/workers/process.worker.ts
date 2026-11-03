import { dataOperation } from '../tools/operations'
import { transformImage } from '../tools/image'
import { errorCode } from '../core/errors'
import type { Values } from '../core/tool'

self.onmessage = async ({
  data,
}: MessageEvent<{ id: string; inputs: Values; config: Values }>) => {
  try {
    const { id, inputs, config } = data
    const values = id.startsWith('image.')
      ? { image: await transformImage(inputs.image as Blob, config) }
      : id.startsWith('pdf.') || id.startsWith('zip.')
        ? await (
            await import('../tools/documents')
          ).documentOperation(id, inputs, config)
        : await dataOperation(id, inputs, config)
    self.postMessage({ values })
  } catch (error) {
    self.postMessage({ error: errorCode(error) })
  }
}
