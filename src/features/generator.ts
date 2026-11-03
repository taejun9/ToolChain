import { ToolError } from '../core/tool'
import { makeTemplate } from './templates'

export interface WorkflowParser {
  parse(
    prompt: string,
    translate: (key: string) => string,
  ): ReturnType<typeof makeTemplate>
}

export const rulesParser: WorkflowParser = {
  parse(prompt, t) {
    const input = prompt
      .trim()
      .toLowerCase()
      .replace(/[.!?。]$/u, '')
    let id: string
    const image =
      /^(?:resize (?:an? |the )?image to (\d+)\s*px and convert (?:it )?to (webp|png|jpeg)|이미지를 (\d+)\s*px로 줄이고 (webp|png|jpeg)로 변환(?:해줘|해 줘)?)$/u.exec(
        input,
      )
    if (image) id = 'optimizer'
    else if (/^(?:format json|json (?:정리|포맷)(?:해줘)?)$/u.test(input))
      id = 'formatter'
    else if (
      /^(?:convert csv to json|csv를 json으로 변환(?:해줘)?)$/u.test(input)
    )
      id = 'csv'
    else throw new ToolError('unsupported-prompt')
    const workflow = makeTemplate(
      id,
      t('template.' + id),
      t('templateDesc.' + id),
    )!
    if (image) {
      const width = Number(image[1] ?? image[3])
      if (width < 1 || width > 8192) throw new ToolError('invalid-config')
      workflow.nodes[1].config.width = width
      workflow.nodes[2].config.format = 'image/' + (image[2] ?? image[4])
    }
    return workflow
  },
}
