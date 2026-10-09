import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

function collectPrintRules() {
  const rules: string[] = []

  for (const stylesheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(stylesheet.cssRules)) {
        if (rule.type !== CSSRule.MEDIA_RULE) continue

        const mediaRule = rule as CSSMediaRule
        if (
          !mediaRule.media.mediaText
            .split(",")
            .some((media) => media.trim() === "print")
        ) {
          continue
        }

        for (const printRule of Array.from(mediaRule.cssRules)) {
          if (printRule.type === CSSRule.STYLE_RULE) {
            rules.push(printRule.cssText)
          }
        }
      }
    } catch (error) {
      console.error(
        "Could not read a stylesheet while preparing the PDF.",
        error,
      )
    }
  }

  if (rules.length === 0) {
    throw new Error("The invitation print styles could not be loaded.")
  }

  return rules.join("\n")
}

export async function downloadInvitationPdf(filename: string) {
  const printLayout = document.querySelector<HTMLElement>(".print-layout")
  const pages = printLayout
    ? Array.from(printLayout.querySelectorAll<HTMLElement>(".print-page"))
    : []

  if (!printLayout || pages.length === 0) {
    throw new Error("The invitation document is not ready to export.")
  }

  const printStyles = document.createElement("style")
  printStyles.dataset.pdfPrintStyles = "true"
  printStyles.textContent = collectPrintRules()
  document.head.append(printStyles)

  const originalLayoutStyle = printLayout.getAttribute("style")

  try {
    printLayout.style.display = "block"
    await document.fonts.ready

    for (const image of Array.from(printLayout.querySelectorAll("img"))) {
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          image.addEventListener("load", () => resolve(), { once: true })
          image.addEventListener(
            "error",
            () => reject(new Error("An invitation logo could not be loaded.")),
            { once: true },
          )
        })
      }
      if (image.naturalWidth === 0) {
        throw new Error("An invitation logo could not be loaded.")
      }
    }

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    })

    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: "#e9e0d3",
        useCORS: true,
        windowWidth: 1200,
        windowHeight: 850,
        logging: false,
      })

      if (index > 0) pdf.addPage("a4", "landscape")
      pdf.addImage(canvas, "PNG", 0, 0, 297, 210, undefined, "FAST")
    }

    const pdfBlob = pdf.output("blob")
    const pdfUrl = URL.createObjectURL(pdfBlob)
    const downloadLink = document.createElement("a")
    downloadLink.href = pdfUrl
    downloadLink.download = filename
    downloadLink.hidden = true
    document.body.append(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000)
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
  } finally {
    if (originalLayoutStyle === null) {
      printLayout.removeAttribute("style")
    } else {
      printLayout.setAttribute("style", originalLayoutStyle)
    }
    printStyles.remove()
  }
}
