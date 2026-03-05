import htmlPdf from 'html-pdf-node'

// Reemplaza {{variable}} y {{#if var}}...{{/if}} en el template HTML
export function procesarTemplate(
  html:      string,
  variables: Record<string, string>
): string {
  // Reemplazar {{variable}}
  let result = html.replace(/\{\{(\w+)\}\}/g,
    (_, key) => variables[key] ?? '')

  // Reemplazar {{#if var}}...{{else}}...{{/if}}
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, trueBlock, falseBlock) =>
      variables[key] ? trueBlock : falseBlock
  )

  // Reemplazar {{#if var}}...{{/if}} (sin else)
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, block) => variables[key] ? block : ''
  )

  return result
}

export async function generarPDF(html: string): Promise<Buffer> {
  const buffer = await htmlPdf.generatePdf(
    { content: html },
    {
      format:          'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    }
  ) as unknown as Buffer
  return buffer
}
